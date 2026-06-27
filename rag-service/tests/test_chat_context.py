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
            "question": "sÃ¡ch nÃ y vá» chá»§ Ä‘á» gÃ¬?",
            "chatHistory": ["Bot: - SÃ¡ch: *Clean Code*"],
        }
    )

    assert request.chat_history == ["Bot: - SÃ¡ch: *Clean Code*"]


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
        return "TÃªn sÃ¡ch: LEGO Legends of Chima\nMÃ´ táº£: Adventure story.", [
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
        # Náº¿u lÃ  prompt viáº¿t láº¡i cÃ¢u há»i (QUERY_REWRITE_PROMPT)
        if "Lá»‹ch sá»­ cuá»™c trÃ² chuyá»‡n" in prompt or "CÃ¢u há»i Ä‘á»™c láº­p viáº¿t láº¡i:" in prompt or "QUERY_REWRITE_PROMPT" in prompt:
            if "sÃ¡ch nÃ y vá» chá»§ Ä‘á» gÃ¬?" in prompt:
                return 'Äang há»i vá» sÃ¡ch "LEGO Legends of Chima: Origins: A Starter Handbook". sÃ¡ch nÃ y vá» chá»§ Ä‘á» gÃ¬?'
            return "CÃ¢u há»i Ä‘Ã£ Ä‘Æ°á»£c viáº¿t láº¡i"
        # Prompt sinh cÃ¢u tráº£ lá»i chÃ­nh
        return "ÄÃ¢y lÃ  sÃ¡ch phiÃªu lÆ°u dÃ nh cho thiáº¿u nhi."


class FakeNoBookLlmService:
    def __init__(self):
        self.prompts = []

    async def generate_response(self, prompt, chat_history=None):
        self.prompts.append(prompt)
        if "Lá»‹ch sá»­ cuá»™c trÃ² chuyá»‡n" in prompt or "QUERY_REWRITE_PROMPT" in prompt:
            return prompt
        return "Hiá»‡n chÆ°a tÃ¬m tháº¥y cuá»‘n sÃ¡ch nÃ o phÃ¹ há»£p vá»›i yÃªu cáº§u nÃ y."


def test_build_contextual_question_calls_llm():
    classifier = FakeClassifier()
    rag_service = FakeRagService()
    llm_service = FakeLlmService()
    orchestrator = ChatOrchestrator(classifier, rag_service)
    orchestrator.llm_service = llm_service

    history = ["Bot: - SÃ¡ch: *LEGO Legends of Chima: Origins: A Starter Handbook*"]

    rewritten = asyncio.run(
        orchestrator.build_contextual_question("sÃ¡ch nÃ y vá» chá»§ Ä‘á» gÃ¬?", history)
    )

    assert "LEGO Legends of Chima: Origins: A Starter Handbook" in rewritten
    assert len(llm_service.prompts) == 1
    assert "sÃ¡ch nÃ y vá» chá»§ Ä‘á» gÃ¬?" in llm_service.prompts[0]


def test_orchestrator_routes_contextual_detail_question_with_llm_rewrite():
    classifier = FakeClassifier()
    rag_service = FakeRagService()
    llm_service = FakeLlmService()
    orchestrator = ChatOrchestrator(classifier, rag_service)
    orchestrator.llm_service = llm_service
    history = [
        "Bot: - SÃ¡ch: *LEGO Legends of Chima: Origins: A Starter Handbook*"
    ]

    answer, intent, confidence, source_books = asyncio.run(
        orchestrator.route_and_process(
            question="sÃ¡ch nÃ y vá» chá»§ Ä‘á» gÃ¬?",
            jwt_token="token",
            chat_history=history,
        )
    )

    assert answer == "ÄÃ¢y lÃ  sÃ¡ch phiÃªu lÆ°u dÃ nh cho thiáº¿u nhi."
    assert intent == "BOOK_SEARCH"
    assert confidence == 0.95
    assert source_books[0]["title"] == "LEGO Legends of Chima: Origins: A Starter Handbook"

    # Äáº£m báº£o Classifier nháº­n diá»‡n trÃªn cÃ¢u há»i Ä‘Ã£ Ä‘Æ°á»£c viáº¿t láº¡i
    assert "LEGO Legends of Chima: Origins: A Starter Handbook" in classifier.questions[0]

    # Äáº£m báº£o RAG Service tÃ¬m kiáº¿m theo cÃ¢u há»i Ä‘Ã£ viáº¿t láº¡i
    assert "LEGO Legends of Chima: Origins: A Starter Handbook" in rag_service.questions[0]

    # Kiá»ƒm tra LLM chÃ­nh nháº­n Ä‘Æ°á»£c prompt chá»©a cÃ¢u há»i gá»‘c vÃ  context
    assert 'CÃ¢u há»i gá»‘c: "sÃ¡ch nÃ y vá» chá»§ Ä‘á» gÃ¬?"' in llm_service.prompts[1]


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
    assert len(llm_service.prompts) == 0  # KhÃ´ng gá»i LLM vÃ¬ khÃ´ng cÃ³ sÃ¡ch nguá»“n
    assert "chÆ°a tÃ¬m tháº¥y" in answer


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
    assert "chÆ°a tÃ¬m tháº¥y" in answer
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
        'Hiá»‡n táº¡i thÆ° viá»‡n chÆ°a cÃ³ cuá»‘n sÃ¡ch nÃ o cÃ³ ná»™i dung Ä‘Ãºng nhÆ° "Äá»“ chÆ¡i ká»³ diá»‡u".'
    )
