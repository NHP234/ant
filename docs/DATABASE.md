# Database Design

> PostgreSQL database schema cho hệ thống quản lý thư viện.

## ER Diagram (Text)

```
users ||--o{ borrow_records : "has many"
books ||--o{ borrow_records : "has many"
books }o--o{ categories : "many-to-many (book_categories)"
users ||--o{ notifications : "has many"
users ||--o{ audit_logs : "has many"
```

## Tables

### users
| Column | Type | Constraints | Note |
|--------|------|-------------|------|
| id | BIGSERIAL | PK | |
| username | VARCHAR(50) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | BCrypt encoded |
| email | VARCHAR(100) | UNIQUE, NOT NULL | |
| full_name | VARCHAR(100) | NOT NULL | |
| role | VARCHAR(20) | NOT NULL | ADMIN, LIBRARIAN, STUDENT |
| student_id | VARCHAR(20) | UNIQUE, NULLABLE | Mã sinh viên |
| nfc_card_uid | VARCHAR(50) | UNIQUE, NULLABLE | UID thẻ NFC |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### books
| Column | Type | Constraints | Note |
|--------|------|-------------|------|
| id | BIGSERIAL | PK | |
| title | VARCHAR(255) | NOT NULL | |
| author | VARCHAR(255) | NOT NULL | |
| isbn | VARCHAR(20) | UNIQUE, NULLABLE | |
| publisher | VARCHAR(255) | NULLABLE | |
| publish_year | INTEGER | NULLABLE | |
| description | TEXT | NULLABLE | Dùng cho RAG embedding |
| quantity | INTEGER | NOT NULL, DEFAULT 1 | Tổng số bản |
| available_quantity | INTEGER | NOT NULL, DEFAULT 1 | Số bản còn trống |
| nfc_tag_uid | VARCHAR(50) | UNIQUE, NULLABLE | UID của NFC tag dán trên sách |
| cover_image_url | VARCHAR(500) | NULLABLE | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

### categories
| Column | Type | Constraints | Note |
|--------|------|-------------|------|
| id | BIGSERIAL | PK | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | |
| description | TEXT | NULLABLE | |

### book_categories (Join table)
| Column | Type | Constraints |
|--------|------|-------------|
| book_id | BIGINT | FK -> books.id, PK |
| category_id | BIGINT | FK -> categories.id, PK |

### borrow_records
| Column | Type | Constraints | Note |
|--------|------|-------------|------|
| id | BIGSERIAL | PK | |
| user_id | BIGINT | FK -> users.id, NOT NULL | |
| book_id | BIGINT | FK -> books.id, NOT NULL | |
| borrow_date | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| due_date | TIMESTAMP | NOT NULL | borrow_date + 14 days (configurable) |
| return_date | TIMESTAMP | NULLABLE | NULL = chưa trả |
| status | VARCHAR(20) | NOT NULL | BORROWING, RETURNED, OVERDUE |
| note | TEXT | NULLABLE | Ghi chú librarian |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### notifications
| Column | Type | Constraints | Note |
|--------|------|-------------|------|
| id | BIGSERIAL | PK | |
| user_id | BIGINT | FK -> users.id, NOT NULL | |
| title | VARCHAR(255) | NOT NULL | |
| message | TEXT | NOT NULL | |
| type | VARCHAR(30) | NOT NULL | OVERDUE_WARNING, BORROW_CONFIRM, RETURN_CONFIRM, SYSTEM |
| is_read | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

### audit_logs
| Column | Type | Constraints | Note |
|--------|------|-------------|------|
| id | BIGSERIAL | PK | |
| user_id | BIGINT | FK -> users.id, NULLABLE | NULL = system action |
| action | VARCHAR(50) | NOT NULL | BORROW, RETURN, CREATE_BOOK, DELETE_BOOK, etc. |
| entity_type | VARCHAR(50) | NOT NULL | BOOK, USER, BORROW_RECORD |
| entity_id | BIGINT | NOT NULL | |
| details | TEXT | NULLABLE | JSON string with details |
| ip_address | VARCHAR(45) | NULLABLE | |
| created_at | TIMESTAMP | DEFAULT NOW() | |

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_borrow_records_user_id ON borrow_records(user_id);
CREATE INDEX idx_borrow_records_book_id ON borrow_records(book_id);
CREATE INDEX idx_borrow_records_status ON borrow_records(status);
CREATE INDEX idx_borrow_records_due_date ON borrow_records(due_date) WHERE status = 'BORROWING';
CREATE INDEX idx_notifications_user_id ON notifications(user_id) WHERE is_read = false;
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_users_nfc_card_uid ON users(nfc_card_uid) WHERE nfc_card_uid IS NOT NULL;
CREATE INDEX idx_books_nfc_tag_uid ON books(nfc_tag_uid) WHERE nfc_tag_uid IS NOT NULL;
```

## Flyway Migrations

```
db/migration/
├── V1__create_users_table.sql
├── V2__create_books_and_categories_tables.sql
├── V3__create_borrow_records_table.sql
├── V4__create_notifications_table.sql
├── V5__create_audit_logs_table.sql
├── V6__add_indexes.sql
├── V7__seed_default_data.sql        # Admin user, sample categories
└── (tiếp tục khi có thay đổi schema)
```

## Seed Data (V7)

- 1 Admin user (admin/admin123)
- Categories: Công nghệ thông tin, Khoa học, Văn học, Kinh tế, Ngoại ngữ, Lịch sử, Toán học, Vật lý
- 20-30 sample books (có description cho RAG)

## Notes
- `available_quantity` cần được cập nhật atomic khi mượn/trả (dùng `@Version` hoặc `UPDATE ... SET available_quantity = available_quantity - 1 WHERE available_quantity > 0`)
- Due date mặc định 14 ngày, configurable trong application.yml
- Soft delete có thể cân nhắc cho books và users (thêm `is_deleted` flag)
