# Backend Architecture - SpringBoot

> Trọng tâm kỹ thuật của đồ án. File này mô tả chi tiết kiến trúc, patterns, và quyết định thiết kế.

## Tech Stack

- Spring Boot 4.0.3
- Java 21
- Spring Security + JWT
- Spring Data JPA + PostgreSQL
- Spring Cache + Redis
- PostgreSQL full-text search (tsvector + unaccent + GIN index, thay Elasticsearch)
- Spring AOP
- MapStruct
- Flyway
- Swagger/OpenAPI 3
- JUnit 5 + Mockito + TestContainers

## Package Structure

```
com.example.demo/
├── DemoApplication.java               # Main class + @EnableScheduling
├── config/
│   ├── SecurityConfig.java            # Spring Security config + CORS
│   ├── CacheConfig.java              # Redis cache config + custom ObjectMapper
│   ├── OpenApiConfig.java            # Swagger/OpenAPI config
│   └── DataInitializer.java          # Admin account auto-create
├── controller/
│   ├── AuthController.java           # Login, Register, Refresh token
│   ├── BookController.java           # Book CRUD
│   ├── CategoryController.java       # Category CRUD
│   ├── BorrowController.java         # Borrow/Return operations
│   ├── UserController.java           # User management (ADMIN)
│   ├── NotificationController.java   # User notifications
│   ├── DashboardController.java      # Statistics (ADMIN/LIBRARIAN)
│   ├── AdminController.java          # Batch import & administration (ADMIN)
│   └── ChatController.java           # AI RAG Chatbot proxy (STUDENT/User)
├── service/
│   ├── AuthService.java
│   ├── BookService.java              # + auto-create BookCopies & async RAG trigger
│   ├── CategoryService.java
│   ├── BorrowService.java            # Borrow facade + return/query/overdue
│   ├── BorrowSlipCreationService.java # Atomic slip creation + confirm hold
│   ├── BorrowSlipService.java        # Borrow slip read queries
│   ├── BorrowPolicyService.java      # Borrow/hold limits and duplicate rules
│   ├── BookHoldLifecycleService.java # Hold transitions, locking and expiry
│   ├── BookHoldService.java          # Create/cancel/query hold orchestration
│   ├── UserService.java
│   ├── NotificationService.java      # Query/read state + transactional creation
│   ├── DashboardService.java
│   └── SeedImportService.java        # Batch seed data importer (ADMIN)
├── repository/
│   ├── BookRepository.java           # Full-text search
│   ├── BookCopyRepository.java       # Pessimistic lock for borrow flow
│   ├── CategoryRepository.java
│   ├── BorrowRecordRepository.java   # Overdue check via slip.dueDate
│   ├── BorrowSlipRepository.java
│   ├── UserRepository.java
│   ├── NotificationRepository.java
│   └── AuditLogRepository.java
├── model/
│   ├── entity/
│   │   ├── User.java
│   │   ├── Book.java                 # Đầu sách (metadata only)
│   │   ├── BookCopy.java             # Cuốn sách vật lý (NFC tag, status)
│   │   ├── Category.java
│   │   ├── BorrowSlip.java           # Phiếu mượn (user, dates, source)
│   │   ├── BorrowRecord.java         # Từng cuốn trong phiếu (copy, return)
│   │   ├── Notification.java
│   │   └── AuditLog.java
│   └── enums/
│       ├── Role.java                 # ADMIN, LIBRARIAN, STUDENT
│       ├── BorrowStatus.java         # BORROWING, RETURNED, OVERDUE
│       ├── CopyStatus.java           # AVAILABLE, RESERVED, BORROWED, DAMAGED, LOST
│       ├── BorrowSource.java         # COUNTER, NFC
│       └── NotificationType.java     # OVERDUE_WARNING, BORROW_CONFIRM, etc.
├── dto/
│   ├── request/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── BookCreateRequest.java    # quantity → tạo N book_copies
│   │   ├── BookUpdateRequest.java
│   │   ├── BorrowRequest.java
│   │   ├── SeedImportRequest.java    # Wrapper for book seeds batch import
│   │   ├── BookSeedDto.java          # Single book data for seeding
│   │   └── ChatRequest.java          # Chatbot question & history
│   └── response/
│       ├── ApiResponse.java          # Generic wrapper { success, data, message }
│       ├── AuthResponse.java         # JWT + Refresh token + UserInfo
│       ├── BookResponse.java         # totalCopies, availableCopies (computed)
│       ├── BookCopyResponse.java     # Copy detail (nfc, status)
│       ├── BorrowRecordResponse.java # + copyId, copyNumber, borrowDate from slip
│       ├── BorrowSlipResponse.java   # Phiếu mượn + nested records
│       ├── CategoryResponse.java
│       ├── UserResponse.java
│       ├── NotificationResponse.java
│       ├── DashboardStatsResponse.java
│       ├── PageResponse.java         # Generic paginated response
│       ├── SeedImportResponse.java   # Seed batch import statistics
│       └── ChatResponse.java         # Chatbot response + source books
├── mapper/
│   ├── BookMapper.java               # MapStruct: Book → BookResponse
│   ├── CategoryMapper.java
│   ├── UserMapper.java
│   └── BorrowRecordMapper.java       # copy.book → bookId/Title, slip → dates
├── security/
│   ├── JwtTokenProvider.java         # Generate/validate JWT
│   ├── JwtAuthenticationFilter.java  # OncePerRequestFilter
│   └── CustomUserDetailsService.java
├── exception/
│   ├── GlobalExceptionHandler.java   # @ControllerAdvice + @Slf4j logging
│   ├── ResourceNotFoundException.java
│   ├── BookNotAvailableException.java
│   └── BorrowLimitExceededException.java
├── audit/
│   ├── Auditable.java                # @Auditable annotation
│   └── AuditAspect.java             # AOP: auto log actions to audit_logs
└── scheduler/
    └── OverdueCheckScheduler.java    # @Scheduled cron: daily 00:00
```

## Design Patterns sử dụng

### 1. DTO Pattern
- Không expose JPA Entity ra ngoài controller
- Request DTO: validate input
- Response DTO: chỉ trả fields cần thiết
- MapStruct auto-generate mapping code

### 2. Repository Pattern
- Spring Data JPA repositories
- Custom queries khi cần (@Query)
- Pessimistic locking cho concurrent borrow flow

### 3. Service Layer Pattern
- Business logic tập trung ở Service
- Controller chỉ handle HTTP, delegate cho Service
- Service gọi Repository

### 4. Global Exception Handling
```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    // Trả về format thống nhất cho mọi lỗi
    // { timestamp, status, error, message, path }
    // Log stack trace chi tiết cho unexpected errors
}
```

### 5. AOP Cross-cutting Concerns
- Audit logging: `@Auditable` annotation tự động log khi mượn/trả sách
- Không cần viết log thủ công trong service

### 6. Builder Pattern
- Dùng Lombok @Builder cho DTOs và Entities

## Security Flow

```
1. POST /api/auth/login (username, password)
   → Validate credentials
   → Generate JWT (15min) + Refresh Token (7 days)
   → Return tokens + UserInfo { id, username, email, fullName, role }

2. Mỗi request kèm header: Authorization: Bearer <JWT>
   → JwtAuthenticationFilter intercept
   → Validate token
   → Set SecurityContext
   → @PreAuthorize check role

3. JWT hết hạn:
   → POST /api/auth/refresh (refreshToken)
   → Generate new JWT

4. Role-based access:
   - Public: GET /api/books/**, GET /api/categories/**
   - ADMIN/LIBRARIAN: POST/PUT /api/books/**
   - ADMIN only: DELETE /api/books/**, CRUD /api/categories/**, CRUD /api/users/**, DELETE /api/users/{id}/hold-ban, POST /api/admin/seed (batch seed data)
   - ADMIN/LIBRARIAN: POST /api/borrows, POST /api/borrow-slips cho borrower role STUDENT
   - STUDENT: POST /api/holds, GET /api/holds/my, GET /api/borrows/my, GET /api/borrow-slips/my, POST /api/chat
   - ADMIN/LIBRARIAN: PUT /api/borrows/{id}/return, GET /api/borrows, GET /api/borrows/overdue
   - ADMIN/LIBRARIAN có thể xem catalog/read-only qua frontend, nhưng không được impersonate sinh viên hoặc tạo hold/chat/my-borrows như sinh viên
```

## Hold + Borrow Flow (V11)

```
1. Student request: POST /api/holds { bookId: 1 }

2. BookHoldService.createHold():
   a. Check hold ban window (no-show)
   b. Expire stale hold for the same book before selecting a copy
   c. BorrowPolicyService checks active borrows + unexpired holds <= 5
   d. Check not already borrowing/holding this book
   e. Find AVAILABLE copy (SELECT FOR UPDATE → pessimistic lock)
   f. Set copy.status = RESERVED
   g. Create BookHold { user, copy, reservedAt, expiresAt=now+24h, status=ACTIVE }
   h. NotificationService persists the notification in the same transaction

3. Confirm borrow: PUT /api/holds/{id}/confirm
   a. BorrowSlipCreationService owns this workflow because it creates BorrowSlip/BorrowRecord
   b. Lock in order User → BookHold → BookCopy
   c. If expiresAt <= now, persist EXPIRED/release copy/apply ban, then return HOLD_EXPIRED
   d. If copyId provided and same book, swap reserved copy → requested copy
   e. Set copy.status = BORROWED and create BorrowSlip + BorrowRecord
   f. BookHoldLifecycleService marks hold FULFILLED
   g. NotificationService persists the notification in the same transaction

4. Direct borrow at counter (no hold): POST /api/borrows
   a. Librarian provides borrower identifier (username or studentId)
   b. Borrower must resolve to a user with role STUDENT
   c. Optional NFC copyId to select a specific copy
   d. If borrower has active hold for the same book, auto-fulfill it
   e. Otherwise, pick any AVAILABLE copy and proceed with borrow

5. Batch borrow at counter/kiosk: POST /api/borrow-slips
   a. Resolve exactly one borrower identifier and lock the borrower row
   b. Reject borrower accounts that are not role STUDENT
   c. Validate the full item list before creating the slip
   d. Lock active holds and copies in stable book/copy order
   e. BorrowPolicyService calculates active borrows + unexpired holds + new direct items
      (items fulfilling an existing hold are not counted twice)
   f. Create exactly one BorrowSlip and one BorrowRecord per item
   g. Update copies to BORROWED, fulfill matching holds and create notifications
   h. Any failure rolls back the whole transaction
   i. POST /api/borrows wraps one item around the same core workflow for compatibility

6. Return: PUT /api/borrows/{id}/return
   a. Lock BorrowRecord, then set status = RETURNED and returnDate = now
   b. Set copy.status = AVAILABLE
   c. Send notification

7. Overdue check (@Scheduled daily 00:00):
   a. Lock records WHERE status=BORROWING AND slip.dueDate < NOW()
   b. Set record.status = OVERDUE
   c. Send notification

8. Hold expiry (@Scheduled every 30 min):
   a. Find hold IDs WHERE status=ACTIVE AND expiresAt <= NOW(), ordered by ID
   b. Process each ID in a separate transaction
   c. Re-lock User → BookHold → BookCopy and re-check status/expiry
   d. Set hold.status = EXPIRED, release copy to AVAILABLE
   e. Set user.holdBanUntil = now + 7 days and send notifications
   f. Failure on one hold is logged without rolling back the other holds

9. Admin override:
   a. ADMIN can call DELETE /api/users/{id}/hold-ban to clear `holdBanUntil`
   b. The endpoint is idempotent and uses a pessimistic lock on the user row
   c. The operation is audited as `CLEAR_HOLD_BAN` on entity type `USER`
```

## Caching Strategy

```
Cache name           | TTL    | Invalidation
---------------------|--------|---------------------------
dashboardStats       | 5min   | Auto TTL expiry
book                 | 30min  | @CacheEvict on create/update/delete
categories           | 24h    | @CacheEvict on create/update/delete
```
Redis cache serialization:
- `categories`: typed Jackson serializer for `List<CategoryResponse>`
- `book`: typed Jackson serializer for `BookResponse`
- `dashboardStats`: typed Jackson serializer for `DashboardStatsResponse`
- Key prefix: `library:v2:` to avoid reading stale Redis values written with older serializer formats
- `CacheErrorHandler` treats Redis read/write/evict failures as non-critical: log, evict corrupted keys when possible, and fall back to source data

Category API notes:
- `GET /api/categories` vẫn trả danh sách đầy đủ và được cache 24h để phục vụ dropdown/form cần toàn bộ danh mục.
- `GET /api/categories/page?page=0&size=20` trả `PageResponse<CategoryResponse>` cho màn quản trị danh mục, tránh tải toàn bộ dữ liệu khi số lượng category lớn.

## API Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "error": "BOOK_NOT_AVAILABLE",
  "message": "This book is currently not available for borrowing",
  "status": 400,
  "path": "/api/borrows",
  "timestamp": "2026-05-15T10:00:00"
}
```

### Paginated
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8
  }
}
```

## AI Chatbot & RAG Sync Flow (V12)

### 1. AI Chatbot Proxying
- Khi người dùng gửi câu hỏi tới `POST /api/chat`, `ChatController` của Spring Boot đóng vai trò proxy bảo mật.
- Nó tự động forward request (bao gồm `ChatRequest` chứa câu hỏi và lịch sử cuộc hội thoại) kèm theo header JWT Token của người dùng (`Authorization`) sang Python RAG service (`POST /api/chat`).
- Python RAG service sẽ trích xuất JWT để lấy ID sinh viên phục vụ việc tra cứu thông tin cá nhân (như sách đang mượn/chờ mượn) hoặc thực hiện truy vấn thông tin sách trong cơ sở dữ liệu vector ChromaDB, sau đó dùng DeepSeek để tạo ra phản hồi thân thiện.
- Sau khi nhận response từ RAG, Spring Boot batch query PostgreSQL theo `sourceBooks.bookId` để bù `coverImageUrl`; ChromaDB chỉ lưu metadata phục vụ retrieval và không lưu ảnh bìa.
- **Fallback Cơ Chế**: Nếu RAG service gặp sự cố hoặc offline, Spring Boot sẽ bắt lỗi `Exception` và áp dụng chế độ Fallback, trả về một câu trả lời thân thiện được định nghĩa sẵn để tránh làm gián đoạn trải nghiệm người dùng.

### 2. Đồng bộ sách sang ChromaDB
- Nhằm giữ Vector Database (ChromaDB) khớp với dữ liệu thực tế trong Postgres, `BookService` đăng ký callback sau transaction commit rồi gọi `RagBookSyncService`.
- Khi thêm/sửa sách thành công, backend gọi nội bộ `POST /api/ingest/books/{bookId}` trên RAG service để upsert đúng một đầu sách vào ChromaDB.
- Khi xóa sách thành công, backend gọi nội bộ `DELETE /api/ingest/books/{bookId}` để xóa vector tương ứng.
- Cả hai lời gọi đều chạy qua `@Async` trong `RagBookSyncService`, dùng shared header `X-Internal-Key` và được xem là non-critical: nếu RAG service lỗi, nghiệp vụ quản lý sách vẫn không rollback.
- Endpoint `POST /api/ingest` vẫn tồn tại cho backfill/rebuild toàn bộ; sau khi upsert toàn bộ sách từ PostgreSQL, RAG service prune các vector `book_*` không còn tồn tại trong DB để tránh chatbot gợi ý sách đã xóa.

## Notes
- Student registration requires a unique `studentId`. ADMIN-created STUDENT accounts also require `studentId`; staff accounts can omit it. Changing an existing user to STUDENT is rejected until the account has a student ID.
- Application time zone is configured as `Asia/Ho_Chi_Minh` via `TimeConfig`, Jackson and Hibernate JDBC settings. Current DTO/schema still use `LocalDateTime`, so new borrow/hold timestamps are generated as Vietnam local business time instead of Docker container UTC.
- `BorrowService` giữ vai trò facade cho controller để API và audit annotation không thay đổi. Service này chuyển toàn bộ tạo phiếu, validate batch, chọn copy và fulfill hold sang `BorrowSlipCreationService`; `BorrowSlipService` chỉ phụ trách truy vấn.
- Admin account tự động tạo qua DataInitializer (username/password từ application.yml)
- Due date mặc định 14 ngày, max borrows 5, configurable trong application.yml
- Full-text search: tsvector + GIN index, Vietnamese text config, unaccent, weighted ranking (title > author > description)
- Overdue scheduler chạy 00:00 mỗi ngày, tự động chuyển BORROWING → OVERDUE
