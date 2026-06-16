import os
import sys
from unittest.mock import Mock

import httpx

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.llm_service import LLMService


def test_deepseek_generates_response_with_non_thinking_mode(monkeypatch):
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {
        "choices": [{"message": {"content": "  Câu trả lời từ DeepSeek.  "}}]
    }
    post = Mock(return_value=response)
    monkeypatch.setattr(httpx, "post", post)
    service = LLMService(
        deepseek_api_key="test-key",
        deepseek_model="deepseek-v4-flash",
    )

    result = service.generate_response("Hãy giới thiệu sách.", ["Xin chào"])

    assert result == "Câu trả lời từ DeepSeek."
    request = post.call_args.kwargs
    assert request["json"]["model"] == "deepseek-v4-flash"
    assert request["json"]["thinking"] == {"type": "disabled"}
    assert request["json"]["max_tokens"] == 800
    assert "Lịch sử hội thoại trước đó" in request["json"]["messages"][0]["content"]
    assert request["headers"]["Authorization"] == "Bearer test-key"


def test_deepseek_returns_friendly_message_when_balance_is_empty(monkeypatch):
    request = httpx.Request("POST", "https://api.deepseek.com/chat/completions")
    response = httpx.Response(402, request=request, text="Insufficient Balance")

    def raise_for_balance(*args, **kwargs):
        raise httpx.HTTPStatusError(
            "Insufficient Balance",
            request=request,
            response=response,
        )

    monkeypatch.setattr(httpx, "post", raise_for_balance)
    service = LLMService(
        deepseek_api_key="test-key",
    )

    result = service.generate_response("Tìm sách giúp tôi.")

    assert "hết hạn mức sử dụng" in result
    assert "Insufficient Balance" not in result


def test_missing_key_uses_mock_mode():
    service = LLMService(
        deepseek_api_key="",
    )

    assert not service.is_configured
    assert service.generate_response("Xin chào").startswith("[MOCK ANSWER")
