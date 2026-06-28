import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.request import ChatRequest
from app.services.chat_orchestrator import (
    ChatOrchestrator,
    answer_says_no_book_matches,
)


def test_chat_request_accepts_camel_case_history():
    request = ChatRequest.model_validate(
        {
            "question": "sách này về chủ đề gì?",
            "chatHistory": ["Bot: - Sách: *Clean Code*"],
        }
    )

    assert request.chat_history == ["Bot: - Sách: *Clean Code*"]


class FakeClassifier:
    is_trained = True

    def __init__(self):
        self.questions = []

    def predict(self, question):
        self.questions.append(question)
        return "BOOK_SEARCH", 0.95


class FakeRagService:
    def __init__(self):
        self.questions = []

    def search_books(self, question, n_results=5):
        self.questions.append(question)
        return "Tên sách: LEGO Legends of Chima\nMô tả: Adventure story.", [
            {
                "book_id": 1,
                "title": "LEGO Legends of Chima: Origins: A Starter Handbook",
                "author": "Tracey West",
                "relevance_score": 1.0,
            }
        ]


class FakeEmptyRagService:
    def __init__(self):
        self.questions = []

    def search_books(self, question, n_results=5):
        self.questions.append(question)
        return "", []


class FakeRagWithSearchSources:
    def search_books(self, question, n_results=5):
        return (
            "Ten sach: Bong Hong Vang Va Binh Minh Mua\nTac gia: Konstantin Paustovsky",
            [
                {
                    "book_id": 101,
                    "title": "Bong Hong Vang Va Binh Minh Mua",
                    "author": "Konstantin Paustovsky",
                    "relevance_score": 0.72,
                }
            ],
        )


class FakeLlmService:
    def __init__(self):
        self.prompts = []

    async def generate_response(self, prompt, chat_history=None):
        self.prompts.append(prompt)
        if (
            "Lịch sử cuộc trò chuyện" in prompt
            or "Câu hỏi độc lập viết lại:" in prompt
            or "QUERY_REWRITE_PROMPT" in prompt
        ):
            if "sách này về chủ đề gì?" in prompt:
                return (
                    'Đang hỏi về sách "LEGO Legends of Chima: Origins: A Starter Handbook". '
                    "sách này về chủ đề gì?"
                )
            return "Câu hỏi đã được viết lại"
        return "Đây là sách phiêu lưu dành cho thiếu nhi."


class FakeNoBookLlmService:
    def __init__(self):
        self.prompts = []

    async def generate_response(self, prompt, chat_history=None):
        self.prompts.append(prompt)
        if "Lịch sử cuộc trò chuyện" in prompt or "QUERY_REWRITE_PROMPT" in prompt:
            return prompt
        return "Hiện chưa tìm thấy cuốn sách nào phù hợp với yêu cầu này."


def test_build_contextual_question_calls_llm():
    classifier = FakeClassifier()
    rag_service = FakeRagService()
    llm_service = FakeLlmService()
    orchestrator = ChatOrchestrator(classifier, rag_service)
    orchestrator.llm_service = llm_service

    history = ["Bot: - Sách: *LEGO Legends of Chima: Origins: A Starter Handbook*"]

    rewritten = asyncio.run(
        orchestrator.build_contextual_question("sách này về chủ đề gì?", history)
    )

    assert "LEGO Legends of Chima: Origins: A Starter Handbook" in rewritten
    assert len(llm_service.prompts) == 1
    assert "sách này về chủ đề gì?" in llm_service.prompts[0]


def test_orchestrator_routes_contextual_detail_question_with_llm_rewrite():
    classifier = FakeClassifier()
    rag_service = FakeRagService()
    llm_service = FakeLlmService()
    orchestrator = ChatOrchestrator(classifier, rag_service)
    orchestrator.llm_service = llm_service
    history = [
        "Bot: - Sách: *LEGO Legends of Chima: Origins: A Starter Handbook*"
    ]

    answer, intent, confidence, source_books = asyncio.run(
        orchestrator.route_and_process(
            question="sách này về chủ đề gì?",
            jwt_token="token",
            chat_history=history,
        )
    )

    assert answer == "Đây là sách phiêu lưu dành cho thiếu nhi."
    assert intent == "BOOK_SEARCH"
    assert confidence == 0.95
    assert source_books[0]["title"] == "LEGO Legends of Chima: Origins: A Starter Handbook"

    # Classifier và RAG đều nhận câu hỏi đã được viết lại theo ngữ cảnh.
    assert "LEGO Legends of Chima: Origins: A Starter Handbook" in classifier.questions[0]
    assert "LEGO Legends of Chima: Origins: A Starter Handbook" in rag_service.questions[0]

    # Prompt trả lời chính vẫn giữ câu hỏi gốc và context sách.
    assert "LEGO Legends of Chima: Origins: A Starter Handbook" in llm_service.prompts[1]
    assert "sách này về chủ đề gì?" in llm_service.prompts[1]


def test_orchestrator_does_not_ask_llm_to_suggest_books_without_sources():
    classifier = FakeClassifier()
    rag_service = FakeEmptyRagService()
    llm_service = FakeLlmService()
    orchestrator = ChatOrchestrator(classifier, rag_service)
    orchestrator.llm_service = llm_service

    answer, intent, confidence, source_books = asyncio.run(
        orchestrator.route_and_process(
            question="co sach nao noi ve cau be bi bo roi roi phieu luu gap lai gia dinh khong",
            jwt_token="token",
            chat_history=[],
        )
    )

    assert intent == "BOOK_SEARCH"
    assert confidence == 0.95
    assert source_books == []
    assert len(llm_service.prompts) == 0
    assert answer_says_no_book_matches(answer)


def test_orchestrator_drops_sources_when_llm_says_no_book_matches():
    classifier = FakeClassifier()
    rag_service = FakeRagWithSearchSources()
    llm_service = FakeNoBookLlmService()
    orchestrator = ChatOrchestrator(classifier, rag_service)
    orchestrator.llm_service = llm_service

    answer, intent, confidence, source_books = asyncio.run(
        orchestrator.route_and_process(
            question="tim sach ve bong ban",
            jwt_token="token",
            chat_history=[],
        )
    )

    assert intent == "BOOK_SEARCH"
    assert confidence == 0.95
    assert answer_says_no_book_matches(answer)
    assert source_books == []
    assert len(llm_service.prompts) == 1


def test_orchestrator_keeps_sources_when_llm_uses_search_results():
    classifier = FakeClassifier()
    rag_service = FakeRagWithSearchSources()
    llm_service = FakeLlmService()
    orchestrator = ChatOrchestrator(classifier, rag_service)
    orchestrator.llm_service = llm_service

    _, intent, _, source_books = asyncio.run(
        orchestrator.route_and_process(
            question="tim sach ve bong ban",
            jwt_token="token",
            chat_history=[],
        )
    )

    assert intent == "BOOK_SEARCH"
    assert source_books[0]["book_id"] == 101


def test_no_book_match_guard_detects_chua_co_cuon_sach_nao():
    assert answer_says_no_book_matches(
        'Hiện tại thư viện chưa có cuốn sách nào có nội dung đúng như "Đồ chơi kỳ diệu".'
    )
