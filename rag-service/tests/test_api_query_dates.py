import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.api_query_service import APIQueryService


def test_format_date_keeps_backend_local_datetime():
    service = APIQueryService()

    assert service._format_date("2026-06-16T10:38:00") == "16/06/2026 10:38"


def test_format_date_converts_utc_offset_to_vietnam_time():
    service = APIQueryService()

    assert service._format_date("2026-06-16T03:38:00Z") == "16/06/2026 10:38"
