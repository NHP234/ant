import os
import sys

import chromadb

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_service import RAGService


class MockEmbeddingFunction:
    def __call__(self, input: list[str]) -> list[list[float]]:
        return [[0.1] * 384 for _ in input]


def test_rag_service_ops():
    service = RAGService.__new__(RAGService)
    service.persist_dir = ""
    service.client = chromadb.EphemeralClient()
    service.embedding_fn = MockEmbeddingFunction()
    service.collection = service.client.get_or_create_collection(
        name="test_books",
        embedding_function=service.embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )

    assert service.get_books_count() == 0

    mock_books = [
        {
            "id": 101,
            "title": "Lập trình Java căn bản",
            "author": "Nguyễn Văn A",
            "description": "Cuốn sách dạy Java rất hay",
            "categories": ["Lập trình", "Java"],
            "publisher": "NXB Giáo Dục",
            "publishYear": 2022,
        },
        {
            "id": 102,
            "title": "Machine Learning thực chiến",
            "author": "Trần Thị B",
            "description": "Hướng dẫn AI và học máy ứng dụng",
            "categories": ["AI", "Machine Learning"],
            "publisher": "NXB Khoa Học",
            "publishYear": 2023,
        },
    ]

    service.upsert_books(mock_books)
    assert service.get_books_count() == 2
    service._search_books_lexically = lambda question, limit: []

    context, source_books = service.search_books("Học máy tính", n_results=1)
    assert len(source_books) == 1
    assert source_books[0]["book_id"] in [101, 102]
    assert "cover_image_url" not in source_books[0]
    assert "Tên sách:" in context

    detail_context, detail_sources = service.get_book_by_title("Machine Learning thực chiến")
    assert len(detail_sources) == 1
    assert detail_sources[0]["book_id"] == 102
    assert detail_sources[0]["author"] == "Trần Thị B"
    assert "cover_image_url" not in detail_sources[0]
    assert "Machine Learning thực chiến" in detail_context
