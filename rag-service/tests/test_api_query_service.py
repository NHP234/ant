import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.api_query_service import APIQueryService


def test_build_hold_context_uses_backend_hold_statuses():
    service = APIQueryService()
    holds = [
        {
            "bookTitle": "Clean Code",
            "status": "ACTIVE",
            "expiresAt": "2026-06-16T09:30:00",
        },
        {
            "bookTitle": "Effective Java",
            "status": "FULFILLED",
            "fulfilledAt": "2026-06-14T10:15:00",
        },
        {
            "bookTitle": "Design Patterns",
            "status": "CANCELED",
            "canceledAt": "2026-06-13T08:00:00",
            "cancelReason": "USER_CANCELED",
        },
        {
            "bookTitle": "Refactoring",
            "status": "EXPIRED",
            "expiresAt": "2026-06-12T17:45:00",
        },
    ]

    context = service.build_hold_context(holds)

    assert "1 yêu cầu đặt trước đang còn hiệu lực" in context
    assert '"Clean Code": Đang được giữ tại quầy' in context
    assert "16/06/2026 09:30" in context
    assert '"Effective Java": Đã nhận sách và chuyển thành lượt mượn' in context
    assert '"Design Patterns": Đã hủy' in context
    assert "sinh viên chủ động hủy" in context
    assert '"Refactoring": Đã hết hạn giữ chỗ' in context
    assert "PENDING" not in context
    assert "READY" not in context
    assert "chờ thủ thư duyệt" not in context


def test_build_hold_context_reports_history_when_no_active_hold():
    service = APIQueryService()
    holds = [
        {
            "bookTitle": "Domain-Driven Design",
            "status": "EXPIRED",
            "expiresAt": "2026-06-10T12:00:00",
        }
    ]

    context = service.build_hold_context(holds)

    assert "0 yêu cầu đặt trước đang còn hiệu lực" in context
    assert "Hiện không có sách nào đang được giữ chỗ" in context
    assert "Lịch sử đặt trước" in context
    assert "Đã hết hạn giữ chỗ" in context


def test_build_hold_context_handles_empty_data():
    service = APIQueryService()

    assert service.build_hold_context([]) == "Sinh viên chưa có yêu cầu đặt trước sách nào."
