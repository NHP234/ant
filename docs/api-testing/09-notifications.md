# 9. Notification APIs

> **Pre-requisite**: Login với bất kỳ account nào. Notifications được tạo tự động khi đặt mượn/xác nhận/hủy/hết hạn, mượn/trả/quá hạn sách.

### 9.1 Xem danh sách notifications

```
GET {{base_url}}/notifications
Authorization: Bearer {{token}}
```
**Expected**: 200 OK, danh sách notifications của user đang login, mới nhất lên đầu.

**Với pagination:**
```
GET {{base_url}}/notifications?page=0&size=5
Authorization: Bearer {{token}}
```

### 9.2 Đếm notifications chưa đọc

```
GET {{base_url}}/notifications/unread-count
Authorization: Bearer {{token}}
```
**Expected**: 200 OK
```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

### 9.3 Đánh dấu 1 notification đã đọc

```
PUT {{base_url}}/notifications/1/read
Authorization: Bearer {{token}}
```
**Expected**: 200 OK, notification có isRead = true

### 9.4 Đánh dấu tất cả đã đọc

```
PUT {{base_url}}/notifications/read-all
Authorization: Bearer {{token}}
```
**Expected**: 200 OK
```json
{
  "success": true,
  "data": {
    "markedCount": 3
  },
  "message": "All notifications marked as read"
}
```

### 9.5 Đánh dấu notification của người khác

Login STUDENT A, thử mark read notification của STUDENT B:
```
PUT {{base_url}}/notifications/5/read
Authorization: Bearer {{student_a_token}}
```
**Expected**: 400 - "This notification does not belong to you"

### 9.6 Không có token

```
GET {{base_url}}/notifications
(no Authorization header)
```
**Expected**: 401/403

### 9.7 Test Flow Hoàn chỉnh

| Step | Action | Expected |
|------|--------|----------|
| 1 | STUDENT đặt mượn | 201 + notification "Đặt mượn thành công" |
| 2 | LIBRARIAN xác nhận | 200 + notification "Mượn sách thành công" |
| 3 | GET /notifications | 200 + có notification "Mượn sách thành công" |
| 4 | GET /notifications/unread-count | unreadCount >= 1 |
| 5 | PUT /notifications/{id}/read | 200 + isRead = true |
| 6 | GET /notifications/unread-count | unreadCount giảm 1 |
| 7 | PUT /notifications/read-all | 200 + markedCount |
| 8 | GET /notifications/unread-count | unreadCount = 0 |
