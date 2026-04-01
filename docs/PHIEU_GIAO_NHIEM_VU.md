# ĐẠI HỌC BÁCH KHOA HÀ NỘI
## TRƯỜNG CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG

### PHIẾU GIAO NHIỆM VỤ ĐỒ ÁN TỐT NGHIỆP HỆ CỬ NHÂN
**KỲ: ____.__**

---

### Thông tin về sinh viên

| | |
|---|---|
| Họ và tên sinh viên: | `_______________` |
| MSSV: | `_______________` |
| Điện thoại liên lạc: | `_______________` |
| Lớp: | `_______________` |
| Email: | `_______________` |
| Mã lớp: | `_______________` |

### Thông tin giáo viên hướng dẫn

| | |
|---|---|
| Họ và tên GVHD: | `_______________` |
| Đồ án được thực hiện tại: | Trường Công nghệ Thông tin và Truyền thông |
| Thời gian làm ĐATN: | Từ ngày `__/__/2026` đến ngày `__/__/2026` |

---

## 1. Tên đề tài:

Xây dựng hệ thống web quản lý mượn trả sách thư viện tích hợp chatbot AI (RAG) và nhận diện thẻ NFC

---

## 2. Lĩnh vực đề tài:

- Lựa chọn 2: **Phần mềm doanh nghiệp**

---

## 3. Mục tiêu của ĐATN:

### 3.1. Kiến thức sinh viên thu thập được:
- Quy trình xây dựng phần mềm quản lý và áp dụng trong thực tế các giai đoạn: khảo sát, phân tích, thiết kế, cài đặt và kiểm thử. Đặc biệt là kinh nghiệm phân tích yêu cầu người dùng;
- Phát triển tất cả các thành phần của một ứng dụng dựa Web (fullstack): Backend API, Frontend SPA, AI microservice;
- Hiểu và vận dụng các design patterns trong phát triển phần mềm: DTO Pattern, Repository Pattern, Service Layer Pattern, Global Exception Handling;
- Nắm vững kiến trúc microservice: giao tiếp giữa các service qua REST API, containerization, orchestration;
- Tìm hiểu và ứng dụng kỹ thuật RAG (Retrieval-Augmented Generation) trong xây dựng chatbot AI hỗ trợ tìm kiếm thông minh;
- Tìm hiểu và tích hợp công nghệ NFC (Near Field Communication) vào hệ thống web.

### 3.2. Công nghệ sinh viên thu thập được:
- Spring Boot 4.x (Java 21): Xây dựng REST API, Spring Security (JWT, RBAC), Spring Data JPA, Spring Cache, Spring AOP;
- React 18 (TypeScript): Xây dựng giao diện người dùng SPA, React Query, React Router;
- PostgreSQL: Hệ quản trị cơ sở dữ liệu quan hệ;
- Redis: Hệ thống cache phân tán;
- Elasticsearch: Tìm kiếm full-text;
- FastAPI (Python): Xây dựng AI microservice;
- LangChain + ChromaDB: Xây dựng RAG pipeline cho chatbot AI;
- Docker + Docker Compose: Containerization và orchestration toàn bộ hệ thống;
- Flyway: Quản lý database migration;
- NFC Reader + pyscard: Đọc thẻ NFC và tích hợp với hệ thống web.

### 3.3. Kỹ năng sinh viên phát triển được:
- Giao tiếp, phỏng vấn khi phân tích yêu cầu, trao đổi với người dùng (thủ thư, sinh viên);
- Tìm kiếm tổng hợp thông tin từ nhiều nguồn;
- Khả năng xác định yêu tố trọng tâm, thứ tự ưu tiên khi phát triển phần mềm;
- Tính độc lập, chủ động, kiên trì trong công việc;
- Kỹ năng thiết kế cơ sở dữ liệu và API cho hệ thống thực tế;
- Kỹ năng viết test và đảm bảo chất lượng phần mềm.

### 3.4. Sản phẩm kỳ vọng:
- Hệ thống web quản lý mượn trả sách thư viện hoàn chỉnh, hỗ trợ nhiều vai trò người dùng (Admin, Thủ thư, Sinh viên);
- Chatbot AI tích hợp RAG cho phép tìm kiếm và hỏi đáp thông minh về sách bằng ngôn ngữ tự nhiên;
- Tích hợp NFC cho phép quẹt thẻ sinh viên và sách để thực hiện mượn/trả nhanh tại quầy thư viện;
- Có thể chạy trên máy tính và truy cập qua trình duyệt web;
- Toàn bộ hệ thống được đóng gói bằng Docker, triển khai bằng 1 lệnh docker-compose.

### 3.5. Vấn đề thực tiễn đồ án giải quyết:
- Hỗ trợ thủ thư quản lý quy trình mượn trả sách: theo dõi sách đang mượn, sách quá hạn, thông báo tự động cho sinh viên;
- Hỗ trợ sinh viên tìm kiếm sách thông minh bằng ngôn ngữ tự nhiên thay vì chỉ tìm theo tên/tác giả, nhờ chatbot AI tích hợp RAG;
- Tăng tốc quy trình mượn/trả tại quầy thư viện nhờ tích hợp NFC: thủ thư chỉ cần quẹt thẻ sinh viên và quẹt sách thay vì nhập tay;
- Cung cấp dashboard thống kê cho quản trị viên: tổng sách, lượt mượn, sách phổ biến, sách quá hạn;
- Hệ thống thông báo tự động cảnh báo sách sắp/đã quá hạn cho sinh viên.

---

## 4. Các nội dung sẽ thực hiện và kế hoạch triển khai:

*Lưu ý: Khối lượng yêu cầu đối với đồ án tốt nghiệp hệ cử nhân là 6(0-0-12-12), ie. 12 tiết làm việc/tuần trong 17 tuần.*

### Nội dung 1: Tìm hiểu tổng quan về bài toán, từ Tuần **1** đến Tuần **4**

Chi tiết:
- Tìm hiểu nghiệp vụ quản lý thư viện: quy trình mượn trả sách, quản lý sách, quản lý người dùng;
- Khảo sát các hệ thống quản lý thư viện hiện có (Koha, OpenBiblio) để tham khảo tính năng;
- Phân tích yêu cầu chức năng và phi chức năng của hệ thống;
- Xác định các vai trò người dùng (Admin, Thủ thư, Sinh viên) và phân quyền;
- Tìm hiểu tổng quan về kỹ thuật RAG và ứng dụng trong tìm kiếm thông tin;
- Tìm hiểu tổng quan về công nghệ NFC và khả năng tích hợp với hệ thống web.

### Nội dung 2: Tìm hiểu tổng quan về công nghệ liên quan, từ Tuần **2** đến Tuần **6**

Chi tiết:
- Spring Boot 4.x: Spring Security (JWT, Role-based Access Control), Spring Data JPA, Spring Cache, Spring AOP;
- React 18 + TypeScript: Component-based architecture, React Query, React Router;
- PostgreSQL: Thiết kế schema, indexing, full-text search;
- Redis: Caching strategy, cache invalidation;
- FastAPI + LangChain + ChromaDB: Xây dựng RAG pipeline;
- Docker + Docker Compose: Containerization và orchestration;
- NFC: Giao tiếp với NFC reader qua thư viện pyscard (Python).

### Nội dung 3: Phân tích thiết kế, từ Tuần **4** đến Tuần **7**

Chi tiết:
- Phân tích các usecase và các vai trò người dùng;
- Thiết kế kiến trúc hệ thống: Backend (Spring Boot) + Frontend (React) + AI Service (FastAPI) + NFC Service;
- Thiết kế cơ sở dữ liệu: các bảng users, books, categories, borrow_records, notifications, audit_logs;
- Thiết kế REST API: đặc tả endpoints, request/response format, error handling;
- Thiết kế giao diện sử dụng mock up;
- Thiết kế RAG pipeline: embedding model, vector database, prompt template.

### Nội dung 4: Xây dựng chương trình, từ Tuần **5** đến Tuần **14**

Chi tiết:
- Xây dựng Backend API (Spring Boot): CRUD sách, quản lý người dùng, xác thực JWT, phân quyền, mượn/trả sách, tìm kiếm, caching, audit logging;
- Xây dựng Frontend (React): Trang đăng nhập, dashboard, danh sách sách, chi tiết sách, mượn/trả, admin panel, chat RAG;
- Xây dựng AI Service (FastAPI): RAG pipeline cho chatbot tìm kiếm sách thông minh;
- Tích hợp NFC: Quẹt thẻ sinh viên + quẹt sách để mượn/trả nhanh tại quầy;
- Xây dựng Dashboard thống kê, hệ thống Notification;
- Viết unit test và integration test cho service layer;
- Đóng gói toàn bộ hệ thống bằng Docker Compose.

### Nội dung 5: Thử nghiệm và đánh giá, từ Tuần **14** đến Tuần **17**

Chi tiết:
- Kiểm thử API services: functional testing các endpoints;
- Kiểm thử chức năng mượn/trả sách end-to-end;
- Kiểm thử chatbot RAG: đánh giá chất lượng câu trả lời, độ chính xác tìm kiếm;
- Kiểm thử tích hợp NFC: quẹt thẻ sinh viên, quẹt sách, mượn/trả nhanh;
- Kiểm thử bảo mật: xác thực JWT, phân quyền, SQL injection;
- Đánh giá hiệu năng hệ thống;
- Hoàn thiện báo cáo đồ án và chuẩn bị thuyết trình.

---

## 5. Lời cam đoan của sinh viên đã nhận được nhiệm vụ

*Em xin cam kết sẽ hoàn thành các nhiệm vụ theo đúng kế hoạch.*

Hà Nội, ngày __ tháng __ năm 2026

**Sinh viên**

*(Ký và ghi rõ họ tên)*
