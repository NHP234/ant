import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils import ingestion


class FakeRagService:
    def __init__(self):
        self.upserted = []
        self.deleted = []
        self.keep_book_ids = None

    def upsert_books(self, books):
        self.upserted.extend(books)

    def delete_book(self, book_id):
        self.deleted.append(book_id)

    def delete_books_not_in(self, book_ids):
        self.keep_book_ids = book_ids
        return 3


def test_sync_book_from_postgres_upserts_single_book(monkeypatch):
    book = {
        "id": 42,
        "title": "Test Book",
        "author": "Test Author",
        "description": "A test book used to verify single-book vector synchronization.",
        "categories": ["Testing", "RAG"],
        "publisher": "Test Publisher",
        "publishYear": 2026,
    }
    service = FakeRagService()
    monkeypatch.setattr(ingestion, "load_books_from_postgres", lambda book_id=None: [book])

    count = ingestion.sync_book_from_postgres(service, 42)

    assert count == 1
    assert service.upserted == [book]


def test_full_sync_prunes_stale_vectors(monkeypatch):
    book = {
        "id": 42,
        "title": "Test Book",
        "author": "Test Author",
        "description": "A test book used to verify full vector synchronization.",
        "categories": ["Testing", "RAG"],
        "publisher": "Test Publisher",
        "publishYear": 2026,
    }
    service = FakeRagService()
    monkeypatch.setattr(ingestion, "load_books_from_postgres", lambda book_id=None: [book])

    count = ingestion.sync_postgres_to_chroma(service)

    assert count == 1
    assert service.upserted == [book]
    assert service.keep_book_ids == [42]


def test_sync_book_from_postgres_returns_zero_when_missing(monkeypatch):
    service = FakeRagService()
    monkeypatch.setattr(ingestion, "load_books_from_postgres", lambda book_id=None: [])

    count = ingestion.sync_book_from_postgres(service, 404)

    assert count == 0
    assert service.upserted == []


def test_delete_book_from_chroma_deletes_by_id():
    service = FakeRagService()

    count = ingestion.delete_book_from_chroma(service, 42)

    assert count == 1
    assert service.deleted == [42]
