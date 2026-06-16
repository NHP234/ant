import logging

import httpx

from app.config import settings

logger = logging.getLogger("rag-service.llm")


class LLMService:
    def __init__(
        self,
        deepseek_api_key: str | None = None,
        deepseek_model: str | None = None,
        deepseek_base_url: str | None = None,
    ):
        self.provider = "deepseek"
        self.deepseek_api_key = (
            deepseek_api_key
            if deepseek_api_key is not None
            else settings.deepseek_api_key
        )
        self.deepseek_model = (
            deepseek_model
            if deepseek_model is not None
            else settings.deepseek_model
        )
        self.deepseek_base_url = (
            deepseek_base_url
            if deepseek_base_url is not None
            else settings.deepseek_base_url
        ).rstrip("/")
        self.is_configured = False
        self._configure_deepseek()

    def _configure_deepseek(self) -> None:
        if not self.deepseek_api_key:
            logger.warning(
                "DEEPSEEK_API_KEY chưa được cấu hình trong file .env! "
                "Chatbot sẽ chạy ở chế độ MOCK (trả về câu trả lời giả lập)."
            )
            return

        self.is_configured = True
        logger.info(
            "Đã cấu hình DeepSeek API với model: %s",
            self.deepseek_model,
        )

    def generate_response(
        self,
        prompt: str,
        chat_history: list[str] | None = None,
    ) -> str:
        """
        Gửi prompt và lịch sử hội thoại tới LLM provider đã cấu hình.
        """
        if not self.is_configured:
            logger.info("Đang chạy chế độ Mock LLM do thiếu API key hợp lệ.")
            return (
                "[MOCK ANSWER - Vui lòng cấu hình API key cho LLM]\n\n"
                "Tôi đã nhận được yêu cầu của bạn. Đây là phản hồi giả lập vì hệ thống chưa được cấu hình dịch vụ AI.\n"
                f"Nội dung prompt yêu cầu:\n{prompt[:300]}..."
            )

        full_prompt = self._build_full_prompt(prompt, chat_history or [])

        try:
            return self._generate_with_deepseek(full_prompt)
        except httpx.HTTPStatusError as error:
            status_code = error.response.status_code
            logger.error(
                "DeepSeek API trả về HTTP %s: %s",
                status_code,
                error.response.text[:500],
            )
            if status_code == 402:
                return "Dịch vụ trợ lý AI đang tạm hết hạn mức sử dụng. Vui lòng liên hệ quản trị viên."
            if status_code == 429:
                return "Trợ lý AI đang nhận quá nhiều yêu cầu. Bạn vui lòng thử lại sau ít phút."
            return "Trợ lý AI đang tạm thời không phản hồi. Bạn vui lòng thử lại sau."
        except Exception as e:
            logger.error("Lỗi khi gọi DeepSeek API: %s", str(e))
            return "Trợ lý AI đang gặp sự cố kết nối. Bạn vui lòng thử lại sau."

    def _generate_with_deepseek(self, full_prompt: str) -> str:
        logger.info(
            "Đang gửi request lên DeepSeek API (%s)...",
            self.deepseek_model,
        )
        response = httpx.post(
            f"{self.deepseek_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.deepseek_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.deepseek_model,
                "messages": [{"role": "user", "content": full_prompt}],
                "thinking": {"type": "disabled"},
                "temperature": 0.3,
                "max_tokens": 800,
                "stream": False,
            },
            timeout=settings.llm_request_timeout_seconds,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return content.strip() if content else self._empty_response_message()

    def _build_full_prompt(self, prompt: str, chat_history: list[str]) -> str:
        if not chat_history:
            return prompt
        history_text = "\n".join(chat_history)
        return (
            f"Lịch sử hội thoại trước đó:\n{history_text}\n\n"
            f"Yêu cầu hiện tại:\n{prompt}"
        )

    def _empty_response_message(self) -> str:
        return "Rất tiếc, tôi không thể xử lý câu trả lời lúc này."
