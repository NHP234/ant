# Backend Architecture - SpringBoot

> Trọng tâm kỹ thuật của đồ án. File này mô tả chi tiết kiến trúc, patterns, và quyết định thiết kế.

## Tech Stack

- Spring Boot 3.x
- Java 17+
- Spring Security + JWT
- Spring Data JPA + PostgreSQL
- Spring Cache + Redis
- Elasticsearch
- Spring AOP
- MapStruct
- Flyway
- Swagger/OpenAPI 3
- JUnit 5 + Mockito + TestContainers

## Package Structure

```
com.library/
├── LibraryApplication.java          # Main class
├── config/
│   ├── SecurityConfig.java          # Spring Security config
│   ├── JwtConfig.java               # JWT settings
│   ├── RedisConfig.java             # Redis cache config
│   ├── ElasticsearchConfig.java     # ES client config
│   ├── SwaggerConfig.java           # OpenAPI config
│   └── CorsConfig.java              # CORS settings
├── controller/
│   ├── AuthController.java          # Login, Register, Refresh token
│   ├── BookController.java          # Book CRUD
│   ├── CategoryController.java      # Category CRUD
│   ├── BorrowController.java        # Borrow/Return operations
│   ├── UserController.java          # User management
│   ├── SearchController.java        # Elasticsearch search
│   ├── ChatController.java          # RAG proxy
│   ├── NotificationController.java  # User notifications
│   └── DashboardController.java     # Statistics
├── service/
│   ├── AuthService.java
│   ├── BookService.java
│   ├── CategoryService.java
│   ├── BorrowService.java
│   ├── UserService.java
│   ├── SearchService.java
│   ├── ChatService.java             # Calls RAG FastAPI
│   ├── NotificationService.java
│   ├── DashboardService.java
│   └── NfcService.java
├── repository/
│   ├── BookRepository.java
│   ├── CategoryRepository.java
│   ├── BorrowRecordRepository.java
│   ├── UserRepository.java
│   └── NotificationRepository.java
├── model/
│   ├── entity/
│   │   ├── User.java
│   │   ├── Book.java
│   │   ├── Category.java
│   │   ├── BorrowRecord.java
│   │   ├── Notification.java
│   │   └── AuditLog.java
│   └── enums/
│       ├── Role.java                # ADMIN, LIBRARIAN, STUDENT
│       ├── BorrowStatus.java        # BORROWING, RETURNED, OVERDUE
│       └── NotificationType.java    # OVERDUE_WARNING, BORROW_CONFIRM, etc.
├── dto/
│   ├── request/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── BookCreateRequest.java
│   │   ├── BookUpdateRequest.java
│   │   ├── BorrowRequest.java
│   │   └── ChatRequest.java
│   └── response/
│       ├── AuthResponse.java        # JWT + Refresh token
│       ├── BookResponse.java
│       ├── BorrowRecordResponse.java
│       ├── UserResponse.java
│       ├── DashboardResponse.java
│       ├── ChatResponse.java
│       └── PageResponse.java        # Generic paginated response
├── mapper/
│   ├── BookMapper.java              # MapStruct: Entity <-> DTO
│   ├── UserMapper.java
│   └── BorrowRecordMapper.java
├── security/
│   ├── JwtTokenProvider.java        # Generate/validate JWT
│   ├── JwtAuthenticationFilter.java # OncePerRequestFilter
│   └── CustomUserDetailsService.java
├── exception/
│   ├── GlobalExceptionHandler.java  # @ControllerAdvice
│   ├── ResourceNotFoundException.java
│   ├── BookNotAvailableException.java
│   ├── BorrowLimitExceededException.java
│   ├── InvalidTokenException.java
│   └── ErrorResponse.java          # Standard error format
├── aspect/
│   └── AuditLogAspect.java         # AOP: log borrow/return actions
├── scheduler/
│   └── OverdueCheckScheduler.java   # @Scheduled: check overdue daily
└── util/
    └── Constants.java               # Max borrow limit, due days, etc.
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

### 3. Service Layer Pattern
- Business logic tập trung ở Service
- Controller chỉ handle HTTP, delegate cho Service
- Service gọi Repository

### 4. Global Exception Handling
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    // Trả về format thống nhất cho mọi lỗi
    // { timestamp, status, error, message, path }
}
```

### 5. AOP Cross-cutting Concerns
- Audit logging: tự động log khi mượn/trả sách
- Không cần viết log thủ công trong service

### 6. Builder Pattern
- Dùng Lombok @Builder cho DTOs

## Security Flow

```
1. POST /api/auth/login (username, password)
   -> Validate credentials
   -> Generate JWT (15min) + Refresh Token (7 days)
   -> Return tokens

2. Mỗi request kèm header: Authorization: Bearer <JWT>
   -> JwtAuthenticationFilter intercept
   -> Validate token
   -> Set SecurityContext
   -> @PreAuthorize check role

3. JWT hết hạn:
   -> POST /api/auth/refresh (refreshToken)
   -> Generate new JWT
```

## Caching Strategy

```
Cache key                    | TTL    | Invalidation
-----------------------------|--------|---------------------------
books:popular                | 1h     | Khi có mượn/trả mới
dashboard:stats              | 30min  | Khi có thay đổi data
books:detail:{id}            | 15min  | Khi update/delete book
categories:all               | 1h     | Khi CRUD category
```

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
  "error": {
    "code": "BOOK_NOT_AVAILABLE",
    "message": "This book is currently not available for borrowing"
  },
  "timestamp": "2026-03-04T10:00:00Z"
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

## Notes & TODO
- (Cập nhật khi phát triển)
