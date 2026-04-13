# API Testing Guide (Postman)

> Hướng dẫn test các API bằng Postman. Base URL: `http://localhost:8080/api`

## Trước khi test

1. Chạy Docker containers:
```
cd d:\ant
docker-compose up -d
```

2. Chạy SpringBoot:
```
cd d:\ant\backend
./mvnw spring-boot:run
```

3. Verify: Mở browser vào `http://localhost:8080` - nếu thấy response (kể cả lỗi 401/403) là app đang chạy.

> Hiện tại Security đang `permitAll` nên không cần token. Khi làm JWT sau sẽ cập nhật file này.

---

## 1. Category APIs

### 1.1 GET /api/categories - Lấy tất cả categories
- **Method**: GET
- **URL**: `http://localhost:8080/api/categories`
- **Expected**: 200 OK, trả về 8 categories từ seed data

```json
// Expected response
{
  "success": true,
  "data": [
    { "id": 1, "name": "Công nghệ thông tin", "description": "..." },
    ...
  ]
}
```
- [ ] PASS

### 1.2 GET /api/categories/{id} - Lấy 1 category
- **Method**: GET
- **URL**: `http://localhost:8080/api/categories/1`
- **Expected**: 200 OK, trả về category "Công nghệ thông tin"
- [ ] PASS

### 1.3 GET /api/categories/{id} - ID không tồn tại
- **Method**: GET
- **URL**: `http://localhost:8080/api/categories/999`
- **Expected**: 404 Not Found

```json
{
  "success": false,
  "status": 404,
  "error": "RESOURCE_NOT_FOUND",
  "message": "Category not found with id: '999'"
}
```
- [ ] PASS

### 1.4 POST /api/categories - Tạo category mới
- **Method**: POST
- **URL**: `http://localhost:8080/api/categories`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "name": "Triết học",
  "description": "Sách về triết học phương Đông và phương Tây"
}
```
- **Expected**: 201 Created, trả về category vừa tạo với id mới
- [ ] PASS

### 1.5 POST /api/categories - Thiếu name (validation)
- **Method**: POST
- **URL**: `http://localhost:8080/api/categories`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "description": "Thiếu tên"
}
```
- **Expected**: 400 Bad Request, error VALIDATION_ERROR
- [ ] PASS

### 1.6 PUT /api/categories/{id} - Cập nhật category
- **Method**: PUT
- **URL**: `http://localhost:8080/api/categories/1`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "name": "CNTT & Lập trình",
  "description": "Sách về công nghệ thông tin và lập trình"
}
```
- **Expected**: 200 OK, trả về category đã cập nhật
- [ ] PASS

### 1.7 DELETE /api/categories/{id} - Xóa category
- **Method**: DELETE
- **URL**: `http://localhost:8080/api/categories/9` (category "Triết học" vừa tạo ở 1.4)
- **Expected**: 204 No Content
- [ ] PASS

---

## 2. Book APIs

### 2.1 GET /api/books - Lấy danh sách sách (default pagination)
- **Method**: GET
- **URL**: `http://localhost:8080/api/books`
- **Expected**: 200 OK, trả về page đầu tiên (5 sách từ seed data)

```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1,
    "last": true
  }
}
```
- [ ] PASS

### 2.2 GET /api/books - Custom pagination & sorting
- **Method**: GET
- **URL**: `http://localhost:8080/api/books?page=0&size=2&sort=title,desc`
- **Expected**: 200 OK, chỉ trả 2 sách, sort theo title giảm dần, totalPages = 3
- [ ] PASS

### 2.3 GET /api/books/{id} - Lấy chi tiết 1 sách
- **Method**: GET
- **URL**: `http://localhost:8080/api/books/1`
- **Expected**: 200 OK, trả về "Clean Code" với đầy đủ thông tin + categories
- [ ] PASS

### 2.4 GET /api/books/{id} - ID không tồn tại
- **Method**: GET
- **URL**: `http://localhost:8080/api/books/999`
- **Expected**: 404 Not Found
- [ ] PASS

### 2.5 GET /api/books/search?q= - Tìm kiếm sách
- **Method**: GET
- **URL**: `http://localhost:8080/api/books/search?q=clean`
- **Expected**: 200 OK, trả về "Clean Code"
- [ ] PASS

### 2.6 GET /api/books/search?q= - Tìm không thấy
- **Method**: GET
- **URL**: `http://localhost:8080/api/books/search?q=xyznotexist`
- **Expected**: 200 OK, content rỗng, totalElements = 0
- [ ] PASS

### 2.7 POST /api/books - Tạo sách mới (không có category)
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "title": "Head First Java",
  "author": "Kathy Sierra",
  "isbn": "978-0596009205",
  "publisher": "O'Reilly Media",
  "publishYear": 2005,
  "description": "Sách học Java cho người mới bắt đầu, trình bày theo phong cách trực quan sinh động.",
  "quantity": 3
}
```
- **Expected**: 201 Created, availableQuantity = 3 (bằng quantity)
- [ ] PASS

### 2.8 POST /api/books - Tạo sách mới (có category)
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "title": "Effective Java",
  "author": "Joshua Bloch",
  "isbn": "978-0134685991",
  "publisher": "Addison-Wesley",
  "publishYear": 2018,
  "description": "Best practices cho Java programming, bao gồm generics, lambdas, streams.",
  "quantity": 2,
  "categoryIds": [1]
}
```
- **Expected**: 201 Created, categories chứa "Công nghệ thông tin"
- [ ] PASS

### 2.9 POST /api/books - Validation: thiếu title
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "author": "Someone",
  "quantity": 1
}
```
- **Expected**: 400 Bad Request, VALIDATION_ERROR "title: Title is required"
- [ ] PASS

### 2.10 POST /api/books - Validation: quantity = 0
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "title": "Bad Book",
  "author": "Nobody",
  "quantity": 0
}
```
- **Expected**: 400 Bad Request, VALIDATION_ERROR "quantity: Quantity must be at least 1"
- [ ] PASS

### 2.11 PUT /api/books/{id} - Cập nhật sách (partial update)
- **Method**: PUT
- **URL**: `http://localhost:8080/api/books/1`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "description": "Cuốn sách kinh điển về clean code, phiên bản cập nhật.",
  "quantity": 5
}
```
- **Expected**: 200 OK, description đã đổi, quantity = 5, availableQuantity tăng tương ứng
- [ ] PASS

### 2.12 PUT /api/books/{id} - Gán categories cho sách
- **Method**: PUT
- **URL**: `http://localhost:8080/api/books/1`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "categoryIds": [1, 3]
}
```
- **Expected**: 200 OK, categories chứa "Công nghệ thông tin" và "Toán học"
- [ ] PASS

### 2.13 DELETE /api/books/{id} - Xóa sách
- **Method**: DELETE
- **URL**: `http://localhost:8080/api/books/6` (sách "Head First Java" vừa tạo ở 2.7)
- **Expected**: 204 No Content
- [ ] PASS

### 2.14 DELETE /api/books/{id} - Xóa sách không tồn tại
- **Method**: DELETE
- **URL**: `http://localhost:8080/api/books/999`
- **Expected**: 404 Not Found
- [ ] PASS

---

## 3. Auth APIs

> Test auth trước, vì từ giờ POST/PUT/DELETE books/categories cần token.

### 3.1 POST /api/auth/register - Đăng ký user mới
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "student01",
  "password": "Pass@123",
  "email": "student01@example.com",
  "fullName": "Nguyen Van A",
  "studentId": "20200001"
}
```
- **Expected**: 201 Created, trả về accessToken + refreshToken + user info (role = STUDENT)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": 2,
      "username": "student01",
      "email": "student01@example.com",
      "fullName": "Nguyen Van A",
      "role": "STUDENT"
    }
  }
}
```
> **Lưu ý**: Copy `accessToken` và `refreshToken` lại để dùng cho các test sau.
- [ ] PASS

### 3.2 POST /api/auth/register - Username đã tồn tại
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "student01",
  "password": "Pass@123",
  "email": "other@example.com",
  "fullName": "Nguyen Van B"
}
```
- **Expected**: 400 Bad Request, "Username already exists"
- [ ] PASS

### 3.3 POST /api/auth/register - Validation errors
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "ab",
  "password": "123",
  "email": "not-an-email",
  "fullName": ""
}
```
- **Expected**: 400 Bad Request, VALIDATION_ERROR (username size, password size, email format, fullName blank)
- [ ] PASS

### 3.4 POST /api/auth/login - Đăng nhập thành công
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "student01",
  "password": "Pass@123"
}
```
- **Expected**: 200 OK, trả về accessToken + refreshToken mới
> Copy `accessToken` mới vào Postman variable hoặc ghi lại.
- [ ] PASS

### 3.5 POST /api/auth/login - Sai mật khẩu
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "student01",
  "password": "wrongpassword"
}
```
- **Expected**: 401 Unauthorized, "Invalid username or password"
- [ ] PASS

### 3.6 POST /api/auth/login - User không tồn tại
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "nonexistent",
  "password": "Pass@123"
}
```
- **Expected**: 401 Unauthorized
- [ ] PASS

### 3.7 POST /api/auth/refresh - Refresh token
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/refresh`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "refreshToken": "<paste refreshToken từ 3.4>"
}
```
- **Expected**: 200 OK, trả về accessToken + refreshToken mới
- [ ] PASS

### 3.8 POST /api/auth/refresh - Token không hợp lệ
- **Method**: POST
- **URL**: `http://localhost:8080/api/auth/refresh`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "refreshToken": "invalid.token.here"
}
```
- **Expected**: 400 Bad Request, "Invalid or expired refresh token"
- [ ] PASS

---

## 4. Authorization (Phân quyền)

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

---

## Checklist tổng hợp

| # | Test case | Status |
|---|-----------|--------|
| 1.1 | GET categories - all | |
| 1.2 | GET categories - by id | |
| 1.3 | GET categories - not found | |
| 1.4 | POST categories - create | |
| 1.5 | POST categories - validation | |
| 1.6 | PUT categories - update | |
| 1.7 | DELETE categories | |
| 2.1 | GET books - default | |
| 2.2 | GET books - pagination & sort | |
| 2.3 | GET books - by id | |
| 2.4 | GET books - not found | |
| 2.5 | GET books/search - found | |
| 2.6 | GET books/search - not found | |
| 2.7 | POST books - no category | |
| 2.8 | POST books - with category | |
| 2.9 | POST books - missing title | |
| 2.10 | POST books - invalid quantity | |
| 2.11 | PUT books - partial update | |
| 2.12 | PUT books - assign categories | |
| 2.13 | DELETE books - success | |
| 2.14 | DELETE books - not found | |
| 3.1 | Register - success | |
| 3.2 | Register - duplicate username | |
| 3.3 | Register - validation errors | |
| 3.4 | Login - success | |
| 3.5 | Login - wrong password | |
| 3.6 | Login - user not found | |
| 3.7 | Refresh token - success | |
| 3.8 | Refresh token - invalid | |
| 4.1 | GET books - public no token | |
| 4.2 | POST books - STUDENT forbidden | |
| 4.3 | POST categories - STUDENT forbidden | |
| 4.4 | POST books - no token 401 | |
| 4.5 | Update role to ADMIN in DB | |
| 4.6 | POST books - ADMIN success | |
| 4.7 | DELETE books - ADMIN success | |

---

## Ghi chú khi test

- Nếu gặp lỗi 500, kiểm tra terminal SpringBoot để xem stack trace
- Nếu gặp lỗi kết nối DB, kiểm tra `docker ps` xem PostgreSQL đang chạy không
- Seed data tạo 5 sách (id 1-5) và 8 categories (id 1-8), thứ tự test nên từ trên xuống
- Sau khi test xong, có thể restart Docker để reset data: `docker-compose down -v` rồi `docker-compose up -d`

### Thứ tự test khuyến nghị
1. Test Auth trước (section 3): register -> login -> refresh
2. Test Authorization (section 4): kiểm tra phân quyền STUDENT vs ADMIN
3. Test lại Category/Book CRUD (section 1-2) với token ADMIN trong header

### Setup Postman cho nhanh
- Tạo Collection variable: `base_url` = `http://localhost:8080/api`
- Tạo Collection variable: `token` = (paste accessToken sau khi login)
- Trong mỗi request cần auth, tab Authorization chọn Bearer Token, value = `{{token}}`
- Sau mỗi lần login/register, copy accessToken vào variable `token`
