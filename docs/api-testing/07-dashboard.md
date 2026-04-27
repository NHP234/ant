# 7. Dashboard APIs

> **Pre-requisite**: Login với ADMIN hoặc LIBRARIAN account.

### 7.1 GET /api/dashboard/stats - Thống kê tổng quan

```
GET {{base_url}}/dashboard/stats
Authorization: Bearer {{admin_token}}
```
**Expected**: 200 OK
```json
{
  "success": true,
  "data": {
    "totalBooks": 5,
    "totalUsers": 2,
    "activeBorrows": 1,
    "overdueBooks": 0,
    "totalCategories": 8
  }
}
```

### 7.2 Dashboard - Cache verification

**Bước 1**: Gọi GET /api/dashboard/stats lần đầu
**Bước 2**: Gọi lại ngay -> response nhanh hơn rõ rệt (lấy từ Redis cache, TTL 5 phút)
**Bước 3**: Kiểm tra Redis CLI (optional):
```
docker exec -it library-redis redis-cli
KEYS *dashboard*
```

### 7.3 STUDENT không có quyền xem dashboard

```
GET {{base_url}}/dashboard/stats
Authorization: Bearer {{student_token}}
```
**Expected**: 403 Forbidden
