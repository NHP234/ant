import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import admin, chat
from app.config import settings
from app.services.intent_classifier import IntentClassifier
from app.services.rag_service import RAGService
from app.services.chat_orchestrator import ChatOrchestrator
from app.data.intent_training import TRAINING_DATA
import logging

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("rag-service")

app = FastAPI(
    title="Awaken Ant Library - RAG Service API",
    description="Python FastAPI Microservice cung cấp trợ lý AI kết hợp Intent Classifier (SVM) và RAG (ChromaDB + Gemini API).",
    version="1.0.0"
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các Router
app.include_router(admin.router)
app.include_router(chat.router)

@app.on_event("startup")
async def startup_event():
    logger.info("RAG Service đang được khởi chạy...")
    logger.info(f"Môi trường chạy: {settings.env}")
    logger.info(f"Spring Boot Backend URL: {settings.spring_boot_url}")
    
    # 1. Khởi tạo RAG Service (ChromaDB + SentenceTransformer)
    try:
        rag_service = RAGService()
        app.state.rag_service = rag_service
    except Exception as e:
        logger.error(f"Khởi tạo RAG Service thất bại: {str(e)}")
        app.state.rag_service = None

    # 2. Khởi tạo và load/train SVM Intent Classifier
    classifier = IntentClassifier()
    model_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), 
        "..", 
        "models", 
        "intent_classifier.joblib"
    )
    
    # Đồng bộ hóa đường dẫn tuyệt đối
    model_path = os.path.abspath(model_path)
    
    if os.path.exists(model_path):
        try:
            logger.info(f"Tìm thấy mô hình đã được huấn luyện sẵn tại {model_path}. Tiến hành tải...")
            classifier.load(model_path)
        except Exception as e:
            logger.error(f"Lỗi khi tải mô hình từ file: {str(e)}. Tiến hành huấn luyện lại...")
            classifier.is_trained = False
            
    if not classifier.is_trained:
        try:
            logger.info("Chưa có mô hình hoặc tải lỗi. Tiến hành tự động huấn luyện SVM Classifier...")
            texts = [item[0] for item in TRAINING_DATA]
            labels = [item[1] for item in TRAINING_DATA]
            classifier.train(texts, labels)
            classifier.save(model_path)
            logger.info(f"Đã lưu mô hình huấn luyện tự động vào: {model_path}")
        except Exception as e:
            logger.error(f"Huấn luyện SVM tự động thất bại: {str(e)}")
            
    app.state.classifier = classifier

    # 3. Khởi tạo ChatOrchestrator
    app.state.orchestrator = ChatOrchestrator(classifier, app.state.rag_service)
    logger.info("Khởi tạo Chat Orchestrator thành công. RAG Service đã sẵn sàng nhận kết nối!")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("RAG Service đang dừng hoạt động...")
