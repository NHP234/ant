import logging
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger("rag-service.llm")

class LLMService:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.is_configured = False
        
        if not self.api_key:
            logger.warning(
                "GEMINI_API_KEY chưa được cấu hình trong file .env! "
                "Chatbot sẽ chạy ở chế độ MOCK (trả về câu trả lời giả lập)."
            )
            return

        try:
            genai.configure(api_key=self.api_key)
            # Kiểm tra nhanh bằng cách gọi danh sách model (nếu có thể) hoặc gán flag thành công
            self.model_name = "gemini-2.5-flash"
            self.is_configured = True
            logger.info(f"Đã cấu hình thành công Google Gemini SDK với model: {self.model_name}")
        except Exception as e:
            logger.error(f"Lỗi khi cấu hình Google Gemini SDK: {str(e)}")

    def generate_response(self, prompt: str, chat_history: list[str] = []) -> str:
        """
        Gửi prompt và lịch sử hội thoại lên Google Gemini API để tạo câu trả lời.
        """
        if not self.is_configured:
            # Chế độ Mock Fallback nếu không có API Key
            logger.info("Đang chạy chế độ Mock LLM do thiếu GEMINI_API_KEY.")
            return (
                "[MOCK ANSWER - Vui lòng cung cấp GEMINI_API_KEY thực tế]\n\n"
                "Tôi đã nhận được yêu cầu của bạn. Đây là phản hồi giả lập vì hệ thống chưa được nạp khóa API của Google Gemini.\n"
                f"Nội dung prompt yêu cầu:\n{prompt[:300]}..."
            )
            
        try:
            # Nếu có lịch sử hội thoại, chúng ta sẽ lồng lịch sử vào prompt để Gemini nắm ngữ cảnh
            full_prompt = prompt
            if chat_history:
                history_text = "\n".join(chat_history)
                full_prompt = f"Lịch sử hội thoại trước đó:\n{history_text}\n\nYêu cầu hiện tại:\n{prompt}"
            
            logger.info(f"Đang gửi request lên Gemini API ({self.model_name})...")
            model = genai.GenerativeModel(self.model_name)
            
            # Cấu hình tham số sinh (generation config)
            generation_config = genai.types.GenerationConfig(
                temperature=0.3, # Thấp để tăng tính chính xác, giảm bịa đặt thông tin sách
                max_output_tokens=1000
            )
            
            response = model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
            
            if response and response.text:
                return response.text.strip()
            
            return "Rất tiếc, tôi không thể xử lý câu trả lời lúc này."
            
        except Exception as e:
            logger.error(f"Lỗi khi gọi Google Gemini API: {str(e)}")
            return f"Xin lỗi bạn, đã xảy ra lỗi trong quá trình xử lý câu hỏi với trí tuệ nhân tạo: {str(e)}"
