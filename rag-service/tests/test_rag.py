import os
import sys
import pytest
import chromadb
from unittest.mock import MagicMock

# Thêm thư mục gốc vào PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_service import RAGService

# Mock embedding function để tránh tải model 130MB trong lúc test
class MockEmbeddingFunction:
    def __call__(self, input: list[str]) -> list[list[float]]:
        # Trả về vector mock kích thước 384 dimensions
        return [[0.1] * 384 for _ in input]

def test_rag_service_ops():
    # Khởi tạo RAGService với mock và EphemeralClient (chạy hoàn toàn trên RAM)
    # để tránh việc tạo thư mục tạm trên ổ đĩa và lỗi lock file (WinError 32) trên Windows
    service = RAGService.__new__(RAGService)
    service.persist_dir = ""
    service.client = chromadb.EphemeralClient()
    service.embedding_fn = MockEmbeddingFunction()
    service.collection = service.client.get_or_create_collection(
        name="test_books",
        embedding_function=service.embedding_fn,
        metadata={"hnsw:space": "cosine"}
    )
    
    # 1. Kiểm tra ban đầu trống
    assert service.get_books_count() == 0
    
    # 2. Test upsert sách
    mock_books = [
        {
            "id": 101,
            "title": "Lập trình Java căn bản",
            "author": "Nguyễn Văn A",
            "description": "Cuốn sách dạy Java rất hay",
            "categories": ["Lập trình", "Java"],
            "publisher": "NXB Giáo Dục",
            "publishYear": 2022
        },
        {
            "id": 102,
            "title": "Machine Learning thực chiến",
            "author": "Trần Thị B",
            "description": "Hướng dẫn AI và học máy ứng dụng",
            "categories": ["AI", "Machine Learning"],
            "publisher": "NXB Khoa Học",
            "publishYear": 2023
        }
    ]
    
    service.upsert_books(mock_books)
    assert service.get_books_count() == 2
    
    # 3. Test vector search
    context, source_books = service.search_books("Học máy tính", n_results=1)
    assert len(source_books) == 1
    assert source_books[0]["book_id"] in [101, 102]
    assert "Tên sách:" in context

