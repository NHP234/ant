# 4. Authorization (Phân quyền)

> Hệ thống có sẵn ADMIN account từ DataInitializer (username/password cấu hình trong application.yml, mặc định: `admin` / `Admin@123`).
> Không cần update DB thủ công.

## Tóm tắt quyền

| Endpoint | STUDENT | LIBRARIAN | ADMIN |
|----------|---------|-----------|-------|
| GET /api/books/**, GET /api/categories/** | ✅ Public | ✅ Public | ✅ Public |
| POST /api/books, PUT /api/books/{id} | ❌ 403 | ✅ | ✅ |
| DELETE /api/books/{id} | ❌ 403 | ❌ 403 | ✅ |
| POST/PUT/DELETE /api/categories/** | ❌ 403 | ❌ 403 | ✅ |
| POST /api/borrows | ✅ | ✅ | ✅ |
| PUT /api/borrows/{id}/return | ❌ 403 | ✅ | ✅ |
| GET /api/borrows (all) | ❌ 403 | ✅ | ✅ |
| GET /api/borrows/my | ✅ | ✅ | ✅ |
| GET /api/borrows/overdue | ❌ 403 | ✅ | ✅ |
| POST/GET/PUT/DELETE /api/users/** | ❌ 403 | ❌ 403 | ✅ |
| GET /api/users/me | ✅ | ✅ | ✅ |
| GET /api/dashboard/stats | ❌ 403 | ✅ | ✅ |
| GET/PUT /api/notifications/** | ✅ (own) | ✅ (own) | ✅ (own) |

---

### 4.1 GET /api/books - Public, không cần token
- **Method**: GET
- **URL**: `http://localhost:8080/api/books`
- **Headers**: (không cần Authorization)
- **Expected**: 200 OK, trả về danh sách sách
- [ ] PASS

### 4.2 POST /api/books - STUDENT không có quyền tạo sách
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken của student01>`
- **Body**:
```json
{
  "title": "Test Book",
  "author": "Test Author",
  "quantity": 1
}
```
- **Expected**: 403 Forbidden (STUDENT không có ROLE_ADMIN hoặc ROLE_LIBRARIAN)
- [ ] PASS

### 4.3 POST /api/categories - STUDENT không có quyền tạo category
- **Method**: POST
- **URL**: `http://localhost:8080/api/categories`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken của student01>`
- **Body**:
```json
{
  "name": "Test Category"
}
```
- **Expected**: 403 Forbidden
- [ ] PASS

### 4.4 POST /api/books - Không có token
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**: `Content-Type: application/json` (không có Authorization)
- **Body**:
```json
{
  "title": "Test Book",
  "author": "Test Author",
  "quantity": 1
}
```
- **Expected**: 401 Unauthorized
- [ ] PASS

### 4.5 Login ADMIN (có sẵn từ DataInitializer)

> ADMIN account được tạo tự động khi backend khởi động. Mặc định: `admin` / `Admin@123` (cấu hình trong application.yml).

```json
POST /api/auth/login
{
  "username": "admin",
  "password": "Admin@123"
}
```
> Copy accessToken → dùng cho các test cần quyền ADMIN.
- [ ] PASS

### 4.6 POST /api/books - ADMIN tạo sách thành công
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN>`
- **Body**:
```json
{
  "title": "The Pragmatic Programmer",
  "author": "David Thomas, Andrew Hunt",
  "isbn": "978-0135957059",
  "quantity": 2,
  "categoryIds": [1]
}
```
- **Expected**: 201 Created
- [ ] PASS

### 4.7 DELETE /api/books/{id} - ADMIN xóa sách thành công
- **Method**: DELETE
- **URL**: `http://localhost:8080/api/books/6` (sách vừa tạo ở 4.6)
- **Headers**: `Authorization: Bearer <accessToken ADMIN>`
- **Expected**: 204 No Content
- [ ] PASS

### 4.8 DELETE /api/books/{id} - LIBRARIAN không có quyền xóa sách
- **Method**: DELETE
- **URL**: `http://localhost:8080/api/books/1`
- **Headers**: `Authorization: Bearer <accessToken LIBRARIAN>`
- **Expected**: 403 Forbidden
> LIBRARIAN chỉ được POST/PUT sách, không được DELETE.
- [ ] PASS

### 4.9 POST /api/users - LIBRARIAN không có quyền tạo user
- **Method**: POST
- **URL**: `http://localhost:8080/api/users`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken LIBRARIAN>`
- **Body**:
```json
{
  "username": "hacker",
  "password": "Test1234",
  "email": "hack@test.com",
  "fullName": "Hacker",
  "role": "ADMIN"
}
```
- **Expected**: 403 Forbidden
- [ ] PASS

### 4.10 GET /api/dashboard/stats - STUDENT không có quyền
- **Method**: GET
- **URL**: `http://localhost:8080/api/dashboard/stats`
- **Headers**: `Authorization: Bearer <accessToken STUDENT>`
- **Expected**: 403 Forbidden
- [ ] PASS
