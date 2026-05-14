# 1. Category APIs

> **Auth**: GET endpoints public (không cần token). POST/PUT/DELETE cần **ADMIN** only.
> Xem CategoryController: `@PreAuthorize("hasRole('ADMIN')")` trên POST/PUT/DELETE.

### 1.1 GET /api/categories - Lấy tất cả categories
- **Method**: GET
- **URL**: `http://localhost:8080/api/categories`
- **Auth**: Không cần token (public)
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
- **Auth**: Không cần token (public)
- **Expected**: 200 OK, trả về category "Công nghệ thông tin"
- [ ] PASS

### 1.3 GET /api/categories/{id} - ID không tồn tại
- **Method**: GET
- **URL**: `http://localhost:8080/api/categories/999`
- **Auth**: Không cần token (public)
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
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN>`
- **Body**:
```json
{
  "name": "Triết học",
  "description": "Sách về triết học phương Đông và phương Tây"
}
```
- **Expected**: 201 Created, trả về category vừa tạo với id mới
> **Lưu ý**: Chỉ ADMIN mới tạo được category (LIBRARIAN và STUDENT → 403).
- [ ] PASS

### 1.5 POST /api/categories - Thiếu name (validation)
- **Method**: POST
- **URL**: `http://localhost:8080/api/categories`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN>`
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
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken ADMIN>`
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
- **Headers**: `Authorization: Bearer <accessToken ADMIN>`
- **Expected**: 204 No Content
- [ ] PASS

### 1.8 POST /api/categories - LIBRARIAN không có quyền tạo
- **Method**: POST
- **URL**: `http://localhost:8080/api/categories`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken LIBRARIAN>`
- **Body**:
```json
{
  "name": "Test Category"
}
```
- **Expected**: 403 Forbidden
- [ ] PASS

### 1.9 POST /api/categories - Không có token
- **Method**: POST
- **URL**: `http://localhost:8080/api/categories`
- **Headers**: `Content-Type: application/json` (không có Authorization)
- **Body**:
```json
{
  "name": "Test Category"
}
```
- **Expected**: 401 Unauthorized
- [ ] PASS
