# Progress Tracking

> Cập nhật file này sau mỗi phiên làm việc.
> Format: ✅ Done | 🔄 In Progress | ⬜ TODO | ❌ Blocked

## Tổng quan tiến độ

| Giai đoạn | Trạng thái | Thời gian |
|-----------|-----------|-----------|
| Tháng 1: Backend nền tảng | ✅ Done | Tuần 1-4 |
| Tháng 2: Backend nâng cao + FE | ✅ Done | Tuần 5-8 |
| Tháng 3: Frontend + RAG | ✅ Done | Tuần 9-12 |
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
- ✅ API/UI: ADMIN mở khóa đặt mượn cho sinh viên qua DELETE /api/users/{id}/hold-ban và trang quản lý người dùng

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
- ✅ Borrow Management: Chuyển từ borrows → borrow-slips API + expandable rows
- ✅ User Management: Table + Create user dialog (role select) + Activate/Deactivate
- ✅ Book Catalog (Student): Sửa field names (totalCopies/availableCopies)
- ✅ Book Detail page: Đổi "Mượn sách" → "Đặt mượn (Hold 24h)" + gọi holdApi
- ✅ My Borrows page: Thêm 3 tabs (Holds / Đang mượn / Lịch sử) + hủy hold
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
- ✅ Sửa `AdminLayout.tsx`: Branding "Awaken Ant Library" + thêm nav "Quản lý đặt trước" + Lucide icons
- ✅ Sửa `StudentLayout.tsx`: Branding "Awaken Ant Library" + thêm nav "Trợ lý AI" + Lucide icons
- ✅ Sửa `router.tsx`: Thêm route `/admin/holds`, `/chat`

#### Phase 3: Admin Pages
- ✅ Sửa `DashboardPage.tsx`: Thêm "Holds đang chờ" section + "Hoạt động gần đây" table
- ✅ Sửa `BookManagementPage.tsx`: field names (`totalCopies`/`availableCopies`) + nút "Bản sao" + dialog quản lý copies
- ✅ Sửa `BorrowManagementPage.tsx`: Chuyển sang borrow-slips API + expandable row xem chi tiết phiếu
- ✅ Tạo `HoldManagementPage.tsx`: Bảng holds + filter tabs + nút Xác nhận/Hủy

#### Phase 4: Student Pages
- ✅ Sửa `BookDetailPage.tsx`: Nút "Đặt mượn (Hold 24h)" + gọi holdApi + field names
- ✅ Sửa `BookCatalogPage.tsx`: Sửa field names + debounce search 300ms
- ✅ Sửa `MyBorrowsPage.tsx`: 3 Tabs (Đang đặt trước / Đang mượn / Lịch sử trả) + hủy hold
- ✅ Tạo `ChatPage.tsx`: Placeholder UI cho RAG chatbot

#### Phase 5: Shared Components & Polish
- ✅ Tạo `components/shared/Pagination.tsx`: Reusable pagination
- ✅ Tạo `components/shared/StatusBadge.tsx`: Reusable status badge
- ✅ Category management UI (CRUD): `CategoryManagementPage.tsx` + route `/admin/categories`
- ✅ Profile page: `ProfilePage.tsx` + route `/admin/profile` + menu item in dropdown
- ✅ Playwright E2E tests: 5 spec files (auth, catalog, admin-flow, book-mgmt, notifications) + playwright.config.ts + api helper + e2e/README.md
- ✅ Tách large pages thành sub-components: `BookManagementPage.tsx` → `BookFormDialog.tsx` + `CopiesDialog.tsx` (141 dòng); `MyBorrowsPage.tsx` → `HoldsTab.tsx` + `BorrowingTab.tsx` + `HistoryTab.tsx` (24 dòng)
- ✅ Audit log viewer (admin): `AuditLogViewerPage.tsx` + `AuditLogController.java` + route `/admin/audit-logs`
- ✅ Frontend Dockerfile + docker-compose service (nginx + proxy to backend)
- ✅ Responsive check + Dark mode check
- ✅ Kiểm tra full flow: 13 Playwright E2E tests đều pass (auth, catalog, admin-flow, book-mgmt, notifications)

### Tuần 11: RAG Service & Intent Classifier Setup
- ✅ Init FastAPI project (requirements, config, models, health check)
- ✅ Implement Intent Classifier (SVM + TF-IDF) với 4 intents (BOOK_SEARCH, BORROW_STATUS, HOLD_STATUS, GENERAL_CHAT)
- ✅ Ingestion script (nạp sách từ file seed / backend -> ChromaDB bằng `sentence-transformers`)
- ✅ RAG Pipeline cho tìm kiếm sách (Vector search + DeepSeek LLM)
- ✅ API Query Pipeline cho mượn/trả (gọi Spring Boot APIs bằng JWT)
- ✅ Prompt engineering cho các luồng xử lý

### Tuần 12: Orchestrator & Integration
- ✅ Chat Orchestrator (route intent -> đúng pipeline) & POST /api/chat
- ✅ Chat history support (multi-turn context)
- ✅ Spring Boot `ChatController` proxy & auto-sync vector DB khi thêm/sửa/xóa sách
- ✅ Dockerize RAG service & kết nối Docker Compose
- ✅ Frontend: Hoàn thiện `ChatPage.tsx` kết nối API thực
- ✅ Test & refine (confidence threshold, fallback khi service down, nâng cấp hiệu chuẩn Calibrated Transformer Embeddings)

---

## Tháng 4: NFC + Hoàn thiện

### Tuần 13: NFC Integration
- ✅ Lập trình ESP32 firmware đọc thẻ RC522 gửi API qua Wi-Fi (debounce 2s, format hex uppercase)
- ✅ Thiết kế & hiện thực hóa NFC database schema (users.nfc_card_uid và book_copies.nfc_tag_uid)
- ✅ REST API: POST /api/nfc/scan nhận dạng và phát sóng sự kiện quẹt thẻ (X-API-KEY secure)
- ✅ REST API: đăng ký/gán thẻ NFC cho User và Book Copy (idempotent, unique check)
- ✅ REST API tra cứu sinh viên tối thiểu cho nghiệp vụ NFC, dùng chung cho ADMIN/LIBRARIAN mà không mở quyền quản trị user
- ✅ Real-time Stream: SSE (Server-Sent Events) endpoint GET /api/nfc/stream đẩy sự kiện quẹt thẻ tới Kiosk
- ✅ Giao diện Cấp thẻ NFC cho sinh viên: tìm kiếm, chờ quét SSE, xác nhận gán/đổi thẻ ở cả admin và librarian workspace
- ✅ Viết bộ 14 unit tests cho NfcService đạt coverage tối đa
- ### Phase 4: Kiosk & RAG Chatbot (Đang tiến hành)
- [x] Tích hợp phần cứng NFC (Mô phỏng/API)
- [x] Luồng Kiosk Mượn/Trả tự động (Frontend + Backend SSE)
- [x] Cải tiến UI/UX Frontend theo định hướng "Library Editorial" (Thêm Book Cover, Sách tương tự, CSS Tokens)
- [x] Tích hợp RAG Service (FastAPI)
- [x] Giao diện Chatbot tư vấn sách

- ### Phase 5: Advanced UI/UX & Polish (Hoàn tất)
- [x] 1. Trang Duyệt Sách: Layout kiểu Apple Books (Hero Banner, Horizontal Carousels theo phân loại/mới nhất, hiệu ứng Hover)
- [x] 2. Trang Chi tiết Sách: Glassmorphism, Skeleton Loading, Typography trích dẫn sang trọng
- [x] 3. Quản lý Mượn/Trả: Giao diện Card-based (thẻ thư viện), Timeline/Progress Bar đếm ngược ngày hết hạn
- [x] 4. Chatbot RAG: UI "Thư ký Thư viện", trả về Mini Book Cards trong giao diện chat, hiệu ứng typing
- [x] 5. Global UI: Page Transitions (Fade-in), Glassmorphism cho header/sidebar

#### Bổ sung bắt buộc theo REQUIREMENTS.md
- ✅ Frontend: Bổ sung form "Mượn trực tiếp tại quầy" cho LIBRARIAN/ADMIN khi Kiosk NFC không hoạt động, gọi `POST /api/borrows` với `bookId` + `username` hoặc `studentId` + `copyId` tùy chọn.
- ✅ Frontend: Trên trang Quản lý Mượn/Trả, hỗ trợ thủ thư tìm/định danh sinh viên bằng username hoặc MSSV trước khi tạo lượt mượn trực tiếp.
- ✅ Frontend: Hỗ trợ chọn sách/bản sao khả dụng cho luồng mượn trực tiếp tại quầy, ưu tiên cho phép nhập/chọn `copyId` khi có NFC tag hoặc mã bản sao.
- ✅ Frontend: Hiển thị lỗi nghiệp vụ từ backend cho luồng mượn trực tiếp tại quầy: quá giới hạn mượn, đang mượn/hold trùng đầu sách, hết copy AVAILABLE.
- ✅ Frontend: Sau khi tạo mượn trực tiếp thành công, refresh danh sách phiếu mượn và hiển thị nguồn mượn `COUNTER`; nếu sinh viên có hold ACTIVE cùng đầu sách thì hệ thống auto-fulfill theo backend.

#### Chuẩn hóa kiến trúc backend
- ✅ Tách truy vấn audit log khỏi controller sang `AuditLogService`, ánh xạ entity sang `AuditLogResponse` bằng MapStruct và đồng bộ kiểu dữ liệu frontend.
- ✅ Tách truy vấn phiếu mượn khỏi `BorrowSlipController` sang `BorrowSlipService`; controller chỉ xử lý HTTP, phân quyền và chuyển tiếp tham số.
- ✅ Bổ sung unit tests cho `AuditLogService` và `BorrowSlipService`, bảo đảm controller không truy cập trực tiếp repository hoặc expose JPA entity.

#### Gộp nhiều sách vào một phiếu mượn
- ✅ Backend: Thêm `POST /api/borrow-slips` cho ADMIN/LIBRARIAN, tạo một `BorrowSlip` chứa nhiều `BorrowRecord` trong transaction atomic.
- ✅ Backend: Dùng chung core workflow với `POST /api/borrows`, khóa borrower/hold/copy bằng pessimistic lock và xử lý theo thứ tự ổn định.
- ✅ Backend: Validate đúng một borrower identifier, danh sách không rỗng/không trùng, NFC bắt buộc `copyId`, giới hạn mượn không tính trùng hold được fulfill.
- ✅ Frontend: Form tại quầy dùng danh sách chờ tối đa 5 sách, gửi một request batch và giữ danh sách khi lỗi.
- ✅ Frontend: Kiosk gửi toàn bộ sách đã quét trong một request NFC; sửa stale closure của SSE handler khi chuyển trạng thái.
- ✅ Test: Unit/controller tests, integration test PostgreSQL có rollback, và Playwright mock API cho form tại quầy + kiosk đều pass.
- ✅ Tài liệu: Cập nhật API_SPEC, BACKEND, FRONTEND, NFC và ghi nhận batch return partial-success trong ISSUES.

#### Refactor nghiệp vụ mượn và đặt trước
- ✅ Tách `BorrowPolicyService` để dùng chung giới hạn mượn/hold, loại hold đã hết hạn khỏi phép tính và không cộng hai lần item fulfill hold.
- ✅ Tách `BookHoldLifecycleService` để quản lý expire/fulfill/cancel, release copy, no-show ban và thứ tự khóa `User → BookHold → BookCopy`.
- ✅ Chuyển confirm hold khỏi `BookHoldService` sang luồng mượn; `BorrowService` expose API và delegate workflow tạo slip/record cho `BorrowSlipCreationService`, hold hết hạn vẫn commit trạng thái trước khi trả `HOLD_EXPIRED`.
- ✅ Chuyển tạo notification qua `NotificationService`, inject `Clock`, khóa return/overdue để tránh cập nhật hoặc thông báo trùng.
- ✅ Bổ sung unit tests cho policy/lifecycle/hold service, controller test mã lỗi và integration test PostgreSQL có rollback.
- ✅ Tách `BorrowSlipCreationService` sở hữu workflow tạo phiếu đơn/batch và confirm hold; giữ `BorrowService` làm facade cho API/audit cùng các luồng return/query/overdue, đồng thời tách unit test theo đúng trách nhiệm. Verification: 82 test thường pass; integration test PostgreSQL chưa chạy được vì `localhost:5432` không mở.

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
| 2026-05-20 | Phase 2-4 FE: Layout branding + Lucide icons, routes /admin/holds + /chat, Dashboard (holds pending + recent), Book copies dialog, BorrowSlip expandable table, HoldManagementPage, BookDetail (hold 24h), BookCatalog (debounce), MyBorrows (3 tabs), ChatPage placeholder |
| 2026-05-21 | Phase 5 FE: Shared components (Pagination, StatusBadge), CategoryManagementPage (CRUD), ProfilePage, route + nav items, Playwright E2E (5 specs + config + api helper), test:e2e script in package.json, PROGRESS.md update |
| 2026-05-21 | Phase 5 FE (tiếp): Refactor BookManagementPage → BookFormDialog + CopiesDialog (141 dòng), MyBorrowsPage → HoldsTab + BorrowingTab + HistoryTab (24 dòng), AuditLogViewerPage + AuditLogController backend, Frontend Dockerfile + nginx.conf + docker-compose frontend service |
| 2026-05-24 | Phase 5 hoàn tất: Fix Playwright strict mode + backend connection lỗi, all 13 tests pass, thêm e2e/README.md, update PROGRESS.md |
| 2026-05-28 | Phase 2.5: Nâng cấp bộ phân loại ý định (Intent Classifier) lên mô hình ngữ nghĩa Calibrated SentenceTransformer (MiniLM) + SVM (LinearSVC). Tích hợp hiệu chuẩn xác suất (Platt Scaling) qua `CalibratedClassifierCV` giúp kiểm soát tốt độ tự tin (>0.75 cho BOOK_SEARCH và ~0.58 cho BORROW_STATUS), điều chỉnh threshold orchestrator về 0.5. Copy inject và khởi chạy an toàn trong Docker container, viết tài liệu chi tiết. |
| 2026-05-30 | Chuẩn hóa CSDL tác giả sang quan hệ Many-to-Many (V13): Tạo bảng `authors` & `book_authors`, cập nhật JPA Entities, DTOs, Mappers (MapStruct) tương thích ngược. Cải tiến script `extract_books.py` ánh xạ `author_id` sang tên tác giả thực từ `goodreads_book_authors.json.gz`, giải quyết trùng lặp mã ISBN và mở rộng quy mô lên **15.000 đầu sách độc bản**. Đang chạy tiến trình seeding toàn bộ 15.000 sách và cập nhật chi tiết tài liệu [README_SEED_DATA.md](file:///d:/ant/scripts/README_SEED_DATA.md) về kiến trúc pipeline. |
| 2026-06-02 | NFC Backend & SSE Integration: Hiện thực hóa thành công các APIs NFC (`POST /api/nfc/scan` bảo mật bằng API Key tĩnh, `GET /api/nfc/stream` cho Server-Sent Events, `POST /api/nfc/register-**` gán thẻ cho Sinh viên & Bản sao sách vật lý). Xây dựng bộ 14 unit test bao phủ toàn bộ các kịch bản của `NfcService` đạt coverage tối đa. Kiểm thử biên dịch (`mvn clean test`) thành công 100%. |
| 2026-06-02 | Cải tiến UI/UX Frontend: Áp dụng phong cách "Library Editorial" (Thêm Book Cover, Sách tương tự, CSS Tokens với màu parchment và font Playfair Display). Chuyển đổi Layout trang Chi tiết Sách thành 2 cột với API `/api/books/{id}/similar` backend hỗ trợ. |
| 2026-06-02 | Sửa lỗi build frontend: Chuyển các model/types import sang type-only import (`import type`) để tương thích với cấu hình `verbatimModuleSyntax` của TypeScript trong `tsconfig.json`. |
| 2026-06-02 | Sửa lỗi container backend: Bổ sung lớp `JacksonConfig` để khởi tạo Bean `@Primary ObjectMapper`. Khắc phục triệt để lỗi `UnsatisfiedDependencyException` của `NfcService` khi chạy trong môi trường Spring Boot Container. |
| 2026-06-02 | NFC firmware: Bổ sung header `X-API-KEY` khi ESP32 gửi `POST /api/nfc/scan`, khớp với cơ chế bảo vệ API key tĩnh ở Spring Boot. |
| 2026-06-02 | Frontend UI/UX polish review fixes: Thêm server-side status filters cho `/borrows/my` và `/holds/my`, sửa My Borrows tabs để không filter sai theo page, bổ sung texture asset local, bỏ CTA carousel chưa có hành động và cập nhật API spec. |
| 2026-06-02 | Sửa lỗi ảnh bìa sách: `BookSeedDto` nhận alias `cover_image_url`/`publish_year`, script seed xuất camelCase chuẩn API, `SeedImportService` backfill metadata thiếu khi gặp ISBN trùng và frontend dùng `BookCover` fallback khi URL ảnh lỗi. |
| 2026-06-02 | Rebuild/start backend bằng Docker và chạy lại seed import 15.000 sách. Kết quả DB: 21.430 đầu sách, 15.000 sách có `cover_image_url`; các bản còn thiếu cover là dữ liệu cũ/không có ISBN để match backfill an toàn. |
| 2026-06-02 | Seed import idempotency: Backend dedup ISBN-less seed rows by normalized title + author set, seed scripts report/filter null-ISBN duplicates, Docker backend rebuilt, cleanup old duplicate rows. DB final: 15.000 books, 15.000 with cover, 45.000 copies; repeat import returns Imported: 0. |
| 2026-06-04 | Hoàn thiện checklist REQUIREMENTS.md cho mượn trực tiếp tại quầy: thêm form admin `DirectBorrowForm`, định danh sinh viên bằng username/MSSV, tìm/chọn sách và copy AVAILABLE hoặc nhập copyId, hiển thị lỗi nghiệp vụ backend, refresh borrow slips sau success và chuẩn hóa `BorrowRequest.source` để direct counter borrow luôn hiển thị `COUNTER`. |
| 2026-06-05 | Thêm và chạy Playwright E2E cho luồng mượn trực tiếp tại quầy: tạo student/book qua API, thao tác form admin, xác nhận borrow slip nguồn `COUNTER` và kiểm tra lỗi backend khi sinh viên mượn trùng đầu sách. Đồng bộ `source` optional cho confirm hold để đổi copy tại quầy mặc định vẫn là `COUNTER`. |
| 2026-06-05 | Thiết kế lại frontend theo 3 role: tách workspace `/admin` và `/librarian`, thêm `StaffLayout` dùng chung theo cấu hình role, ẩn navigation/action ADMIN-only khỏi thủ thư, cập nhật redirect root theo role và bổ sung Playwright spec cho phân quyền giao diện. Static verification: `npm run build` và targeted ESLint pass; Playwright runtime chờ backend/Docker chạy lại. |
| 2026-06-05 | Sửa font hiển thị tiếng Việt ở trang Khám phá và Thư ký Ant: bỏ `font-heading`/`font-serif` khỏi hai page này để dùng lại font sans mặc định, tránh lỗi dấu tiếng Việt trên Playfair/serif. Verification: targeted ESLint và `npm run build` pass. |
| 2026-06-07 | Sửa carousel theo danh mục ở trang Khám phá: xử lý trường hợp các category đầu không có sách bằng cách scan nhiều category hơn, chỉ render tối đa 6 carousel có dữ liệu; đổi Redis cache sang typed Jackson serializer theo từng DTO và prefix `library:v2:` để tránh đọc nhầm cache format cũ, giữ `CacheErrorHandler` làm fallback an toàn. Verification: targeted ESLint, `npm run build`, `mvn test`, Docker rebuild backend/frontend và Playwright smoke `/browse` đều pass. |
| 2026-06-08 | NFC firmware: khai báo explicit các chân SPI RC522 (`SCK=18`, `MISO=19`, `MOSI=23`, `SS=5`, `RST=22`) và gọi `SPI.begin(...)` với đầy đủ pin để người dùng đấu dây dễ kiểm tra. Verification: chưa chạy `pio run` vì PlatformIO CLI chưa có trong PATH. |
| 2026-06-10 | Bổ sung workflow gán NFC tag trên giao diện quản lý bản sao cho ADMIN/LIBRARIAN: nút Gán/Đổi tag, trạng thái kết nối/chờ quét SSE, chỉ nhận tag `UNKNOWN`, xác nhận trước khi gọi `/api/nfc/register-book-copy`, hỗ trợ quét lại/hủy/kết nối lại; sửa dialog responsive để panel quét và bảng thao tác không tràn mép. Thêm Playwright mock EventSource ở viewport hẹp, không ghi dữ liệu sách/tag vào DB. Verification: targeted ESLint, `npm run build`, Playwright NFC spec và Docker smoke SSE pass. |
| 2026-06-11 | Refactor cấu hình NFC firmware: chuyển Wi-Fi, URL backend và API key khỏi `main.cpp` sang `include/secrets.h` local được Git ignore; thêm `secrets.example.h` làm template và tài liệu setup. Verification: PlatformIO `run` cho `esp32dev` thành công. |
| 2026-06-11 | Gộp nhiều sách vào một phiếu mượn: thêm `POST /api/borrow-slips` atomic, dùng chung workflow với API một cuốn, khóa borrower/hold/copy, cập nhật form tại quầy và kiosk gửi batch; bổ sung unit/controller/integration rollback/Playwright mock tests và tài liệu liên quan. |
| 2026-06-11 | Refactor mượn/đặt trước: tách policy và hold lifecycle, gom tạo notification vào `NotificationService`, chuyển confirm hold sang `BorrowService`, chuẩn hóa `Clock` và pessimistic lock cho expire/return/overdue. Sửa lỗi hold hết hạn bị rollback khi confirm và loại hold hết hạn khỏi giới hạn. Verification: 79 test thường và 3 integration test PostgreSQL pass. |
| 2026-06-10 | Chuẩn hóa phân lớp backend cho audit log và borrow slip: controller không còn truy cập repository/JPA entity trực tiếp; bổ sung service, `AuditLogResponse`, MapStruct mapper, unit tests và đồng bộ contract audit log ở frontend/API spec. Verification: backend 53 tests pass, frontend production build pass. |
| 2026-06-13 | Bổ sung cấp thẻ NFC sinh viên theo đúng phân quyền: thêm `GET /api/nfc/students` trả DTO tối thiểu cho ADMIN/LIBRARIAN, chỉ cho gán thẻ vào tài khoản STUDENT, thêm route `/admin/nfc-cards` và `/librarian/nfc-cards`, luồng chờ quét SSE/xác nhận gán hoặc đổi thẻ, cùng unit/controller/Playwright mock tests không ghi tag vào DB. |
| 2026-06-14 | UI/UX Audit & Fix toàn hệ thống: (1) Xóa `font-heading` khỏi CardTitle/DialogTitle/SheetTitle (Shadcn primitives), thay emoji bằng lucide icons trong ThemeToggle/NotificationBell với aria-label. (2) Tạo shared `errorMessages.ts` mapping 12+ backend error patterns → thông báo tiếng Việt thân thiện. (3) Refactor KioskPage 996→580 dòng: tách 10 sub-components + 2 hooks (`useKioskAudio`, `useKioskSSE`) + module types, xóa 17× `font-serif`, tokenize 60+ hex colors thành CSS custom properties `--kiosk-*`, sửa copywriting kỹ thuật (ẩn UID/raw status, thay thuật ngữ DB). (4) DirectBorrowForm: thay thuật ngữ backend (Copy ID, COUNTER, AVAILABLE, hold ACTIVE, fulfill) bằng ngôn ngữ nghiệp vụ thư viện. Verification: `npx vite build` pass, sweep sạch font-serif/font-heading/emoji. |
| 2026-06-15 | Sửa chatbot tra cứu đặt trước dùng sai contract: thay `PENDING/READY` bằng `ACTIVE/FULFILLED/CANCELED/EXPIRED`, bỏ luồng chờ thủ thư duyệt không tồn tại, hiển thị hạn nhận và lịch sử hold, bổ sung unit test cho mapping trạng thái. |
| 2026-06-15 | Chuyển RAG chatbot hoàn toàn sang DeepSeek `deepseek-v4-flash`: non-thinking mode, giới hạn output, lỗi thân thiện cho hết số dư/rate limit, health endpoint và loại bỏ SDK/cấu hình Gemini. Verification: 8 RAG tests pass và API thật trả phản hồi thành công. |
| 2026-06-16 | Sửa chatbot multi-turn context và lệch giờ hold: RAG nhận cả `chatHistory`/`chat_history`, rewrite câu hỏi nối tiếp như "sách này..." theo tên sách gần nhất trong lịch sử trước classifier/vector search, lookup chính xác title cho follow-up chi tiết và trả lời tác giả trực tiếp từ metadata; frontend giới hạn 10 message history; backend dùng timezone `Asia/Ho_Chi_Minh` cho Clock/Jackson/Hibernate và RAG formatter convert ISO offset về UTC+7. Verification: RAG tests, backend TimeConfig test và targeted ESLint ChatPage pass. |
| 2026-06-16 | Sửa đồng bộ sách mới vào vector DB: backend chuyển từ full `/api/ingest` mỗi lần thêm/sửa/xóa sang `RagBookSyncService` gọi `POST/DELETE /api/ingest/books/{bookId}` sau transaction commit; RAG full ingest thêm `ORDER BY b.id` và prune vector `book_*` không còn trong PostgreSQL. Verification: cuốn test NFC `Tiếng Nhật công nghệ thông tin trong ngành phần mềm` đã xuất hiện trong ChromaDB sau full ingest; sẽ rebuild image backend/RAG để dùng cơ chế incremental mới. |
| 2026-06-17 | Sửa link chi tiết sách trong chatbot: backend `ChatResponse` nhận alias snake_case từ RAG (`source_books`, `book_id`, `relevance_score`) để không mất `sourceBooks` khi proxy sang frontend; ChatPage hiển thị rõ CTA `Xem chi tiết` và hỗ trợ keyboard trên card sách liên quan. Verification: `ChatResponseTest` pass, frontend `npm run build` pass. |
| 2026-06-17 | Cải thiện output chatbot: prompt tìm sách giới hạn tối đa 3 gợi ý, tăng DeepSeek `LLM_MAX_TOKENS` mặc định lên 1200 và dọn dấu Markdown/emphasis để tránh lộ `*`; backend batch enrich `sourceBooks.coverImageUrl` từ PostgreSQL, ChromaDB chỉ giữ metadata retrieval và ChatPage render trực tiếp response backend. Verification: targeted RAG tests, `ChatResponseTest`, frontend build, Docker rebuild backend/RAG và browser smoke pass. |
| 2026-06-17 | Cải thiện retrieval chatbot bằng hybrid search: RAG service thêm bước lookup lexical từ PostgreSQL theo title/author/category/description đã normalize trước khi merge với ChromaDB semantic search, dedupe theo `book_id` và thêm prompt guard để không phủ định sách đã match rõ. Fix case `lego chima`/`tracey west` bị vector search trả nhầm sách liên quan đến "chim". Verification: targeted RAG tests pass. |
| 2026-06-17 | Refactor context/retrieval chatbot theo hướng tổng quát: sửa phát hiện đại từ theo ranh giới từ để `nó` không match nhầm trong `nói`, đổi lexical lookup từ AND tất cả token sang lấy candidate rộng rồi rank/filter theo title/author/category/description. Verification: targeted RAG/context tests pass. |
| 2026-06-18 | Siết relevance cho source books của chatbot: lexical multi-token phải match theo cụm hoặc trong cùng field, tránh ghép chéo title/category kiểu `thiên` + `văn học`; Chroma fallback lọc vector match yếu trước khi trả `source_books`. Verification: RAG tests pass, Docker RAG smoke query `thiên văn học` không còn trả 5 card lexical sai. |
| 2026-06-17 | Redesign ChatPage thành assistant workspace rộng rãi: bỏ `max-w-4xl` container constraint, thêm Welcome landing state với grid prompt cards, chuyển source book cards từ horizontal scroll sang responsive 2-col grid (xóa overflow-x), input bar pin ở bottom, message bubble rộng hơn (85-90%) với break-words cho text dài, quick prompts dạng chip dưới input bar. Tuân thủ design system tokens, không emoji, không font-serif. Verification: `npx vite build` pass. |
| 2026-06-20 | Thêm phân trang cho quản lý danh mục: backend bổ sung `GET /api/categories/page` trả `PageResponse<CategoryResponse>` sắp xếp theo tên, frontend `CategoryManagementPage` chuyển sang tải 20 danh mục/trang và giữ `/api/categories` full list cho form/dropdown hiện có. Verification: `npm run build`, `mvn test`, `git diff --check` pass. |
| 2026-06-21 | Tighten STUDENT/staff boundaries: require studentId for STUDENT accounts, keep staff catalog read-only, guard student personal routes, and reject holds/chat/my-borrow plus borrow borrowers that are not STUDENT. Verification: `mvn test`, `npm run build`, targeted ESLint for changed frontend files, targeted Playwright role-navigation spec, and `git diff --check` pass. Full `npm run lint` still has pre-existing lint debt outside this scope. |
| 2026-06-23 | Bổ sung quyền vận hành cho ADMIN mở khóa đặt mượn: expose `holdBanUntil` trong `UserResponse`, thêm `DELETE /api/users/{id}/hold-ban` idempotent có audit, và trang quản lý người dùng hiển thị/nút mở khóa cho sinh viên đang bị ban. Verification: `mvn test`, frontend build, targeted ESLint, Docker rebuild backend/frontend. |
| 2026-06-23 | Bổ sung test coverage phục vụ mục kiểm thử đồ án: thêm unit tests cho `BookCopyService`, `NotificationService`, `RagBookSyncService`; thêm RAG FastAPI endpoint tests cho `POST/DELETE /api/ingest/books/{bookId}` với fake data/internal key; cập nhật fixture ingestion có đủ title/author/description/categories. Verification: backend `mvn test` pass, RAG `pytest` 34 tests pass. |
