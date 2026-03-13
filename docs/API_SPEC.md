# API Specification

> Danh sách REST API endpoints. Base URL: `http://localhost:8080/api`

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | Public | Đăng ký tài khoản |
| POST | /auth/login | Public | Đăng nhập, nhận JWT + Refresh Token |
| POST | /auth/refresh | Public | Refresh JWT token |
| POST | /auth/logout | User | Logout (invalidate refresh token) |

### POST /auth/register
```json
// Request
{ "username": "student01", "password": "Pass@123", "email": "student01@example.com", "fullName": "Nguyen Van A", "studentId": "20200001" }

// Response 201
{ "success": true, "data": { "id": 1, "username": "student01", "email": "student01@example.com", "role": "STUDENT" } }
```

### POST /auth/login
```json
// Request
{ "username": "student01", "password": "Pass@123" }

// Response 200
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "abc...", "tokenType": "Bearer", "expiresIn": 900, "user": { "id": 1, "username": "student01", "role": "STUDENT" } } }
```

---

## Books

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /books | User | Danh sách sách (paginated) |
| GET | /books/{id} | User | Chi tiết sách |
| POST | /books | ADMIN/LIBRARIAN | Thêm sách mới |
| PUT | /books/{id} | ADMIN/LIBRARIAN | Cập nhật sách |
| DELETE | /books/{id} | ADMIN | Xóa sách |
| GET | /books/search?q=keyword | User | Full-text search (Elasticsearch) |

### GET /books?page=0&size=20&sort=title,asc&category=1
```json
// Response 200
{
  "success": true,
  "data": {
    "content": [
      { "id": 1, "title": "Clean Code", "author": "Robert C. Martin", "isbn": "978-0132350884", "availableQuantity": 2, "categories": ["CNTT"] }
    ],
    "page": 0, "size": 20, "totalElements": 150, "totalPages": 8
  }
}
```

---

## Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /categories | User | Danh sách categories |
| POST | /categories | ADMIN | Thêm category |
| PUT | /categories/{id} | ADMIN | Cập nhật category |
| DELETE | /categories/{id} | ADMIN | Xóa category |

---

## Borrow Records

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /borrows | User | Mượn sách |
| PUT | /borrows/{id}/return | LIBRARIAN/ADMIN | Trả sách |
| GET | /borrows/my | User | Lịch sử mượn của user hiện tại |
| GET | /borrows | LIBRARIAN/ADMIN | Tất cả borrow records |
| GET | /borrows/overdue | LIBRARIAN/ADMIN | Sách quá hạn |

### POST /borrows
```json
// Request
{ "bookId": 15 }

// Response 201
{ "success": true, "data": { "id": 1, "bookTitle": "Clean Code", "borrowDate": "2026-03-04", "dueDate": "2026-03-18", "status": "BORROWING" } }

// Error 400
{ "success": false, "error": { "code": "BORROW_LIMIT_EXCEEDED", "message": "Bạn đã mượn tối đa 5 cuốn sách" } }
```

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /users/me | User | Thông tin user hiện tại |
| PUT | /users/me | User | Cập nhật profile |
| GET | /users | ADMIN | Danh sách users |
| PUT | /users/{id}/role | ADMIN | Thay đổi role user |
| PUT | /users/{id}/status | ADMIN | Activate/deactivate user |

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /notifications | User | Notifications của user |
| PUT | /notifications/{id}/read | User | Đánh dấu đã đọc |
| PUT | /notifications/read-all | User | Đánh dấu tất cả đã đọc |
| GET | /notifications/unread-count | User | Số notification chưa đọc |

---

## Dashboard / Statistics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /dashboard/stats | LIBRARIAN/ADMIN | Thống kê tổng quan |
| GET | /dashboard/popular-books | User | Top sách phổ biến |
| GET | /dashboard/recent-activities | LIBRARIAN/ADMIN | Hoạt động gần đây |

### GET /dashboard/stats
```json
{
  "success": true,
  "data": {
    "totalBooks": 500,
    "totalUsers": 200,
    "activeBorrows": 45,
    "overdueBooks": 3,
    "todayBorrows": 8,
    "todayReturns": 5
  }
}
```

---

## Chat (RAG)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /chat | User | Gửi câu hỏi cho RAG chatbot |

### POST /chat
```json
// Request
{ "question": "Có sách nào về machine learning không?", "chatHistory": [] }

// Response 200
{
  "success": true,
  "data": {
    "answer": "Thư viện có một số sách về machine learning...",
    "sourceBooks": [
      { "bookId": 15, "title": "Hands-On Machine Learning", "author": "Aurélien Géron", "relevanceScore": 0.89 }
    ]
  }
}
```

---

## NFC

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /nfc/scan | LIBRARIAN/ADMIN | Quẹt NFC - tự phân biệt thẻ sinh viên hay sách |
| POST | /nfc/register-card | ADMIN/LIBRARIAN | Gán thẻ NFC cho sinh viên |
| POST | /nfc/register-tag | ADMIN/LIBRARIAN | Gán NFC tag cho sách |
| DELETE | /nfc/unregister-card/{userId} | ADMIN | Gỡ thẻ NFC khỏi sinh viên |
| DELETE | /nfc/unregister-tag/{bookId} | ADMIN | Gỡ NFC tag khỏi sách |

### POST /nfc/scan
```json
// Request
{ "uid": "04:A2:B3:C4:D5:E6:F7" }

// Response - sinh viên
{ "type": "USER", "data": { "userId": 123, "fullName": "Nguyen Van A", "studentId": "20200001", "currentBorrowCount": 3 } }

// Response - sách
{ "type": "BOOK", "data": { "bookId": 45, "title": "Clean Code", "author": "Robert C. Martin", "available": true } }

// Response - chưa đăng ký
{ "type": "UNKNOWN", "data": null }
```

---

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Chưa đăng nhập hoặc token hết hạn |
| FORBIDDEN | 403 | Không có quyền truy cập |
| RESOURCE_NOT_FOUND | 404 | Không tìm thấy resource |
| BOOK_NOT_AVAILABLE | 400 | Sách hết, không thể mượn |
| BORROW_LIMIT_EXCEEDED | 400 | Đã mượn tối đa số sách |
| ALREADY_BORROWED | 400 | Đã mượn cuốn sách này rồi |
| VALIDATION_ERROR | 400 | Input không hợp lệ |
| INTERNAL_ERROR | 500 | Lỗi server |
