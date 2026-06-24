import asyncio
import os
import sys
from unittest.mock import Mock, AsyncMock

import httpx

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.llm_service import LLMService


def test_deepseek_generates_response_with_non_thinking_mode(monkeypatch):
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {
        "choices": [{"message": {"content": "  Câu trả lời từ DeepSeek.  "}}]
    }
    post_mock = AsyncMock(return_value=response)

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

        post = post_mock

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)
    service = LLMService(
        deepseek_api_key="test-key",
        deepseek_model="deepseek-v4-flash",
    )

    result = asyncio.run(service.generate_response("Hãy giới thiệu sách.", ["Xin chào"]))

    assert result == "Câu trả lời từ DeepSeek."
    request = post_mock.call_args.kwargs
    assert request["json"]["model"] == "deepseek-v4-flash"
    assert request["json"]["thinking"] == {"type": "disabled"}
    assert request["json"]["max_tokens"] == 1200
    assert request["json"]["messages"][0]["role"] == "system"
    assert request["json"]["messages"][1]["role"] == "user"
    assert "Hãy giới thiệu sách." in request["json"]["messages"][2]["content"]
    assert request["headers"]["Authorization"] == "Bearer test-key"


def test_deepseek_returns_friendly_message_when_balance_is_empty(monkeypatch):
    request = httpx.Request("POST", "https://api.deepseek.com/chat/completions")
    response = httpx.Response(402, request=request, text="Insufficient Balance")

    async def raise_for_balance(*args, **kwargs):
        raise httpx.HTTPStatusError(
            "Insufficient Balance",
            request=request,
            response=response,
        )

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

        post = raise_for_balance

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)
    service = LLMService(
        deepseek_api_key="test-key",
    )

    result = asyncio.run(service.generate_response("Tìm sách giúp tôi."))

    assert "hết hạn mức sử dụng" in result
    assert "Insufficient Balance" not in result


def test_clean_response_text_removes_single_asterisk_artifacts():
    service = LLMService(deepseek_api_key="")

    result = service._clean_response_text("Book A - *Author A*\n* Summary line")

    assert "*" not in result
    assert "Author A" in result
    assert "- Summary line" in result


def test_clean_response_text_removes_markdown_emphasis_artifacts():
    service = LLMService(deepseek_api_key="")

    result = service._clean_response_text(
        "1. **TÃªn sÃ¡ch:** _Clean Code_\n**TÃ¡c giáº£:** Robert C. Martin"
    )

    assert "*" not in result
    assert "_" not in result
    assert "TÃªn sÃ¡ch:" in result
    assert "Clean Code" in result


def test_missing_key_uses_mock_mode():
    service = LLMService(
        deepseek_api_key="",
    )

    assert not service.is_configured
    assert asyncio.run(service.generate_response("Xin chào")).startswith("[MOCK ANSWER")
