import os
import sys

import chromadb

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_service import (
    RAGService,
    _extract_lexical_terms,
    _is_relevant_vector_match,
    _score_lexical_book,
)


class MockEmbeddingFunction:
    def __call__(self, input: list[str]) -> list[list[float]]:
        return [[0.1] * 1024 for _ in input]


def test_extract_lexical_terms_keeps_specific_title_and_author_tokens():
    assert _extract_lexical_terms("co sach nao ve lego chima khong") == ["lego", "chima"]
    assert _extract_lexical_terms("co sach nao ve chu de lego chima khong") == ["lego", "chima"]
    assert _extract_lexical_terms("co sach nao cua tac gia tracey west khong") == ["tracey", "west"]
    assert _extract_lexical_terms("sach ve lego noi chung thi sao thu vien co khong") == ["lego"]
    assert _extract_lexical_terms("tim sach ve bong ban") == ["bong", "ban"]


def test_lexical_scoring_avoids_substring_false_positive():
    assert _score_lexical_book(
        {
            "title": "The Communist Necessity: Prolegomena to Any Future Radical Theory",
            "author": "J. Moufawad-Paul",
            "description": "",
            "categories": [],
        },
        ["lego"],
    ) == 0
    assert _score_lexical_book(
        {
            "title": "Dirty Little Secret (Legoland Trilogy #3)",
            "author": "Jon Stock",
            "description": "",
            "categories": [],
        },
        ["lego"],
    ) > 0


def test_lexical_scoring_requires_multi_token_evidence():
    terms = ["thien", "van", "hoc"]

    assert _score_lexical_book(
        {
            "title": "Thien Than Sam Hoi",
            "author": "Ta Duy Anh",
            "description": "",
            "categories": ["Van hoc"],
        },
        terms,
    ) == 0
    assert _score_lexical_book(
        {
            "title": "De helende kracht van acceptatie",
            "author": "Annemarie Postma",
            "description": "",
            "categories": [],
        },
        terms,
    ) == 0
    assert _score_lexical_book(
        {
            "title": "Nhap mon thien van hoc",
            "author": "Nguyen Van A",
            "description": "",
            "categories": ["Khoa hoc"],
        },
        terms,
    ) > 0


def test_lexical_scoring_does_not_match_table_tennis_by_bong_only():
    terms = ["bong", "ban"]

    assert _score_lexical_book(
        {
            "title": "Bong Hong Vang Va Binh Minh Mua",
            "author": "Konstantin Paustovsky",
            "description": "",
            "categories": [],
        },
        terms,
    ) == 0
    assert _score_lexical_book(
        {
            "title": "Clones from the Future",
            "author": "Casey Bong",
            "description": "",
            "categories": [],
        },
        terms,
    ) == 0
    assert _score_lexical_book(
        {
            "title": "Ky thuat bong ban co ban",
            "author": "Nguyen Van A",
            "description": "Huong dan choi bong ban",
            "categories": ["The thao"],
        },
        terms,
    ) > 0


def test_vector_relevance_threshold_filters_weak_sources():
    assert _is_relevant_vector_match(0.54)
    assert not _is_relevant_vector_match(0.51)


def test_search_books_uses_normalized_query_for_lexical_search():
    service = RAGService.__new__(RAGService)
    calls = []

    service.get_books_count = lambda: 1

    def fake_lexical_search(question, limit):
        calls.append(question)
        if question == "lego chima":
            return [
                (
                    "Ten sach: LEGO Legends of Chima: Origins: A Starter Handbook",
                    {
                        "book_id": 5639,
                        "title": "LEGO Legends of Chima: Origins: A Starter Handbook",
                        "author": "Tracey West",
                        "relevance_score": 0.94,
                    },
                )
            ]
        return []

    service._search_books_lexically = fake_lexical_search
    service._search_books_chroma_only = lambda question, n_results: []

    _, source_books = service.search_books("co sach nao lien quan toi lego chima khong", n_results=5)

    assert calls[0] == "lego chima"
    assert source_books[0]["book_id"] == 5639


def test_search_books_prefers_lexical_matches_and_deduplicates():
    service = RAGService.__new__(RAGService)
    service.persist_dir = ""
    service.client = chromadb.EphemeralClient()
    service.embedding_fn = MockEmbeddingFunction()
    service.collection = service.client.get_or_create_collection(
        name="hybrid_books",
        embedding_function=service.embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )
    service.upsert_books([
        {
            "id": 201,
            "title": "Birds of the West",
            "author": "Example Author",
            "description": "A book about birds and nature.",
            "categories": ["Nature"],
            "publisher": "NXB",
            "publishYear": 2020,
        },
        {
            "id": 202,
            "title": "LEGO Legends of Chima: Origins: A Starter Handbook",
            "author": "Tracey West",
            "description": "A starter handbook for LEGO Legends of Chima.",
            "categories": ["Children"],
            "publisher": "Scholastic",
            "publishYear": 2013,
        },
    ])

    lego_doc = "Ten sach: LEGO Legends of Chima: Origins: A Starter Handbook\nTac gia: Tracey West"
    # Lexical returns Book 202 (rank 1) and Book 203 (rank 2)
    service._search_books_lexically = lambda question, limit: [
        (
            lego_doc,
            {
                "book_id": 202,
                "title": "LEGO Legends of Chima: Origins: A Starter Handbook",
                "author": "Tracey West",
                "relevance_score": 0.98,
            },
        ),
        (
            "Ten sach: Due South Boxed Set\nTac gia: Tracey Alvarez",
            {
                "book_id": 203,
                "title": "Due South Boxed Set",
                "author": "Tracey Alvarez",
                "relevance_score": 0.71,
            },
        )
    ]

    # Semantic also returns Book 202 (rank 1)
    service._search_books_chroma_only = lambda question, n_results: [
        (
            lego_doc,
            {
                "book_id": 202,
                "title": "LEGO Legends of Chima: Origins: A Starter Handbook",
                "author": "Tracey West",
                "relevance_score": 0.95,
            },
        )
    ]

    context, source_books = service.search_books("co sach nao ve lego chima khong", n_results=2)

    # Book 202 should be deduplicated (only appears once)
    assert len(source_books) == 2
    assert source_books[0]["book_id"] == 202
    assert source_books[1]["book_id"] == 203
    assert [book["book_id"] for book in source_books].count(202) == 1
    assert "LEGO Legends of Chima" in context
    assert "Due South Boxed Set" in context


def test_rrf_rank_fusion_logic():
    service = RAGService.__new__(RAGService)
    service.get_books_count = lambda: 5

    # Mock lexical search
    service._search_books_lexically = lambda question, limit: [
        (
            "Doc A",
            {"book_id": 1, "title": "Book A", "author": "Author A", "relevance_score": 0.8}
        ),
        (
            "Doc B",
            {"book_id": 2, "title": "Book B", "author": "Author B", "relevance_score": 0.7}
        )
    ]

    # Mock semantic search
    service._search_books_chroma_only = lambda question, n_results: [
        (
            "Doc C",
            {"book_id": 3, "title": "Book C", "author": "Author C", "relevance_score": 0.9}
        ),
        (
            "Doc B",
            {"book_id": 2, "title": "Book B", "author": "Author B", "relevance_score": 0.65}
        )
    ]

    # RRF scores (with k = 60):
    # Book 1: lexical rank 1, semantic not matched -> score = 1 / (60 + 1) = 1/61
    # Book 2: lexical rank 2, semantic rank 2 -> score = 1 / (60 + 2) + 1 / (60 + 2) = 2/62 = 1/31
    # Book 3: lexical not matched, semantic rank 1 -> score = 1 / (60 + 1) = 1/61
    # Since 1/31 > 1/61, Book 2 should be ranked 1st!
    # Let's verify.
    context, source_books = service.search_books("test query", n_results=3)

    assert len(source_books) == 3
    assert source_books[0]["book_id"] == 2  # Book 2 has higher RRF score
    # Book 2 should have the maximum of its relevance scores: max(0.7, 0.65) = 0.7
    assert source_books[0]["relevance_score"] == 0.7
    assert source_books[1]["book_id"] in [1, 3]
    assert source_books[2]["book_id"] in [1, 3]
