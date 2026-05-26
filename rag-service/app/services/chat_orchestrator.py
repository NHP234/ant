import logging
import os
from typing import List, Tuple

from app.services.intent_classifier import IntentClassifier
from app.services.rag_service import RAGService
from app.services.api_query_service import APIQueryService
from app.services.llm_service import LLMService

from app.data.prompts import (
    BOOK_SEARCH_PROMPT,
    BORROW_STATUS_PROMPT,
    HOLD_STATUS_PROMPT,
    GENERAL_CHAT_PROMPT
)

logger = logging.getLogger("rag-service.orchestrator")

class ChatOrchestrator:
    def __init__(self, classifier: IntentClassifier, rag_service: RAGService):
        self.classifier = classifier
        self.rag_service = rag_service
        self.api_query_service = APIQueryService()
        self.llm_service = LLMService()
        self.confidence_threshold = 0.6

    async def route_and_process(
        self, 
        question: str, 
        jwt_token: str, 
        chat_history: List[str] = []
    ) -> Tuple[str, str, float, List[dict]]:
        """
        Xử lý điều phối câu hỏi:
        1. Gọi SVM Classifier phân loại ý định
        2. Nếu độ tự tin thấp -> fallback sang GENERAL_CHAT
        3. Dựa vào ý định để gọi pipeline xử lý tương ứng
        4. Gọi Gemini LLM để tổng hợp câu trả lời tự nhiên
        Trả về: (answer, intent, confidence, source_books)
        """
        logger.info(f"Bắt đầu điều phối câu hỏi: '{question}'")
        
        # 1. Phân loại ý định
        intent, confidence = "GENERAL_CHAT", 1.0
        if self.classifier and self.classifier.is_trained:
            try:
                intent, confidence = self.classifier.predict(question)
            except Exception as e:
                logger.error(f"Lỗi khi chạy Intent Classifier: {str(e)}. Fallback sang GENERAL_CHAT.")
                intent, confidence = "GENERAL_CHAT", 0.0
        else:
            logger.warning("Intent Classifier chưa được train/load. Mặc định là GENERAL_CHAT.")
            intent, confidence = "GENERAL_CHAT", 0.0

        # 2. Áp dụng Confidence Threshold
        if confidence < self.confidence_threshold:
            logger.info(f"Độ tự tin SVM ({confidence:.2f}) thấp hơn threshold ({self.confidence_threshold}). Fallback sang GENERAL_CHAT.")
            intent = "GENERAL_CHAT"

        source_books = []
        answer = ""

        try:
            # 3. Phân nhánh xử lý các ý định
            if intent == "BOOK_SEARCH":
                # Pipeline A: RAG Tìm sách
                logger.info("Chạy pipeline BOOK_SEARCH (RAG)...")
                context, source_books = self.rag_service.search_books(question, n_results=5)
                
                # Định dạng prompt
                prompt = BOOK_SEARCH_PROMPT.format(context=context, question=question)
                answer = self.llm_service.generate_response(prompt, chat_history)

            elif intent == "BORROW_STATUS":
                # Pipeline B1: Tình trạng mượn trả
                logger.info("Chạy pipeline BORROW_STATUS (Spring Boot API)...")
                borrows = await self.api_query_service.get_user_borrows(jwt_token)
                context = self.api_query_service.build_borrow_context(borrows)
                
                prompt = BORROW_STATUS_PROMPT.format(context=context, question=question)
                answer = self.llm_service.generate_response(prompt, chat_history)

            elif intent == "HOLD_STATUS":
                # Pipeline B2: Tình trạng đặt trước sách (Hold)
                logger.info("Chạy pipeline HOLD_STATUS (Spring Boot API)...")
                holds = await self.api_query_service.get_user_holds(jwt_token)
                context = self.api_query_service.build_hold_context(holds)
                
                prompt = HOLD_STATUS_PROMPT.format(context=context, question=question)
                answer = self.llm_service.generate_response(prompt, chat_history)

            else:  # GENERAL_CHAT
                # Pipeline C: Trò chuyện tự do / nội quy chung
                logger.info("Chạy pipeline GENERAL_CHAT...")
                prompt = GENERAL_CHAT_PROMPT.format(question=question)
                answer = self.llm_service.generate_response(prompt, chat_history)

        except Exception as e:
            logger.error(f"Lỗi xảy ra trong quá trình xử lý pipeline {intent}: {str(e)}")
            answer = f"Xin lỗi bạn, trợ lý thư viện đang gặp trục trặc kỹ thuật nhỏ khi xử lý yêu cầu của bạn: {str(e)}"

        return answer, intent, confidence, source_books
