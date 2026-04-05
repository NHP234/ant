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

---

## Ghi chú khi test

- Nếu gặp lỗi 500, kiểm tra terminal SpringBoot để xem stack trace
- Nếu gặp lỗi kết nối DB, kiểm tra `docker ps` xem PostgreSQL đang chạy không
- Seed data tạo 5 sách (id 1-5) và 8 categories (id 1-8), thứ tự test nên từ trên xuống
- Sau khi test xong, có thể restart Docker để reset data: `docker-compose down -v` rồi `docker-compose up -d`
