from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from typing import List

class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str = Field(..., description="Câu hỏi của sinh viên bằng ngôn ngữ tự nhiên", examples=["Tìm sách lập trình Java"])
    chat_history: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("chat_history", "chatHistory"),
        description="Lịch sử hội thoại trước đó (các câu trao đổi dạng văn bản)",
        examples=[],
    )
