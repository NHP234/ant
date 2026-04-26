# 1. Category APIs

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
