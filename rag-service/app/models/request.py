from pydantic import BaseModel, Field
from typing import List, Optional

class ChatRequest(BaseModel):
    question: str = Field(..., description="Câu hỏi của sinh viên bằng ngôn ngữ tự nhiên", examples=["Tìm sách lập trình Java"])
    chat_history: List[str] = Field(default=[], description="Lịch sử hội thoại trước đó (các câu trao đổi dạng văn bản)", examples=[])
