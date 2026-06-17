import logging
import re
from typing import List, Tuple

from app.data.prompts import (
    BOOK_DETAIL_PROMPT,
    BOOK_SEARCH_PROMPT,
    BORROW_STATUS_PROMPT,
    GENERAL_CHAT_PROMPT,
    HOLD_STATUS_PROMPT,
)
from app.services.api_query_service import APIQueryService
from app.services.intent_classifier import IntentClassifier
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService

logger = logging.getLogger("rag-service.orchestrator")

CONTEXT_REFERENCE_TERMS = (
    "sách này",
    "cuốn này",
    "quyển này",
    "truyện này",
    "tác phẩm này",
    "nó",
)

BOOK_DETAIL_TERMS = (
    "tác giả",
    "ai viết",
    "của ai",
    "nói về",
    "chủ đề gì",
    "thể loại",
    "mô tả",
    "nội dung",
    "isbn",
    "nhà xuất bản",
    "năm xuất bản",
)

AUTHOR_TERMS = (
    "tác giả",
    "ai viết",
    "của ai",
)


def _mentions_previous_book(question: str) -> bool:
    normalized = question.lower()
    return any(
        re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized)
        for term in CONTEXT_REFERENCE_TERMS
    )


def _is_book_detail_question(question: str) -> bool:
    normalized = question.lower()
    return any(term in normalized for term in BOOK_DETAIL_TERMS)


def _is_author_question(question: str) -> bool:
    normalized = question.lower()
    return any(term in normalized for term in AUTHOR_TERMS)


def _clean_title_candidate(candidate: str) -> str:
    title = re.sub(r"^[\s\-:*_`\"']+|[\s\-:*_`\"'.]+$", "", candidate.strip())
    return re.sub(r"\s+", " ", title)


def _is_plausible_book_title(candidate: str) -> bool:
    normalized = candidate.strip().lower()
    if len(normalized) < 3:
        return False
    if re.fullmatch(r"[\d\s:/\-.]+", normalized):
        return False
    if re.search(r"\d{1,2}/\d{1,2}/\d{4}", normalized):
        return False
    rejected_prefixes = (
        "sách",
        "trạng thái",
        "hạn",
        "hạn nhận",
        "hạn đến nhận",
        "ngày",
        "trước",
        "yêu cầu",
    )
    return not normalized.startswith(rejected_prefixes)


def _extract_explicit_book_title(message: str) -> str | None:
    for line in reversed(message.splitlines()):
        plain_line = re.sub(r"[*_`]+", "", line)
        plain_line = re.sub(r"^\s*(?:User|Bot|Sinh viên|Trợ lý)\s*:\s*", "", plain_line, flags=re.IGNORECASE)
        match = re.match(
            r"^\s*[-•]?\s*(?:S[áa]ch|T[êe]n s[áa]ch)\s*:\s*(.+?)\s*$",
            plain_line,
            re.IGNORECASE,
        )
        if not match:
            continue
        title = _clean_title_candidate(match.group(1))
        if _is_plausible_book_title(title):
            return title
    return None


def extract_latest_book_title(chat_history: List[str] | None) -> str | None:
    if not chat_history:
        return None

    for message in reversed(chat_history):
        title = _extract_explicit_book_title(message)
        if title:
            return title

    quoted_pattern = re.compile(r'"([^"\n]{3,180})"')
    markdown_pattern = re.compile(r"\*{1,2}([^*\n]{3,180})\*{1,2}")

    for message in reversed(chat_history):
        matches = quoted_pattern.findall(message)
        for match in reversed(matches):
            title = _clean_title_candidate(match)
            if _is_plausible_book_title(title):
                return title

        matches = markdown_pattern.findall(message)
        for match in reversed(matches):
            title = _clean_title_candidate(match)
            if _is_plausible_book_title(title):
                return title

    return None


def build_contextual_question(question: str, chat_history: List[str] | None) -> str:
    if not _mentions_previous_book(question):
        return question

    latest_title = extract_latest_book_title(chat_history)
    if not latest_title:
        return question

    return f'Đang hỏi về sách "{latest_title}". {question}'


def build_direct_author_answer(question: str, source_books: List[dict], title: str) -> str | None:
    if not _is_author_question(question) or not source_books:
        return None

    book = source_books[0]
    author = book.get("author")
    if not author:
        return None

    return f'Tác giả của **{book.get("title") or title}** là {author}.'


class ChatOrchestrator:
    def __init__(self, classifier: IntentClassifier, rag_service: RAGService):
        self.classifier = classifier
        self.rag_service = rag_service
        self.api_query_service = APIQueryService()
        self.llm_service = LLMService()
        self.confidence_threshold = 0.5

    async def route_and_process(
        self,
        question: str,
        jwt_token: str,
        chat_history: List[str] | None = None,
    ) -> Tuple[str, str, float, List[dict]]:
        chat_history = chat_history or []
        contextual_title = (
            extract_latest_book_title(chat_history)
            if _mentions_previous_book(question) and _is_book_detail_question(question)
            else None
        )
        contextual_question = build_contextual_question(question, chat_history)
        if contextual_question != question:
            logger.info(
                "Contextualized chat question. original='%s', contextual='%s'",
                question,
                contextual_question,
            )
        prompt_question = (
            f'Câu hỏi gốc: "{question}"\n'
            f"Câu hỏi đã bổ sung ngữ cảnh: {contextual_question}"
            if contextual_question != question
            else question
        )

        logger.info("Routing question: '%s'", contextual_question)

        intent, confidence = "GENERAL_CHAT", 1.0
        if self.classifier and self.classifier.is_trained:
            try:
                intent, confidence = self.classifier.predict(contextual_question)
            except Exception as exc:
                logger.error(
                    "Intent classifier failed: %s. Falling back to GENERAL_CHAT.",
                    str(exc),
                )
                intent, confidence = "GENERAL_CHAT", 0.0
        else:
            logger.warning("Intent classifier is not trained. Falling back to GENERAL_CHAT.")
            intent, confidence = "GENERAL_CHAT", 0.0

        if confidence < self.confidence_threshold:
            logger.info(
                "Classifier confidence %.2f is below threshold %.2f. Falling back to GENERAL_CHAT.",
                confidence,
                self.confidence_threshold,
            )
            intent = "GENERAL_CHAT"

        if contextual_title:
            logger.info("Forcing BOOK_SEARCH for contextual book detail follow-up.")
            intent = "BOOK_SEARCH"
            confidence = max(confidence, self.confidence_threshold)

        source_books = []
        answer = ""

        try:
            if intent == "BOOK_SEARCH":
                logger.info("Running BOOK_SEARCH pipeline.")
                if contextual_title:
                    logger.info("Running BOOK_DETAIL flow for title: '%s'.", contextual_title)
                    context, source_books = self.rag_service.get_book_by_title(contextual_title)
                    direct_answer = build_direct_author_answer(question, source_books, contextual_title)
                    if direct_answer:
                        answer = direct_answer
                    else:
                        prompt = BOOK_DETAIL_PROMPT.format(context=context, question=prompt_question)
                        answer = self.llm_service.generate_response(prompt, chat_history)
                else:
                    context, source_books = self.rag_service.search_books(contextual_question, n_results=5)
                    prompt = BOOK_SEARCH_PROMPT.format(context=context, question=prompt_question)
                    answer = self.llm_service.generate_response(prompt, chat_history)

            elif intent == "BORROW_STATUS":
                logger.info("Running BORROW_STATUS pipeline.")
                borrows = await self.api_query_service.get_user_borrows(jwt_token)
                context = self.api_query_service.build_borrow_context(borrows)
                prompt = BORROW_STATUS_PROMPT.format(context=context, question=prompt_question)
                answer = self.llm_service.generate_response(prompt, chat_history)

            elif intent == "HOLD_STATUS":
                logger.info("Running HOLD_STATUS pipeline.")
                holds = await self.api_query_service.get_user_holds(jwt_token)
                context = self.api_query_service.build_hold_context(holds)
                prompt = HOLD_STATUS_PROMPT.format(context=context, question=prompt_question)
                answer = self.llm_service.generate_response(prompt, chat_history)

            else:
                logger.info("Running GENERAL_CHAT pipeline.")
                prompt = GENERAL_CHAT_PROMPT.format(question=prompt_question)
                answer = self.llm_service.generate_response(prompt, chat_history)

        except Exception as exc:
            logger.error("Pipeline %s failed: %s", intent, str(exc))
            answer = (
                "Xin lỗi bạn, trợ lý thư viện đang gặp trục trặc kỹ thuật nhỏ "
                "khi xử lý yêu cầu này. Vui lòng thử lại sau."
            )

        return answer, intent, confidence, source_books
