# Kịch bản Dữ liệu (Data Seeding) — Awaken Ant Library

## 1. Mục đích
Tài liệu này mô tả chi tiết toàn bộ quy trình chuẩn bị dữ liệu sách mẫu (Data Seeding) từ bộ dữ liệu [Goodreads của UCSD](https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/). Dữ liệu này (5.000 cuốn sách) phục vụ cho:
1. Demo tính năng tìm kiếm ngữ nghĩa và AI Chatbot (RAG).
2. Kiểm thử hiệu năng (Pagination, Dashboard, Full-text Search) với lượng dữ liệu thực tế.

---

## 2. Quy trình 1: Cào và Lọc dữ liệu (Data Extraction)

Quy trình này do script `extract_books.py` đảm nhiệm. Vì file gốc `goodreads_books.json.gz` nặng hơn 2GB, script được thiết kế tối ưu:
- **Tải file có resume (Resumable Download)**: Tránh việc đứt mạng phải tải lại từ đầu.
- **Streaming Parsing**: Đọc trực tiếp file `.gz` từng dòng (JSON lines) để tránh tràn RAM.
- **Tiêu chí lọc khắt khe**:
  - `description`: Phải dài tối thiểu 100 ký tự (bắt buộc cho RAG).
  - `image_url`: Phải có ảnh bìa hợp lệ (không lấy ảnh `nophoto` mặc định của Goodreads).
  - `title` và `authors`: Phải có dữ liệu hợp lệ.
- **Kết quả (Output)**: File `seed_books.json` (khoảng ~6MB) chứa thông tin của 5.000 đầu sách chất lượng cao.

---

## 3. Quy trình 2: Nhập liệu vào Database (Data Import)

Quá trình import `seed_books.json` vào cơ sở dữ liệu PostgreSQL (lược đồ V12 hiện tại của Awaken Ant) đòi hỏi sự khéo léo để không vi phạm các ràng buộc (constraints).

Dưới đây là **4 vấn đề xung đột schema tiềm ẩn** và giải pháp khi thiết kế script import (sắp tới sẽ viết bằng Java/Spring Boot qua một endpoint `POST /api/admin/seed` hoặc script chạy một lần):

### Vấn đề 1: Đồng bộ Thể loại (Categories)
- **Tình trạng**: Schema quản lý sách bằng bảng trung gian `book_categories`. File Goodreads gốc không có trường `categories` trực tiếp mà lưu dưới dạng thẻ người dùng gán (`popular_shelves` như 'to-read', 'fantasy', 'science-fiction').
- **Giải pháp**: Script `extract_books.py` đã được nâng cấp để tự động lọc bỏ các thẻ rác (như 'to-read', 'favorites'), chuẩn hóa chuỗi và chọn ra **2 thể loại chính xác nhất** cho mỗi cuốn sách (lưu vào mảng `"categories"` trong file JSON). Khi import vào Database, backend chỉ cần duyệt mảng này, tạo category mới (nếu chưa có) và gắn vào bảng trung gian `book_categories`. Như vậy dữ liệu sẽ cực kỳ chuẩn xác và phong phú!

### Vấn đề 2: Thiếu Bản sao vật lý (Book Copies)
- **Tình trạng**: Kể từ schema V9, ứng dụng không còn dùng trường `quantity` trong bảng `books`. Việc quản lý tồn kho dựa trên việc đếm số lượng bản ghi thực tế trong bảng `book_copies`. File JSON chỉ chứa thông tin *đầu sách* (metadata).
- **Giải pháp**: Script import sau khi tạo bản ghi `books`, sẽ tự động sinh ra **2 đến 3 bản copy** (vòng lặp) vào bảng `book_copies`.
  - `copy_number`: Lần lượt là 1, 2, 3...
  - `status`: Mặc định là `'AVAILABLE'`.
  - `nfc_tag_uid`: Khởi tạo bằng `NULL` (Vì NFC tag sẽ do thủ thư dùng thiết bị quét để dán/map thẻ vật lý sau).

### Vấn đề 3: Giới hạn độ dài chuỗi (Data Truncation)
- **Tình trạng**: Schema định nghĩa `title` và `author` trong bảng `books` có thể bị giới hạn độ dài (ví dụ `VARCHAR(255)`). Dữ liệu sách nước ngoài trên Goodreads đôi khi có tiêu đề phụ rất dài hoặc chuỗi tác giả (nhiều người viết chung) dài vượt quá 255 ký tự. Nếu insert trực tiếp sẽ gây lỗi SQL `Value too long`.
- **Giải pháp**: Script import cần thực hiện cắt chuỗi an toàn (truncate). Ví dụ: `title.substring(0, 250) + "..."` nếu độ dài > 250. Tương tự cho trường `publisher` và `author`.

### Vấn đề 4: Ràng buộc tính duy nhất của ISBN (ISBN Uniqueness)
- **Tình trạng**: File JSON có rất nhiều bản ghi chứa `isbn: ""` (chuỗi rỗng). Tùy thuộc vào thiết lập UNIQUE constraint của Postgres trên trường `isbn`, việc có hàng ngàn sách chung một chuỗi rỗng có thể gây lỗi `UniqueViolationException`.
- **Giải pháp**: Script import cần kiểm tra: nếu `isbn` là `""` (chuỗi rỗng), phải chuyển đổi thành `NULL` trước khi lưu. PostgreSQL cho phép có nhiều giá trị `NULL` trên cùng một cột có ràng buộc UNIQUE.
