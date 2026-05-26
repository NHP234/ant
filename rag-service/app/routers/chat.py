from fastapi import APIRouter, HTTPException, Header, Request
from app.models.request import ChatRequest
from app.models.response import ChatResponse, SourceBook
from typing import Optional

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: Request,
    chat_req: ChatRequest,
    authorization: Optional[str] = Header(None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Thiếu mã xác thực (JWT Token) ở Authorization Header hoặc mã xác thực không hợp lệ."
        )
    
    jwt_token = authorization.split(" ")[1]
    
    # Lấy orchestrator từ app state được khởi tạo ở main.py
    orchestrator = request.app.state.orchestrator
    
    # Thực hiện điều phối và xử lý câu hỏi
    answer, intent, confidence, raw_sources = await orchestrator.route_and_process(
        question=chat_req.question,
        jwt_token=jwt_token,
        chat_history=chat_req.chat_history
    )
    
    # Convert raw sources to SourceBook schemas
    source_books = [
        SourceBook(
            book_id=src["book_id"],
            title=src["title"],
            author=src["author"],
            relevance_score=src["relevance_score"]
        ) for src in raw_sources
    ]
    
    return ChatResponse(
        answer=answer,
        intent=intent,
        confidence=confidence,
        source_books=source_books
    )
