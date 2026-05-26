import httpx
import logging
from datetime import datetime
from app.config import settings

logger = logging.getLogger("rag-service.api_query")

class APIQueryService:
    def __init__(self):
        self.spring_boot_url = settings.spring_boot_url

    async def get_user_borrows(self, jwt_token: str) -> list[dict]:
        """
        Gọi API Spring Boot để lấy danh sách sách sinh viên đang mượn.
        Endpoint: GET /api/borrows/my
        """
        url = f"{self.spring_boot_url}/borrows/my"
        headers = {"Authorization": f"Bearer {jwt_token}"}
        
        logger.info(f"Đang gọi Spring Boot API để lấy thông tin mượn: {url}")
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers, params={"size": 100})
                
                if response.status_code == 200:
                    resp_json = response.json()
                    if resp_json.get("success") and "data" in resp_json:
                        data = resp_json["data"]
                        # data có thể là PageResponse chứa content
                        if isinstance(data, dict) and "content" in data:
                            return data["content"]
                        return data
                    return []
                else:
                    logger.error(f"Spring Boot trả về status_code lỗi {response.status_code} khi lấy thông tin mượn.")
                    return []
        except Exception as e:
            logger.error(f"Lỗi kết nối tới Spring Boot API khi lấy thông tin mượn: {str(e)}")
            return []

    async def get_user_holds(self, jwt_token: str) -> list[dict]:
        """
        Gọi API Spring Boot để lấy danh sách các lượt đặt trước của sinh viên.
        Endpoint: GET /api/holds/my
        """
        url = f"{self.spring_boot_url}/holds/my"
        headers = {"Authorization": f"Bearer {jwt_token}"}
        
        logger.info(f"Đang gọi Spring Boot API để lấy thông tin hold: {url}")
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers, params={"size": 100})
                
                if response.status_code == 200:
                    resp_json = response.json()
                    if resp_json.get("success") and "data" in resp_json:
                        data = resp_json["data"]
                        if isinstance(data, dict) and "content" in data:
                            return data["content"]
                        return data
                    return []
                else:
                    logger.error(f"Spring Boot trả về status_code lỗi {response.status_code} khi lấy thông tin hold.")
                    return []
        except Exception as e:
            logger.error(f"Lỗi kết nối tới Spring Boot API khi lấy thông tin hold: {str(e)}")
            return []

    def build_borrow_context(self, borrows: list[dict]) -> str:
        """
        Xây dựng văn bản mô tả trạng thái mượn sách từ danh sách các bản ghi.
        """
        if not borrows:
            return "Bạn hiện tại không có cuốn sách nào đang mượn tại thư viện."
            
        # Lọc các bản ghi chưa trả
        active_borrows = [b for b in borrows if b.get("status") in ["BORROWING", "OVERDUE"]]
        
        if not active_borrows:
            return "Bạn hiện tại không có cuốn sách nào đang mượn (đã trả hết các cuốn sách cũ)."
            
        # Tách ra mượn bình thường và quá hạn
        borrowing = [b for b in active_borrows if b.get("status") == "BORROWING"]
        overdue = [b for b in active_borrows if b.get("status") == "OVERDUE"]
        
        context_lines = []
        context_lines.append(f"Sinh viên đang mượn tổng cộng {len(active_borrows)} cuốn sách tại thư viện:")
        
        if borrowing:
            context_lines.append("\n📚 Danh sách sách đang mượn trong hạn:")
            for idx, b in enumerate(borrowing, 1):
                due_date_str = self._format_date(b.get("dueDate"))
                context_lines.append(f"{idx}. \"{b.get('bookTitle')}\" của tác giả {b.get('bookAuthor')} (Hạn trả: {due_date_str}, Bản sao số: {b.get('copyNumber')})")
                
        if overdue:
            context_lines.append("\n⚠️ DANH SÁCH SÁCH ĐÃ QUÁ HẠN TRẢ:")
            for idx, b in enumerate(overdue, 1):
                due_date_str = self._format_date(b.get("dueDate"))
                context_lines.append(f"{idx}. \"{b.get('bookTitle')}\" của tác giả {b.get('bookAuthor')} (ĐÃ QUÁ HẠN từ ngày: {due_date_str}, Bản sao số: {b.get('copyNumber')})")
                
        return "\n".join(context_lines)

    def build_hold_context(self, holds: list[dict]) -> str:
        """
        Xây dựng văn bản mô tả trạng thái đặt sách từ danh sách các bản ghi hold.
        """
        if not holds:
            return "Bạn hiện tại không có yêu cầu đăng ký đặt trước (hold) giữ chỗ cuốn sách nào."
            
        # Lọc ra các hold có trạng thái đang hoạt động (PENDING - chờ duyệt, READY - sẵn sàng chờ lấy)
        active_holds = [h for h in holds if h.get("status") in ["PENDING", "READY"]]
        
        if not active_holds:
            return "Bạn hiện tại không có yêu cầu giữ chỗ (hold) sách nào đang chờ xử lý hoặc sẵn sàng."
            
        context_lines = []
        context_lines.append(f"Sinh viên đang có {len(active_holds)} yêu cầu đặt sách:")
        
        for idx, h in enumerate(active_holds, 1):
            status = h.get("status")
            status_vietnamese = "Đang chờ thủ thư duyệt" if status == "PENDING" else "Đã được duyệt - Sẵn sàng chờ bạn ra nhận"
            
            line = f"{idx}. Sách \"{h.get('bookTitle')}\" (Trạng thái: {status_vietnamese})"
            if status == "READY" and h.get("expiresAt"):
                exp_date_str = self._format_date(h.get("expiresAt"))
                line += f" -> Bạn cần ra quầy thư viện lấy sách trước thời hạn: {exp_date_str} (Hết hạn sau 24h từ lúc duyệt)."
                
            context_lines.append(line)
            
        return "\n".join(context_lines)

    def _format_date(self, date_val) -> str:
        """
        Helper định dạng ngày tháng hiển thị thân thiện.
        """
        if not date_val:
            return "N/A"
        try:
            # Nếu là chuỗi ISO datetime từ Spring Boot (ví dụ "2026-05-25T13:30:00")
            if isinstance(date_val, str):
                # Cắt lấy phần YYYY-MM-DD và giờ nếu cần
                dt = datetime.fromisoformat(date_val.replace("Z", ""))
                return dt.strftime("%d/%m/%Y %H:%M")
            return str(date_val)
        except Exception:
            return str(date_val)
