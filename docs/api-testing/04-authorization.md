# 4. Authorization (Phân quyền)

> Dùng accessToken của student01 (STUDENT role) từ test 3.4

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
  "author": "Test Author"
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
  "author": "Test Author"
}
```
- **Expected**: 401 Unauthorized
- [ ] PASS

### 4.5 Đăng ký ADMIN/LIBRARIAN để test quyền ghi

> Hiện tại register luôn tạo STUDENT. Để test quyền ADMIN/LIBRARIAN, cần update role trực tiếp trong DB.

Chạy trong terminal (khi PostgreSQL đang chạy):
```
docker exec -it library-postgres psql -U library_user -d library_db -c "UPDATE users SET role = 'ADMIN' WHERE username = 'student01';"
```

Sau đó login lại student01 để lấy token mới (token cũ vẫn chứa role STUDENT):
```json
POST /api/auth/login
{ "username": "student01", "password": "Pass@123" }
```
> Copy accessToken mới (giờ có role ADMIN).

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
