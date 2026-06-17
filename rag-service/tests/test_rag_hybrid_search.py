import os
import sys

import chromadb

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_service import RAGService, _extract_lexical_terms, _score_lexical_book


class MockEmbeddingFunction:
    def __call__(self, input: list[str]) -> list[list[float]]:
        return [[0.1] * 384 for _ in input]


def test_extract_lexical_terms_keeps_specific_title_and_author_tokens():
    assert _extract_lexical_terms("co sach nao ve lego chima khong") == ["lego", "chima"]
    assert _extract_lexical_terms("co sach nao cua tac gia tracey west khong") == ["tracey", "west"]
    assert _extract_lexical_terms("sach ve lego noi chung thi sao thu vien co khong") == ["lego"]


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

    context, source_books = service.search_books("co sach nao ve lego chima khong", n_results=2)

    assert source_books[0]["book_id"] == 202
    assert len(source_books) == 1
    assert [book["book_id"] for book in source_books].count(202) == 1
    assert "LEGO Legends of Chima" in context
    assert "cover_image_url" not in source_books[0]
