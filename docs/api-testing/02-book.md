# 2. Book APIs

> **Auth**: GET endpoints public (không cần token). POST/PUT cần ADMIN hoặc LIBRARIAN. DELETE cần ADMIN.
> Xem SecurityConfig: `GET /api/books/**` → permitAll. POST/PUT → `@PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")`. DELETE → `@PreAuthorize("hasRole('ADMIN')")`.

### 2.1 GET /api/books - Lấy danh sách sách (default pagination)
- **Method**: GET
- **URL**: `http://localhost:8080/api/books`
- **Auth**: Không cần token (public)
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
- **Auth**: Không cần token (public)
- **Expected**: 200 OK, chỉ trả 2 sách, sort theo title giảm dần, totalPages = 3
- [ ] PASS

### 2.3 GET /api/books/{id} - Lấy chi tiết 1 sách
- **Method**: GET
- **URL**: `http://localhost:8080/api/books/1`
- **Auth**: Không cần token (public)
- **Expected**: 200 OK, trả về "Clean Code" với đầy đủ thông tin + categories
- [ ] PASS

### 2.4 GET /api/books/{id} - ID không tồn tại
- **Method**: GET
- **URL**: `http://localhost:8080/api/books/999`
- **Auth**: Không cần token (public)
- **Expected**: 404 Not Found
- [ ] PASS

### 2.5 GET /api/books/search?q= - Tìm kiếm sách
- **Method**: GET
- **URL**: `http://localhost:8080/api/books/search?q=clean`
- **Auth**: Không cần token (public)
- **Expected**: 200 OK, trả về "Clean Code"
- [ ] PASS

### 2.6 GET /api/books/search?q= - Tìm không thấy
- **Method**: GET
- **URL**: `http://localhost:8080/api/books/search?q=xyznotexist`
- **Auth**: Không cần token (public)
- **Expected**: 200 OK, content rỗng, totalElements = 0
- [ ] PASS

### 2.7 POST /api/books - Tạo sách mới (không có category)
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN hoặc LIBRARIAN>`
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
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN hoặc LIBRARIAN>`
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
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN hoặc LIBRARIAN>`
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
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN hoặc LIBRARIAN>`
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
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN hoặc LIBRARIAN>`
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
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN hoặc LIBRARIAN>`
- **Body**:
```json
{
  "categoryIds": [1, 3]
}
```
- **Expected**: 200 OK, categories chứa "Công nghệ thông tin" và "Toán học"
- [ ] PASS

### 2.13 DELETE /api/books/{id} - Xóa sách (chỉ ADMIN)
- **Method**: DELETE
- **URL**: `http://localhost:8080/api/books/6` (sách "Head First Java" vừa tạo ở 2.7)
- **Headers**: `Authorization: Bearer <accessToken ADMIN>`
- **Expected**: 204 No Content
> **Lưu ý**: LIBRARIAN KHÔNG có quyền xóa sách, chỉ ADMIN (`@PreAuthorize("hasRole('ADMIN')")`).
- [ ] PASS

### 2.14 DELETE /api/books/{id} - Xóa sách không tồn tại
- **Method**: DELETE
- **URL**: `http://localhost:8080/api/books/999`
- **Headers**: `Authorization: Bearer <accessToken ADMIN>`
- **Expected**: 404 Not Found
- [ ] PASS

### 2.15 POST /api/books - STUDENT không có quyền tạo sách
- **Method**: POST
- **URL**: `http://localhost:8080/api/books`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken STUDENT>`
- **Body**:
```json
{
  "title": "Test Book",
  "author": "Test Author",
  "quantity": 1
}
```
- **Expected**: 403 Forbidden
- [ ] PASS

### 2.16 DELETE /api/books/{id} - LIBRARIAN không có quyền xóa sách
- **Method**: DELETE
- **URL**: `http://localhost:8080/api/books/1`
- **Headers**: `Authorization: Bearer <accessToken LIBRARIAN>`
- **Expected**: 403 Forbidden
- [ ] PASS
