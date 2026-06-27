import logging
import re
from typing import List, Tuple

from app.data.prompts import (
    BOOK_DETAIL_PROMPT,
    BOOK_SEARCH_PROMPT,
    BORROW_STATUS_PROMPT,
    GENERAL_CHAT_PROMPT,
    HOLD_STATUS_PROMPT,
    QUERY_REWRITE_PROMPT,
)
from app.services.api_query_service import APIQueryService
from app.services.intent_classifier import IntentClassifier
from app.services.llm_service import LLMService
from app.services.query_normalizer import normalize_search_text
from app.services.rag_service import RAGService

logger = logging.getLogger("rag-service.orchestrator")

NO_BOOK_MATCH_PATTERNS = (
    "chua tim thay",
    "khong tim thay",
    "khong co dau sach",
    "chua co dau sach",
    "khong co sach phu hop",
    "chua co sach phu hop",
    "khong co cuon sach nao",
    "chua co cuon sach nao",
)

MOJIBAKE_NO_BOOK_MATCH_PATTERNS = (
    "ch a t m th",
    "ch a ta m thao y",
    "ch a c cu n s ch n o",
    "ch a ca3 cua n sa ch na o",
    "ch a c s ch",
    "kh ng t m th",
    "kh ng c cu n s ch n o",
    "kh ng c s ch",
)

# Legacy heuristics removed. History is now processed using LLM Query Rewrite.


def build_no_book_matches_answer() -> str:
    return (
        "Tôi chưa tìm thấy đầu sách phù hợp trong thư viện cho mô tả này. "
        "Bạn có thể thử hỏi lại bằng tên sách, tên tác giả, hoặc một vài từ khóa ngắn hơn "
        "như thể loại, nhân vật chính hay chủ đề nổi bật."
    )


def answer_says_no_book_matches(answer: str) -> bool:
    normalized = normalize_search_text(answer)
    if any(pattern in normalized for pattern in NO_BOOK_MATCH_PATTERNS):
        return True

    # Some historical prompts/tests contain mojibake Vietnamese text. After
    # normalization those phrases lose vowels, so keep a narrow compatibility
    # guard for common "no matching book" answers.
    return any(pattern in normalized for pattern in MOJIBAKE_NO_BOOK_MATCH_PATTERNS)


class ChatOrchestrator:
    def __init__(self, classifier: IntentClassifier, rag_service: RAGService):
        self.classifier = classifier
        self.rag_service = rag_service
        self.api_query_service = APIQueryService()
        self.llm_service = LLMService()
        self.confidence_threshold = 0.5

    async def build_contextual_question(self, question: str, chat_history: List[str]) -> str:
        if not chat_history:
            return question

        history_str = "\n".join(chat_history[-4:])
        prompt = QUERY_REWRITE_PROMPT.format(chat_history=history_str, question=question)

        try:
            rewritten = await self.llm_service.generate_response(prompt)
            rewritten_clean = rewritten.strip()
            if rewritten_clean != question:
                logger.info(
                    "Contextualized chat question. original='%s', contextual='%s'",
                    question,
                    rewritten_clean,
                )
            return rewritten_clean
        except Exception as exc:
            logger.error("Failed to rewrite query via LLM: %s. Using original question.", str(exc))
            return question

    async def route_and_process(
        self,
        question: str,
        jwt_token: str,
        chat_history: List[str] | None = None,
    ) -> Tuple[str, str, float, List[dict]]:
        chat_history = chat_history or []
        contextual_question = await self.build_contextual_question(question, chat_history)

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

        source_books = []
        answer = ""

        try:
            if intent == "BOOK_SEARCH":
                logger.info("Running BOOK_SEARCH pipeline.")
                context, source_books = self.rag_service.search_books(contextual_question, n_results=5)
                if not source_books:
                    logger.info("BOOK_SEARCH returned no source books. Skipping LLM to avoid unsupported suggestions.")
                    answer = build_no_book_matches_answer()
                else:
                    prompt = BOOK_SEARCH_PROMPT.format(context=context, question=prompt_question)
                    answer = await self.llm_service.generate_response(prompt, chat_history)
                    if answer_says_no_book_matches(answer):
                        logger.info(
                            "BOOK_SEARCH answer says no match despite source books. "
                            "Dropping source_books to keep response consistent."
                        )
                        source_books = []

            elif intent == "BORROW_STATUS":
                logger.info("Running BORROW_STATUS pipeline.")
                borrows = await self.api_query_service.get_user_borrows(jwt_token)
                context = self.api_query_service.build_borrow_context(borrows)
                prompt = BORROW_STATUS_PROMPT.format(context=context, question=prompt_question)
                answer = await self.llm_service.generate_response(prompt, chat_history)

            elif intent == "HOLD_STATUS":
                logger.info("Running HOLD_STATUS pipeline.")
                holds = await self.api_query_service.get_user_holds(jwt_token)
                context = self.api_query_service.build_hold_context(holds)
                prompt = HOLD_STATUS_PROMPT.format(context=context, question=prompt_question)
                answer = await self.llm_service.generate_response(prompt, chat_history)

            else:
                logger.info("Running GENERAL_CHAT pipeline.")
                prompt = GENERAL_CHAT_PROMPT.format(question=prompt_question)
                answer = await self.llm_service.generate_response(prompt, chat_history)

        except Exception as exc:
            logger.error("Pipeline %s failed: %s", intent, str(exc))
            answer = (
                "Xin lỗi bạn, trợ lý thư viện đang gặp trục trặc kỹ thuật nhỏ "
                "khi xử lý yêu cầu này. Vui lòng thử lại sau."
            )

        return answer, intent, confidence, source_books
