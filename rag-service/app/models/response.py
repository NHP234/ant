from pydantic import BaseModel, Field
from typing import List, Optional

class SourceBook(BaseModel):
    book_id: int = Field(..., description="ID của cuốn sách trong database PostgreSQL")
    title: str = Field(..., description="Tên cuốn sách")
    author: str = Field(..., description="Tên tác giả")
    relevance_score: float = Field(..., description="Độ tương đồng tương đối so với câu hỏi (0.0 - 1.0)")

class ChatResponse(BaseModel):
    answer: str = Field(..., description="Câu trả lời từ Trợ lý AI")
    intent: str = Field(..., description="Ý định câu hỏi được phân loại bởi SVM Classifier")
    confidence: float = Field(..., description="Độ tự tin/độ tin cậy của việc phân loại ý định")
    source_books: List[SourceBook] = Field(default=[], description="Danh sách các cuốn sách liên quan được gợi ý (nếu có)")

class HealthResponse(BaseModel):
    status: str = Field(..., description="Trạng thái hệ thống (ví dụ: healthy)")
    classifier_loaded: bool = Field(..., description="Trạng thái load mô hình phân loại ý định (SVM)")
    chroma_books_count: int = Field(..., description="Số lượng sách hiện có trong Vector Database")
    llm_provider: str = Field(..., description="LLM provider đang sử dụng (ví dụ: gemini)")
