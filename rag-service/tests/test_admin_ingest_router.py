import os
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.routers import admin


class FakeRagService:
    pass


def make_client(monkeypatch):
    app = FastAPI()
    app.include_router(admin.router)
    app.state.rag_service = FakeRagService()
    monkeypatch.setattr(settings, "internal_api_key", "test-internal-key")
    return TestClient(app), app.state.rag_service


def test_ingest_book_endpoint_syncs_single_book(monkeypatch):
    client, rag_service = make_client(monkeypatch)
    calls = []

    def fake_sync_book(service, book_id):
        calls.append((service, book_id))
        return 1

    monkeypatch.setattr(admin, "sync_book_from_postgres", fake_sync_book)

    response = client.post(
        "/api/ingest/books/42",
        headers={"X-Internal-Key": "test-internal-key"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "books_ingested": 1,
        "book_id": 42,
    }
    assert calls == [(rag_service, 42)]


def test_ingest_book_endpoint_rejects_invalid_internal_key(monkeypatch):
    client, _ = make_client(monkeypatch)

    response = client.post(
        "/api/ingest/books/42",
        headers={"X-Internal-Key": "wrong-key"},
    )

    assert response.status_code == 401


def test_ingest_book_endpoint_returns_404_when_book_missing(monkeypatch):
    client, rag_service = make_client(monkeypatch)
    calls = []

    def fake_sync_book(service, book_id):
        calls.append((service, book_id))
        return 0

    monkeypatch.setattr(admin, "sync_book_from_postgres", fake_sync_book)

    response = client.post(
        "/api/ingest/books/404",
        headers={"X-Internal-Key": "test-internal-key"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Book not found for vector sync."
    assert calls == [(rag_service, 404)]


def test_delete_ingested_book_endpoint_deletes_book_vector(monkeypatch):
    client, rag_service = make_client(monkeypatch)
    calls = []

    def fake_delete_book(service, book_id):
        calls.append((service, book_id))
        return 1

    monkeypatch.setattr(admin, "delete_book_from_chroma", fake_delete_book)

    response = client.delete(
        "/api/ingest/books/42",
        headers={"X-Internal-Key": "test-internal-key"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "books_deleted": 1,
        "book_id": 42,
    }
    assert calls == [(rag_service, 42)]


def test_delete_ingested_book_endpoint_rejects_invalid_internal_key(monkeypatch):
    client, _ = make_client(monkeypatch)

    response = client.delete(
        "/api/ingest/books/42",
        headers={"X-Internal-Key": "wrong-key"},
    )

    assert response.status_code == 401
