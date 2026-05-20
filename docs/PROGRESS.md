# Progress Tracking

> Cập nhật file này sau mỗi phiên làm việc.
> Format: ✅ Done | 🔄 In Progress | ⬜ TODO | ❌ Blocked

## Tổng quan tiến độ

| Giai đoạn | Trạng thái | Thời gian |
|-----------|-----------|-----------|
| Tháng 1: Backend nền tảng | ✅ Done | Tuần 1-4 |
| Tháng 2: Backend nâng cao + FE | ✅ Done | Tuần 5-8 |
| Tháng 3: Frontend + RAG | 🔄 In Progress | Tuần 9-12 |
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
- ✅ BorrowService (mượn sách, trả sách, lịch sử, overdue check)
- ✅ Business rules: giới hạn tối đa 5 sách mượn đồng thời (configurable)
- ✅ Business rules: kiểm tra available_quantity (atomic decrement/increment)
- ✅ Business rules: tính ngày quá hạn + auto mark OVERDUE
- ✅ Validation: không cho mượn sách đang mượn (existsByUserIdAndBookIdAndStatus)
- ✅ API: lịch sử mượn trả của user (GET /api/borrows/my)
- ✅ API: admin xem tất cả (GET /api/borrows), xem quá hạn (GET /api/borrows/overdue)
- ✅ BorrowController + BorrowRecordMapper + BorrowRequest/BorrowRecordResponse DTOs
- ✅ OverdueCheckScheduler (@Scheduled cron hàng ngày 00:00)
- ✅ Notification tự động khi mượn/trả/quá hạn
- ✅ @EnableScheduling trên DemoApplication
- ✅ User Management: UserController + UserService + UserMapper (ADMIN tạo user với role tùy chọn)
- ✅ API: POST /api/users (tạo LIBRARIAN/ADMIN), GET /api/users (list), GET /api/users/me (profile)
- ✅ API: PUT /api/users/{id}/role (đổi role), PUT /api/users/{id}/status (activate/deactivate)

---

## Tháng 2: Backend Nâng cao + Frontend Cơ bản

### Tuần 5: Caching & Search
- ✅ Redis config + Spring Cache (spring-boot-starter-data-redis, CacheConfig)
- ✅ Cache strategy: categories (24h), book detail (30m), dashboard stats (5m)
- ✅ Cache invalidation: @CacheEvict trên create/update/delete
- ✅ Dashboard API: GET /api/dashboard/stats (ADMIN/LIBRARIAN, cached)
- ✅ PostgreSQL full-text search thay Elasticsearch (tsvector + unaccent + GIN index)
- ✅ Flyway V8: search_vector column, trigger auto-update, Vietnamese text search config
- ✅ Search API nâng cấp: full-text search title + author + description, weighted ranking, fallback LIKE

### Tuần 6: Logging, Scheduling, Notifications
- ✅ Spring AOP: @Auditable annotation + AuditAspect (auto log mượn/trả/thêm/sửa/xóa sách)
- ✅ @Scheduled: OverdueCheckScheduler (đã làm tuần 4)
- ✅ Notification API: GET /notifications, GET /notifications/unread-count, PUT /{id}/read, PUT /read-all
- ✅ NotificationService + NotificationMapper + NotificationResponse DTO
- ✅ Dashboard statistics API (đã làm tuần 5)

### Tuần 7: Testing & Documentation
- ✅ Unit tests: BorrowServiceTest (10 test cases - borrow/return/overdue)
- ✅ Unit tests: BookServiceTest (8 test cases - CRUD/search/fallback)
- ✅ Unit tests: UserServiceTest (10 test cases - create/role/status/profile)
- ✅ Swagger/OpenAPI: springdoc-openapi + OpenApiConfig (JWT security scheme)
- ✅ @Tag annotations trên tất cả controllers
- ✅ @Operation annotations trên Auth endpoints
- ✅ Swagger UI accessible: http://localhost:8080/swagger-ui.html

### Tuần 8: Frontend Implementation (v1 — cần cập nhật cho backend V9-V12)
- ✅ Init Vite + React 19 + TypeScript project
- ✅ Setup Shadcn/ui (Radix + Nova preset) + TailwindCSS v4
- ✅ Setup React Router v7, Axios, TanStack Query
- ✅ API layer: Axios instance + JWT interceptor (auto attach token, refresh on 401)
- ✅ Auth: AuthProvider context, Login/Register pages, role-based route guard
- ✅ Admin Layout: Sidebar + Header + User menu + ThemeToggle + NotificationBell
- ✅ Student Layout: Sidebar lite (Browse, My Borrows, Notifications)
- ✅ Dashboard page: Stats cards (totalBooks, users, activeBorrows, overdue, categories)
- ✅ Book Management: DataTable + Search + Create/Edit Dialog + Delete confirm + Pagination
- 🔄 Borrow Management: Cần chuyển từ borrows → borrow-slips API + expandable rows
- ✅ User Management: Table + Create user dialog (role select) + Activate/Deactivate
- 🔄 Book Catalog (Student): Cần sửa field names (quantity → totalCopies, availableQuantity → availableCopies)
- 🔄 Book Detail page: Cần đổi "Mượn sách" → "Đặt mượn (Hold 24h)" + gọi Hold API
- 🔄 My Borrows page: Cần thêm tabs (Holds / Đang mượn / Lịch sử) + gọi Hold API
- ✅ Notifications page: List + Mark as read + Mark all read
- ✅ Dark/Light mode toggle (localStorage persist)
- ✅ Responsive: Mobile sidebar collapse (Sheet component)
- ✅ Loading/empty states trên tất cả pages
- ✅ Backend Dockerize: multi-stage Dockerfile + docker-compose (backend + postgres + redis)

---

## Tháng 3: RAG + NFC

### Tuần 9-10: Frontend Cập nhật V9-V12 + Polish

#### Phase 1: Sửa API Layer & Types (đồng bộ với backend DTOs)
- ✅ Sửa `api/auth.ts`: AuthResponse interface (nested `user` object + `tokenType`, `expiresIn`)
- ✅ Sửa `api/books.ts`: Book interface (`totalCopies`/`availableCopies`), PageResponse (`page` + `last`)
- ✅ Sửa `api/borrows.ts`: BorrowRecord interface (thêm `copyId`, `copyNumber`) + `BorrowRequest`
- ✅ Sửa `api/notifications.ts`: response key (`count` → `unreadCount`)
- ✅ Tạo `api/holds.ts`: Hold CRUD API (create, getMyHolds, getAll, getById, confirm, cancel)
- ✅ Tạo `api/borrowSlips.ts`: BorrowSlip API (getMySlips, getAll, getById)
- ✅ `hooks/useAuth.tsx`: đã destructure đúng `user` từ trước, giữ nguyên

#### Phase 2: Layout & Routing
- ⬜ Sửa `AdminLayout.tsx`: Branding "Awaken Ant Library" + thêm nav "Quản lý đặt trước" + Lucide icons
- ⬜ Sửa `StudentLayout.tsx`: Branding "Awaken Ant Library" + thêm nav "Trợ lý AI" + Lucide icons
- ⬜ Sửa `router.tsx`: Thêm route `/admin/holds`, `/chat`

#### Phase 3: Admin Pages
- ⬜ Sửa `DashboardPage.tsx`: Thêm "Holds đang chờ" section + "Hoạt động gần đây" table
- ⬜ Sửa `BookManagementPage.tsx`: field names + nút "Quản lý bản sao" (BookCopy dialog)
- ⬜ Sửa `BorrowManagementPage.tsx`: Chuyển sang borrow-slips API + expandable row xem chi tiết phiếu
- ⬜ Tạo `HoldManagementPage.tsx`: Bảng holds + filter tabs + nút Xác nhận/Hủy

#### Phase 4: Student Pages
- ⬜ Sửa `BookDetailPage.tsx`: Nút "Đặt mượn (Hold 24h)" + gọi holdApi
- ⬜ Sửa `BookCatalogPage.tsx`: Sửa field names
- ⬜ Sửa `MyBorrowsPage.tsx`: 3 Tabs (Đang đặt trước / Đang mượn / Lịch sử trả)
- ⬜ Tạo `ChatPage.tsx`: Placeholder UI cho RAG chatbot

#### Phase 5: Shared Components & Polish
- ⬜ Tạo `components/shared/Pagination.tsx`: Reusable pagination
- ⬜ Tạo `components/shared/StatusBadge.tsx`: Reusable status badge
- ⬜ Tách large pages thành sub-components (max 200 dòng/file)
- ⬜ Responsive check + Dark mode check
- ⬜ Kiểm tra full flow: Login → Browse → Hold → Admin Confirm → Borrow

#### Polish & Infrastructure
- ⬜ Category management UI (CRUD)
- ⬜ Profile page (xem/sửa thông tin cá nhân)
- ⬜ Audit log viewer (admin)
- ⬜ Frontend Dockerfile + docker-compose service
- ⬜ Fix bugs, UX improvements

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
| 2026-04-15 | Business Logic: BorrowService (mượn/trả/quá hạn), BorrowController, OverdueCheckScheduler, auto Notification |
| 2026-04-26 | User Management: UserController + UserService (ADMIN tạo user với role, list users, đổi role, update status) |
| 2026-04-26 | Redis Cache (categories/book/dashboard), PostgreSQL full-text search (tsvector+unaccent+GIN), Dashboard API |
| 2026-04-27 | Spring AOP audit logging (@Auditable), Notification API (CRUD + unread count + mark read) |
| 2026-05-06 | Unit tests (BorrowService/BookService/UserService, 28 test cases), Swagger/OpenAPI config + annotations |
| 2026-05-06 | Backend Dockerize: multi-stage Dockerfile, docker-compose healthcheck, pom.xml fix (remove spring-boot-starter-aop) |
| 2026-05-08 | Frontend: Vite+React+TS+Shadcn/ui, full admin panel (Dashboard/Books/Borrows/Users), student view (Catalog/Detail/MyBorrows/Notifications), Auth+JWT, dark mode, responsive |
| 2026-05-14 | Bug fixes: Redis serialization (Jackson + LocalDateTime), LazyInitializationException (@Transactional), GlobalExceptionHandler logging. API testing docs update (authorization, roles). Frontend auth fix (destructuring user from login response) |
| 2026-05-15 | Schema refactor V9: book_copies (physical copies with NFC per copy), borrow_slips (borrow sessions), computed quantities (COUNT instead of denormalized), pessimistic locking. Updated entities, repos, services, DTOs, mappers |
| 2026-05-16 | Documentation update: DATABASE.md + BACKEND.md rewrite to reflect V9 schema changes |
| 2026-05-16 | Normalize borrow_records (drop denormalized user_id) + add Flyway V10 + update code/tests/docs |
| 2026-05-16 | Add hold/ reservation flow: book_holds, RESERVED status, hold expiry + ban, new APIs and schedulers |
| 2026-05-18 | Librarian direct borrow + borrower lookup, BorrowService refactor/auto-fulfill; BorrowSource COUNTER + Flyway V12; docs + api-testing updates; guidelines clean-code checks |
| 2026-05-20 | Frontend review: API_SPEC vs backend controllers audit (found 7 missing endpoints, 4 DTO mismatches). Created IMPLEMENTATION_PLAN.md. Updated FRONTEND.md + PROGRESS.md. UI wireframe fixes (Hold Mgmt, Notifications screens) |
| 2026-05-20 | Phase 1 FE: Updated API_SPEC.md khớp backend controllers, sửa 4 API layer files (auth/books/borrows/notifications), tạo 2 files mới (holds/borrowSlips), giữ nguyên useAuth.tsx |
