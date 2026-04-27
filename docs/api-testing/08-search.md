# 8. Full-text Search (Nâng cao)

> Search API đã có từ trước (GET /api/books/search?q=), tuần 5 nâng cấp lên PostgreSQL full-text search.

### 8.1 Search theo title

```
GET {{base_url}}/books/search?q=clean
```
**Expected**: 200 OK, trả về "Clean Code" (title match, weight A - ưu tiên cao nhất)

### 8.2 Search theo author

```
GET {{base_url}}/books/search?q=martin
```
**Expected**: 200 OK, trả về "Clean Code" (author = Robert C. Martin, weight B)

### 8.3 Search theo description

```
GET {{base_url}}/books/search?q=neural
```
**Expected**: 200 OK, trả về "Deep Learning" (description chứa "neural networks", weight C)

### 8.4 Search tiếng Việt không dấu (unaccent)

```
GET {{base_url}}/books/search?q=cong nghe
```
**Expected**: 200 OK, trả về sách có description chứa "Công nghệ" (unaccent mapping)

### 8.5 Search nhiều từ (AND logic)

```
GET {{base_url}}/books/search?q=spring java
```
**Expected**: 200 OK, trả về "Spring in Action" (chứa cả "spring" và liên quan đến Java trong description)

### 8.6 Search không có kết quả

```
GET {{base_url}}/books/search?q=xyznotexist
```
**Expected**: 200 OK, content rỗng, totalElements = 0

### 8.7 Search với pagination

```
GET {{base_url}}/books/search?q=sach&page=0&size=2
```
**Expected**: 200 OK, kết quả phân trang

---

### Lưu ý
- Full-text search sử dụng tsvector + GIN index, nhanh hơn LIKE %...% rất nhiều khi data lớn
- Weighted ranking: title (A) > author (B) > description (C)
- Nếu full-text search không có kết quả, tự động fallback về LIKE search (backward compatible)
- Trigger tự động cập nhật search_vector khi INSERT/UPDATE sách
