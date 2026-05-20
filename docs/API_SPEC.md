# API Specification

> Danh sách REST API endpoints. Base URL: `http://localhost:8080/api`

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | Public | Đăng ký tài khoản STUDENT |
| POST | /auth/login | Public | Đăng nhập, nhận JWT + Refresh Token |
| POST | /auth/refresh | Public | Refresh JWT token |

### POST /auth/register
```json
// Request
{ "username": "student01", "password": "Pass@123", "email": "student01@example.com", "fullName": "Nguyen Van A", "studentId": "20200001" }

// Response 201
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "abc...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": { "id": 1, "username": "student01", "email": "student01@example.com", "fullName": "Nguyen Van A", "role": "STUDENT" }
  },
  "message": "Registration successful"
}
```

### POST /auth/login
```json
// Request
{ "username": "student01", "password": "Pass@123" }

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "abc...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": { "id": 1, "username": "student01", "email": "student01@example.com", "fullName": "Nguyen Van A", "role": "STUDENT" }
  }
}
```

### POST /auth/refresh
```json
// Request
{ "refreshToken": "abc..." }

// Response 200
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "def...", "tokenType": "Bearer", "expiresIn": 900, "user": { ... } } }
```

---

## Books

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /books | Public | Danh sách sách (paginated, sorted) |
| GET | /books/search?q=keyword | Public | Full-text search (PostgreSQL tsvector) |
| GET | /books/{id} | Public | Chi tiết sách |
| POST | /books | ADMIN/LIBRARIAN | Thêm sách mới (tự động tạo N book_copies) |
| PUT | /books/{id} | ADMIN/LIBRARIAN | Cập nhật sách |
| DELETE | /books/{id} | ADMIN | Xóa sách |

### GET /books?page=0&size=20&sort=title,asc
```json
// Response 200
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "isbn": "978-0132350884",
        "publisher": "Prentice Hall",
        "publishYear": 2008,
        "description": "A handbook of agile software craftsmanship...",
        "totalCopies": 3,
        "availableCopies": 2,
        "coverImageUrl": null,
        "categories": [{ "id": 1, "name": "CNTT", "description": null }],
        "createdAt": "2026-03-04T00:00:00",
        "updatedAt": "2026-03-04T00:00:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8,
    "last": false
  }
}
```

### POST /books
```json
// Request
{ "title": "Clean Code", "author": "Robert C. Martin", "isbn": "978-0132350884", "publisher": "Prentice Hall", "publishYear": 2008, "description": "...", "quantity": 3, "coverImageUrl": null, "categoryIds": [1] }

// Response 201
{ "success": true, "data": { "id": 1, "title": "Clean Code", ..., "totalCopies": 3, "availableCopies": 3 }, "message": "Book created successfully" }
```

---

## Book Copies (V9)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /books/{bookId}/copies | ADMIN/LIBRARIAN | Danh sách bản sao vật lý của đầu sách |
| POST | /books/{bookId}/copies?nfcTagUid= | ADMIN/LIBRARIAN | Thêm bản sao mới (có thể kèm NFC tag) |
| PUT | /books/{bookId}/copies/{copyId}?nfcTagUid=&status=&conditionNote= | ADMIN/LIBRARIAN | Cập nhật bản sao (NFC, status, ghi chú) |
| DELETE | /books/{bookId}/copies/{copyId} | ADMIN/LIBRARIAN | Xóa bản sao |

### GET /books/{bookId}/copies
```json
// Response 200
{
  "success": true,
  "data": [
    { "id": 1, "bookId": 1, "copyNumber": 1, "nfcTagUid": "AA:BB:CC", "status": "AVAILABLE", "conditionNote": null, "createdAt": "2026-03-04T00:00:00" },
    { "id": 2, "bookId": 1, "copyNumber": 2, "nfcTagUid": null, "status": "BORROWED", "conditionNote": null, "createdAt": "2026-03-04T00:00:00" }
  ]
}
```

---

## Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /categories | Public | Danh sách categories |
| GET | /categories/{id} | Public | Chi tiết category |
| POST | /categories | ADMIN | Thêm category |
| PUT | /categories/{id} | ADMIN | Cập nhật category |
| DELETE | /categories/{id} | ADMIN | Xóa category |

### POST /categories
```json
// Request
{ "name": "Khoa học máy tính", "description": "Sách về khoa học máy tính" }

// Response 201
{ "success": true, "data": { "id": 9, "name": "Khoa học máy tính", "description": "Sách về khoa học máy tính" }, "message": "Category created successfully" }
```

---

## Borrow Records

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /borrows | ADMIN/LIBRARIAN | Mượn sách tại quầy (direct borrow, auto-fulfill hold nếu có) |
| PUT | /borrows/{id}/return?note= | LIBRARIAN/ADMIN | Trả sách |
| GET | /borrows/my | User | Lịch sử mượn của user hiện tại |
| GET | /borrows | LIBRARIAN/ADMIN | Tất cả borrow records |
| GET | /borrows/overdue | LIBRARIAN/ADMIN | Sách quá hạn |

### POST /borrows
```json
// Request
{ "bookId": 15, "username": "student01", "copyId": 123 }

// Response 201
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "userFullName": "Nguyen Van A",
    "bookId": 15,
    "bookTitle": "Clean Code",
    "bookAuthor": "Robert C. Martin",
    "copyId": 1,
    "copyNumber": 2,
    "borrowDate": "2026-05-18T10:00:00",
    "dueDate": "2026-06-01T10:00:00",
    "returnDate": null,
    "status": "BORROWING",
    "note": null,
    "createdAt": "2026-05-18T10:00:00"
  },
  "message": "Book borrowed successfully"
}
```

> **Lưu ý**: `username` hoặc `studentId` là bắt buộc (chỉ chọn 1). `copyId` optional — nếu có hold ACTIVE cho cùng đầu sách, hệ thống tự động fulfill hold.

---

## Borrow Slips (V9)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /borrow-slips/my | User | Phiếu mượn của user hiện tại |
| GET | /borrow-slips | LIBRARIAN/ADMIN | Tất cả phiếu mượn |
| GET | /borrow-slips/{id} | User | Chi tiết phiếu mượn (kèm danh sách records) |

### GET /borrow-slips/{id}
```json
// Response 200
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "userFullName": "Nguyen Van A",
    "librarianName": "Tran Thi B",
    "borrowDate": "2026-05-18T10:00:00",
    "dueDate": "2026-06-01T10:00:00",
    "note": null,
    "source": "COUNTER",
    "records": [
      {
        "id": 1,
        "userId": 1,
        "userFullName": "Nguyen Van A",
        "bookId": 15,
        "bookTitle": "Clean Code",
        "bookAuthor": "Robert C. Martin",
        "copyId": 1,
        "copyNumber": 2,
        "borrowDate": "2026-05-18T10:00:00",
        "dueDate": "2026-06-01T10:00:00",
        "returnDate": null,
        "status": "BORROWING",
        "note": null,
        "createdAt": "2026-05-18T10:00:00"
      }
    ],
    "createdAt": "2026-05-18T10:00:00"
  }
}
```

---

## Holds (Đặt mượn)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /holds | User | Đặt mượn (giữ chỗ 24h nếu còn copy AVAILABLE) |
| GET | /holds/my | User | Danh sách hold của user hiện tại |
| GET | /holds | LIBRARIAN/ADMIN | Danh sách tất cả hold |
| GET | /holds/{id} | LIBRARIAN/ADMIN | Chi tiết hold |
| PUT | /holds/{id}/confirm | LIBRARIAN/ADMIN | Xác nhận mượn (có thể đổi copy cùng đầu sách) |
| PUT | /holds/{id}/cancel | User/LIBRARIAN/ADMIN | Hủy hold |

### POST /holds
```json
// Request
{ "bookId": 15 }

// Response 201
{
  "success": true,
  "data": {
    "id": 10,
    "userId": 1,
    "userFullName": "Nguyen Van A",
    "bookId": 15,
    "bookTitle": "Clean Code",
    "copyId": 3,
    "copyNumber": 1,
    "status": "ACTIVE",
    "reservedAt": "2026-05-16T10:00:00",
    "expiresAt": "2026-05-17T10:00:00",
    "fulfilledAt": null,
    "canceledAt": null,
    "cancelReason": null,
    "librarianName": null,
    "createdAt": "2026-05-16T10:00:00"
  },
  "message": "Hold created successfully"
}
```

### PUT /holds/{id}/confirm
```json
// Request (optional copyId if scanning NFC)
{ "copyId": 123 }

// Response 200
{ "success": true, "data": { "id": 10, "bookTitle": "Clean Code", "status": "FULFILLED", "copyId": 3, "copyNumber": 1 }, "message": "Hold confirmed" }
```

### PUT /holds/{id}/cancel
```json
// Request (optional)
{ "reason": "USER_CANCELED" }

// Response 200
{ "success": true, "data": { "id": 10, "status": "CANCELED", "cancelReason": "USER_CANCELED" }, "message": "Hold canceled" }
```

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /users/me | User | Thông tin user hiện tại |
| POST | /users | ADMIN | Tạo user mới (với role tùy chọn) |
| GET | /users | ADMIN | Danh sách users (paginated) |
| GET | /users/{id} | ADMIN | Chi tiết user |
| PUT | /users/{id}/role | ADMIN | Thay đổi role user |
| PUT | /users/{id}/status | ADMIN | Cập nhật trạng thái user (explicit active/inactive) |

### POST /users (ADMIN only)
```json
// Request
{ "username": "librarian01", "password": "Lib@1234", "email": "lib01@library.com", "fullName": "Tran Thi B", "studentId": null, "role": "LIBRARIAN" }

// Response 201
{ "success": true, "data": { "id": 3, "username": "librarian01", "email": "lib01@library.com", "fullName": "Tran Thi B", "role": "LIBRARIAN", "isActive": true }, "message": "User created successfully" }
```

### PUT /users/{id}/role
```json
// Request
{ "role": "LIBRARIAN" }

// Response 200
{ "success": true, "data": { "id": 2, "username": "student01", "role": "LIBRARIAN", "isActive": true }, "message": "Role updated successfully" }
```

### PUT /users/{id}/status
```json
// Request
{ "active": false }

// Response 200
{ "success": true, "data": { "id": 2, "username": "student01", "role": "STUDENT", "isActive": false }, "message": "User status updated successfully" }
```

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /notifications | User | Notifications của user (paginated) |
| GET | /notifications/unread-count | User | Số notification chưa đọc |
| PUT | /notifications/{id}/read | User | Đánh dấu đã đọc |
| PUT | /notifications/read-all | User | Đánh dấu tất cả đã đọc |

### GET /notifications?page=0&size=20
```json
// Response 200
{
  "success": true,
  "data": {
    "content": [
      { "id": 1, "title": "Xác nhận mượn sách", "message": "Bạn đã mượn sách 'Clean Code' thành công", "type": "BORROW_CONFIRM", "isRead": false, "createdAt": "2026-05-18T10:00:00" }
    ],
    "page": 0, "size": 20, "totalElements": 5, "totalPages": 1, "last": true
  }
}
```

### GET /notifications/unread-count
```json
// Response 200
{ "success": true, "data": { "unreadCount": 3 } }
```

### PUT /notifications/read-all
```json
// Response 200
{ "success": true, "data": { "markedCount": 5 }, "message": "All notifications marked as read" }
```

---

## Dashboard / Statistics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /dashboard/stats | LIBRARIAN/ADMIN | Thống kê tổng quan (cached 5 phút) |

### GET /dashboard/stats
```json
{
  "success": true,
  "data": {
    "totalBooks": 500,
    "totalUsers": 200,
    "activeBorrows": 45,
    "overdueBooks": 3,
    "totalCategories": 8
  }
}
```

---

## Error Response Format

```json
{
  "success": false,
  "timestamp": "2026-05-18T10:00:00",
  "status": 400,
  "error": "BOOK_NOT_AVAILABLE",
  "message": "This book is currently not available for borrowing",
  "path": "/api/holds"
}
```

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_CREDENTIALS | 401 | Sai username hoặc password |
| RESOURCE_NOT_FOUND | 404 | Không tìm thấy resource |
| BOOK_NOT_AVAILABLE | 400 | Sách hết, không thể mượn |
| BORROW_LIMIT_EXCEEDED | 400 | Đã mượn tối đa số sách |
| VALIDATION_ERROR | 400 | Input không hợp lệ (@Valid thất bại) |
| BAD_REQUEST | 400 | Request không hợp lệ |
| INTERNAL_ERROR | 500 | Lỗi server không xác định |
