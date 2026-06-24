import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.request import ChatRequest
from app.services.chat_orchestrator import (
    ChatOrchestrator,
    answer_says_no_book_matches,
    build_contextual_question,
    extract_latest_book_title,
)


def test_chat_request_accepts_camel_case_history():
    request = ChatRequest.model_validate(
        {
            "question": "sách này về chủ đề gì?",
            "chatHistory": ["Bot: - Sách: *Clean Code*"],
        }
    )

    assert request.chat_history == ["Bot: - Sách: *Clean Code*"]


def test_contextual_question_uses_latest_explicit_book_title():
    history = [
        "User: tôi có đang đặt trước sách nào không?",
        (
            "Bot: Bạn có 1 yêu cầu đặt trước.\n"
            "- Sách: *LEGO Legends of Chima: Origins: A Starter Handbook*\n"
            "- Trạng thái: Đang được giữ tại quầy."
        ),
    ]

    assert (
        extract_latest_book_title(history)
        == "LEGO Legends of Chima: Origins: A Starter Handbook"
    )
    assert build_contextual_question("sách này về chủ đề gì?", history) == (
        'Đang hỏi về sách "LEGO Legends of Chima: Origins: A Starter Handbook". '
        "sách này về chủ đề gì?"
    )


def test_title_extraction_prefers_book_label_over_later_markdown_date():
    history = [
        (
            "Bot: Chào bạn, hiện tại bạn có **1 yêu cầu sách đang được giữ tại quầy**:\n\n"
            "- **Sách:** *LEGO Legends of Chima: Origins: A Starter Handbook*\n"
            "- **Trạng thái:** Đang được giữ (ACTIVE)\n"
            "- **Hạn đến nhận:** Trước **17/06/2026 03:38**"
        )
    ]

    assert (
        extract_latest_book_title(history)
        == "LEGO Legends of Chima: Origins: A Starter Handbook"
    )


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
        self.title_lookups = []

    def search_books(self, question, n_results=5):
        self.questions.append(question)
        return "Tên sách: LEGO Legends of Chima\nMô tả: Adventure story.", []

    def get_book_by_title(self, title):
        self.title_lookups.append(title)
        return (
            "Tên sách: LEGO Legends of Chima: Origins: A Starter Handbook\n"
            "Tác giả: Tracey West\n"
            "Mô tả: Adventure story."
        ), [
            {
                "book_id": 1,
                "title": title,
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

    def get_book_by_title(self, title):
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

    def get_book_by_title(self, title):
        return "", []


class FakeLlmService:
    def __init__(self):
        self.prompts = []

    async def generate_response(self, prompt, chat_history=None):
        self.prompts.append(prompt)
        return "Đây là sách phiêu lưu dành cho thiếu nhi."


class FakeNoBookLlmService:
    def __init__(self):
        self.prompts = []

    async def generate_response(self, prompt, chat_history=None):
        self.prompts.append(prompt)
        return "Hiện chưa tìm thấy cuốn sách nào phù hợp với yêu cầu này."


def test_orchestrator_routes_contextual_detail_question_to_exact_title_lookup():
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
    assert "LEGO Legends of Chima: Origins: A Starter Handbook" in classifier.questions[0]
    assert rag_service.questions == []
    assert rag_service.title_lookups == ["LEGO Legends of Chima: Origins: A Starter Handbook"]
    assert 'Câu hỏi gốc: "sách này về chủ đề gì?"' in llm_service.prompts[0]


def test_orchestrator_answers_contextual_author_question_without_llm():
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
            question="sách này tác giả là ai",
            jwt_token="token",
            chat_history=history,
        )
    )

    assert answer == "Tác giả của **LEGO Legends of Chima: Origins: A Starter Handbook** là Tracey West."
    assert intent == "BOOK_SEARCH"
    assert confidence == 0.95
    assert source_books[0]["author"] == "Tracey West"
    assert rag_service.title_lookups == ["LEGO Legends of Chima: Origins: A Starter Handbook"]
    assert llm_service.prompts == []


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
    assert llm_service.prompts == []
    assert "chưa tìm thấy" in answer


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
    assert "chưa tìm thấy" in answer
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


def test_contextual_question_does_not_treat_noi_as_no_reference():
    history = ['Bot: - Sach: *truyen thieu nhi*']

    assert (
        build_contextual_question("sach ve lego noi chung thi sao, thu vien co khong?", history)
        == "sach ve lego noi chung thi sao, thu vien co khong?"
    )
