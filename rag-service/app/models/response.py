from typing import List

from pydantic import BaseModel, Field


class SourceBook(BaseModel):
    book_id: int = Field(..., description="PostgreSQL book ID")
    title: str = Field(..., description="Book title")
    author: str = Field(..., description="Book author")
    relevance_score: float = Field(
        ...,
        description="Relative similarity score for the current question",
    )


class ChatResponse(BaseModel):
    answer: str = Field(..., description="Assistant answer")
    intent: str = Field(..., description="Classified question intent")
    confidence: float = Field(..., description="Intent classification confidence")
    source_books: List[SourceBook] = Field(
        default=[],
        description="Related books suggested by the retrieval pipeline",
    )


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    classifier_loaded: bool = Field(..., description="Intent classifier status")
    chroma_books_count: int = Field(..., description="Number of books in ChromaDB")
    llm_provider: str = Field(..., description="Configured LLM provider")
