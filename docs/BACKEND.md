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
│   ├── BorrowService.java            # + BorrowSlip + BookCopy status mgmt
│   ├── UserService.java
│   ├── NotificationService.java
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
   - ADMIN only: DELETE /api/books/**, CRUD /api/categories/**, CRUD /api/users/**, POST /api/admin/seed (batch seed data)
   - ADMIN/LIBRARIAN: POST /api/borrows
   - Authenticated: GET /api/borrows/my, POST /api/chat (gửi câu hỏi cho AI Chatbot proxy)
   - ADMIN/LIBRARIAN: PUT /api/borrows/{id}/return, GET /api/borrows, GET /api/borrows/overdue
```

## Hold + Borrow Flow (V11)

```
1. Student request: POST /api/holds { bookId: 1 }

2. BookHoldService.createHold():
   a. Check hold ban window (no-show)
   b. Check borrow limit (active borrows + holds <= 5)
   c. Check not already borrowing/holding this book
   d. Find AVAILABLE copy (SELECT FOR UPDATE → pessimistic lock)
   e. Set copy.status = RESERVED
   f. Create BookHold { user, copy, reservedAt, expiresAt=now+24h, status=ACTIVE }
   g. Send notification

3. Confirm borrow: PUT /api/holds/{id}/confirm
   a. Librarian can confirm manually or with NFC copyId
   b. If copyId provided and same book, swap reserved copy → requested copy
   c. Set copy.status = BORROWED
   d. Create BorrowSlip { user, librarian, borrowDate, dueDate, source }
   e. Create BorrowRecord { copy, slip, status=BORROWING }
   f. Mark hold FULFILLED + send notification

4. Direct borrow at counter (no hold): POST /api/borrows
   a. Librarian provides borrower identifier (username or studentId)
   b. Optional NFC copyId to select a specific copy
   c. If borrower has active hold for the same book, auto-fulfill it
   d. Otherwise, pick any AVAILABLE copy and proceed with borrow

5. Return: PUT /api/borrows/{id}/return
   a. Set record.status = RETURNED, record.returnDate = now
   b. Set copy.status = AVAILABLE
   c. Send notification

6. Overdue check (@Scheduled daily 00:00):
   a. Find records WHERE status=BORROWING AND slip.dueDate < NOW()
   b. Set record.status = OVERDUE
   c. Send notification

7. Hold expiry (@Scheduled every 30 min):
   a. Find holds WHERE status=ACTIVE AND expiresAt < NOW()
   b. Set hold.status = EXPIRED, release copy to AVAILABLE
   c. Set user.holdBanUntil = now + 7 days
   d. Send notification
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
- Python RAG service sẽ trích xuất JWT để lấy ID sinh viên phục vụ việc tra cứu thông tin cá nhân (như sách đang mượn/chờ mượn) hoặc thực hiện truy vấn thông tin sách trong cơ sở dữ liệu vector ChromaDB, sau đó dùng Gemini để tạo ra phản hồi thân thiện.
- **Fallback Cơ Chế**: Nếu RAG service gặp sự cố hoặc offline, Spring Boot sẽ bắt lỗi `Exception` và áp dụng chế độ Fallback, trả về một câu trả lời thân thiện được định nghĩa sẵn để tránh làm gián đoạn trải nghiệm người dùng.

### 2. Auto-ingest khi thêm/sửa sách (Bất đồng bộ)
- Nhằm giữ cho Vector Database (ChromaDB) luôn khớp với dữ liệu thực tế trong Postgres, `BookService` được trang bị khả năng tự động cập nhật.
- Mỗi khi có sự thay đổi về sách (Thêm sách mới, Sửa thông tin sách, Xóa sách):
  - `BookService` gọi phương thức `triggerReIngest()`.
  - Phương thức này được gắn annotation `@Async` (kích hoạt qua `@EnableAsync` trong `DemoApplication`) để chạy bất đồng bộ trên một thread riêng, hoàn toàn không gây chậm trễ cho HTTP thread của người dùng.
  - `@Async triggerReIngest()` gửi một HTTP POST request nhanh tới endpoint `/api/ingest` của Python RAG service kèm header bảo mật nội bộ `X-Internal-Key`.
  - Python RAG service khi nhận tín hiệu sẽ tự động đọc lại các sách mới/sửa đổi từ Postgres và đồng bộ hóa tức thì vào ChromaDB.

## Notes
- Admin account tự động tạo qua DataInitializer (username/password từ application.yml)
- Due date mặc định 14 ngày, max borrows 5, configurable trong application.yml
- Full-text search: tsvector + GIN index, Vietnamese text config, unaccent, weighted ranking (title > author > description)
- Overdue scheduler chạy 00:00 mỗi ngày, tự động chuyển BORROWING → OVERDUE
