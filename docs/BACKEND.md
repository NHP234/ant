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
│   └── DashboardController.java      # Statistics (ADMIN/LIBRARIAN)
├── service/
│   ├── AuthService.java
│   ├── BookService.java              # + auto-create BookCopies
│   ├── CategoryService.java
│   ├── BorrowService.java            # + BorrowSlip + BookCopy status mgmt
│   ├── UserService.java
│   ├── NotificationService.java
│   └── DashboardService.java
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
│       ├── CopyStatus.java           # AVAILABLE, BORROWED, DAMAGED, LOST
│       ├── BorrowSource.java         # ONLINE, NFC
│       └── NotificationType.java     # OVERDUE_WARNING, BORROW_CONFIRM, etc.
├── dto/
│   ├── request/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── BookCreateRequest.java    # quantity → tạo N book_copies
│   │   ├── BookUpdateRequest.java
│   │   └── BorrowRequest.java
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
│       └── PageResponse.java         # Generic paginated response
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
   - ADMIN only: DELETE /api/books/**, CRUD /api/categories/**, CRUD /api/users/**
   - Authenticated: POST /api/borrows, GET /api/borrows/my
   - ADMIN/LIBRARIAN: PUT /api/borrows/{id}/return, GET /api/borrows, GET /api/borrows/overdue
```

## Borrow Flow (V9 Refactored)

```
1. User request: POST /api/borrows { bookId: 1 }

2. BorrowService.borrowBook():
   a. Check borrow limit (max 5 active borrows)
   b. Check not already borrowing this book
   c. Find AVAILABLE copy (SELECT FOR UPDATE → pessimistic lock)
   d. Set copy.status = BORROWED
   e. Create BorrowSlip { user, borrowDate, dueDate, source=ONLINE }
   f. Create BorrowRecord { copy, slip, status=BORROWING }
   g. Send notification

3. Return: PUT /api/borrows/{id}/return
   a. Set record.status = RETURNED, record.returnDate = now
   b. Set copy.status = AVAILABLE
   c. Send notification

4. Overdue check (@Scheduled daily 00:00):
   a. Find records WHERE status=BORROWING AND slip.dueDate < NOW()
   b. Set record.status = OVERDUE
   c. Send notification
```

## Caching Strategy

```
Cache name           | TTL    | Invalidation
---------------------|--------|---------------------------
dashboardStats       | 5min   | Auto TTL expiry
book                 | 30min  | @CacheEvict on create/update/delete
categories           | 24h    | @CacheEvict on create/update/delete
```
> Redis serializer: `GenericJackson2JsonRedisSerializer` + custom `ObjectMapper` (JavaTimeModule, NON_FINAL type info)

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

## Notes
- Admin account tự động tạo qua DataInitializer (username/password từ application.yml)
- Due date mặc định 14 ngày, max borrows 5, configurable trong application.yml
- Full-text search: tsvector + GIN index, Vietnamese text config, unaccent, weighted ranking (title > author > description)
- Overdue scheduler chạy 00:00 mỗi ngày, tự động chuyển BORROWING → OVERDUE
