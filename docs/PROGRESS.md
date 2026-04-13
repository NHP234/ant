# Progress Tracking

> Cập nhật file này sau mỗi phiên làm việc.
> Format: ✅ Done | 🔄 In Progress | ⬜ TODO | ❌ Blocked

## Tổng quan tiến độ

| Giai đoạn | Trạng thái | Thời gian |
|-----------|-----------|-----------|
| Tháng 1: Backend nền tảng | 🔄 In Progress | Tuần 1-4 |
| Tháng 2: Backend nâng cao + FE | ⬜ TODO | Tuần 5-8 |
| Tháng 3: Frontend + RAG | ⬜ TODO | Tuần 9-12 |
| Tháng 4: NFC + Hoàn thiện | ⬜ TODO | Tuần 13-16 |
| Tháng 5: Polish + Báo cáo | ⬜ TODO | Tuần 17-20 |

---

## Tháng 1: Backend Nền tảng

### Tuần 1: Project Setup & Database
- ✅ Khởi tạo SpringBoot project (Spring Initializr) - Spring Boot 4.0.3, Java 21
- ✅ Setup Docker Compose (PostgreSQL + Redis)
- ✅ Thiết kế database schema chi tiết
- ✅ Tạo Flyway migration scripts (V1-V7)
- ✅ Setup cấu trúc package (model/entity, model/enums, repository, exception, config)
- ✅ Config application.yml (datasource, flyway, jwt, borrow settings)
- 🔄 Chạy docker-compose + verify SpringBoot khởi động thành công

### Tuần 2: CRUD & Core Patterns
- ✅ Entity classes (User, Book, Category, BorrowRecord, Notification, AuditLog)
- ✅ DTO classes (ApiResponse, PageResponse, BookCreateRequest, BookUpdateRequest, BookResponse, CategoryCreateRequest, CategoryResponse)
- ✅ MapStruct mappers (BookMapper, CategoryMapper) + dependency setup
- ✅ Book CRUD APIs (BookController + BookService + BookRepository) với search
- ✅ Category CRUD APIs (CategoryController + CategoryService + CategoryRepository)
- ✅ Global Exception Handler (@ControllerAdvice)
- ✅ Pagination & Sorting support (@PageableDefault)
- ✅ Bean Validation (@Valid, @NotBlank, @Size, @Min)

### Tuần 3: Security
- ✅ Spring Security config (SecurityFilterChain, DaoAuthenticationProvider, CORS)
- ✅ JWT token generation & validation (JwtTokenProvider + jjwt 0.12.6)
- ✅ Refresh Token mechanism (AuthService.refresh)
- ✅ Login / Register endpoints (AuthController: /api/auth/login, /register, /refresh)
- ✅ Role-based authorization (@PreAuthorize trên Book/Category controllers)
- ✅ BCrypt password encoding (PasswordEncoder bean)
- ✅ CORS configuration (localhost:5173, localhost:3000)

### Tuần 4: Business Logic - Mượn/Trả
- ⬜ BorrowRecord service (mượn sách, trả sách)
- ⬜ Business rules: giới hạn số sách mượn đồng thời
- ⬜ Business rules: kiểm tra available_quantity
- ⬜ Business rules: tính ngày quá hạn, phí phạt
- ⬜ Validation: không mượn sách đang mượn
- ⬜ API: lịch sử mượn trả của user

---

## Tháng 2: Backend Nâng cao + Frontend Cơ bản

### Tuần 5: Caching & Search
- ⬜ Redis config + Spring Cache setup
- ⬜ Cache strategy: sách phổ biến, thống kê dashboard
- ⬜ Cache invalidation khi data thay đổi
- ⬜ Elasticsearch setup (Docker)
- ⬜ Index sách vào Elasticsearch
- ⬜ Full-text search API (tên, tác giả, mô tả)

### Tuần 6: Logging, Scheduling, Notifications
- ⬜ Spring AOP: audit logging (mượn/trả/thêm sách)
- ⬜ @Scheduled: kiểm tra sách quá hạn hàng ngày
- ⬜ Notification service (in-app notifications)
- ⬜ Dashboard statistics API (tổng sách, đang mượn, quá hạn...)

### Tuần 7: Testing & Documentation
- ⬜ Unit tests cho Service layer (JUnit 5 + Mockito)
- ⬜ Integration tests (SpringBootTest + TestContainers)
- ⬜ Test coverage >= 70% service layer
- ⬜ Swagger/OpenAPI config
- ⬜ API documentation đầy đủ annotations

### Tuần 8: Frontend Setup
- ⬜ Init React project (Vite + TypeScript)
- ⬜ Setup Ant Design / MUI
- ⬜ Setup React Router, Axios, React Query
- ⬜ Trang Login / Register
- ⬜ Trang Dashboard
- ⬜ Trang danh sách sách (search, filter, pagination)

---

## Tháng 3: Frontend + RAG

### Tuần 9-10: Frontend hoàn thiện
- ⬜ Trang chi tiết sách
- ⬜ Trang mượn/trả sách
- ⬜ Trang lịch sử mượn trả
- ⬜ Trang profile user
- ⬜ Admin panel: quản lý sách
- ⬜ Admin panel: quản lý users
- ⬜ Admin panel: thống kê
- ⬜ Responsive design

### Tuần 11: RAG Service Setup
- ⬜ Init FastAPI project
- ⬜ Setup LangChain + ChromaDB
- ⬜ Embedding pipeline (book descriptions -> vectors)
- ⬜ RAG query pipeline (question -> search -> LLM -> answer)
- ⬜ Prompt engineering cho domain thư viện
- ⬜ API endpoint: POST /api/chat

### Tuần 12: RAG Integration
- ⬜ SpringBoot proxy endpoint tới RAG service
- ⬜ Frontend: Chat UI component
- ⬜ Chat history (lưu DB hoặc session)
- ⬜ Test & refine RAG quality
- ⬜ Fallback khi RAG service unavailable

---

## Tháng 4: NFC + Hoàn thiện

### Tuần 13: NFC Integration
- ⬜ Setup NFC reader hardware
- ⬜ Python script đọc NFC UID
- ⬜ API: mapping NFC card -> user account
- ⬜ Flow: quẹt thẻ -> auto identify user -> mượn/trả
- ⬜ Frontend: NFC status indicator

### Tuần 14: System Testing
- ⬜ End-to-end testing toàn bộ flow
- ⬜ Performance testing cơ bản
- ⬜ Security testing (SQL injection, XSS, JWT expiry)
- ⬜ Fix bugs
- ⬜ Docker Compose chạy hoàn chỉnh 1 lệnh

### Tuần 15-16: Báo cáo & Thuyết trình
- ⬜ Viết báo cáo đồ án
- ⬜ Chuẩn bị slides
- ⬜ Luyện thuyết trình
- ⬜ Demo video dự phòng

---

## Changelog

| Ngày | Nội dung |
|------|----------|
| 2026-03-04 | Khởi tạo project, setup documentation structure |
| 2026-03-04 | Setup SpringBoot project, docker-compose, application.yml, entities, repositories, exceptions, Flyway migrations V1-V7 |
| 2026-03-14 | DTOs, MapStruct mappers, Book/Category CRUD (Controller + Service), pagination, validation, .gitignore, .env |
| 2026-04-05 | Security: JWT auth (jjwt), login/register/refresh, JwtFilter, @PreAuthorize (ADMIN/LIBRARIAN/STUDENT), CORS, BCrypt |
