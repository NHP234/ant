import time
import logging
from fastapi import APIRouter, HTTPException, Header, BackgroundTasks, Request
from app.models.response import HealthResponse
from app.config import settings
from app.utils.ingestion import delete_book_from_chroma, sync_book_from_postgres, sync_postgres_to_chroma

logger = logging.getLogger("rag-service.admin_router")
router = APIRouter(prefix="/api", tags=["Admin"])

def require_internal_key(x_internal_key: str):
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Không có quyền truy cập endpoint nội bộ.")

def run_ingestion_in_background(rag_service):
    """
    Hàm chạy đồng bộ trong background thread của FastAPI.
    """
    logger.info("Bắt đầu tiến trình đồng bộ sách nền (Background Task)...")
    try:
        count = sync_postgres_to_chroma(rag_service)
        logger.info(f"Tiến trình đồng bộ sách nền hoàn tất! Đã đồng bộ {count} cuốn sách.")
    except Exception as e:
        logger.error(f"Tiến trình đồng bộ sách nền gặp lỗi: {str(e)}")

@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    rag_service = request.app.state.rag_service
    classifier = request.app.state.classifier
    orchestrator = request.app.state.orchestrator
    
    books_count = 0
    if rag_service:
        try:
            books_count = rag_service.get_books_count()
        except Exception:
            pass
            
    classifier_loaded = classifier.is_trained if classifier else False
    
    return HealthResponse(
        status="healthy",
        classifier_loaded=classifier_loaded,
        chroma_books_count=books_count,
        llm_provider=orchestrator.llm_service.provider
    )

@router.post("/ingest")
async def trigger_ingestion(
    request: Request,
    background_tasks: BackgroundTasks,
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    require_internal_key(x_internal_key)
    
    rag_service = request.app.state.rag_service
    
    # Chạy đồng bộ sách dưới dạng Background Task của FastAPI để tránh block API call của Spring Boot
    background_tasks.add_task(run_ingestion_in_background, rag_service)
    
    return {
        "status": "success",
        "message": "Đã bắt đầu tiến trình đồng bộ dữ liệu sách trong nền (Background Ingestion started)."
    }

@router.post("/ingest/books/{book_id}")
async def ingest_book(
    book_id: int,
    request: Request,
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    require_internal_key(x_internal_key)

    count = sync_book_from_postgres(request.app.state.rag_service, book_id)
    if count == 0:
        raise HTTPException(status_code=404, detail="Book not found for vector sync.")

    return {
        "status": "success",
        "books_ingested": count,
        "book_id": book_id,
    }

@router.delete("/ingest/books/{book_id}")
async def delete_ingested_book(
    book_id: int,
    request: Request,
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    require_internal_key(x_internal_key)

    count = delete_book_from_chroma(request.app.state.rag_service, book_id)
    return {
        "status": "success",
        "books_deleted": count,
        "book_id": book_id,
    }
