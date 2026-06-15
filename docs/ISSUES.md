# Issues & Questions

> Ghi lại bugs, blockers, câu hỏi chưa trả lời, và các vấn đề cần giải quyết.

## Format

```
### [ISSUE-XXX] Tiêu đề
- **Loại**: Bug / Question / Blocker / Enhancement
- **Trạng thái**: Open / In Progress / Resolved
- **Ngày tạo**: YYYY-MM-DD
- **Mô tả**: ...
- **Giải pháp**: ... (khi resolved)
```

---

## Open Issues

### [ENH-002] Batch trả nhiều sách chưa atomic
- **Loại**: Enhancement
- **Trạng thái**: Open
- **Ngày tạo**: 2026-06-11
- **Mô tả**: Kiosk hiện trả nhiều cuốn bằng cách gọi tuần tự `PUT /api/borrows/{id}/return`. Nếu một request giữa danh sách thất bại, các cuốn trước đó đã được trả thành công và giao dịch có thể partial success.
- **Giải pháp đề xuất**: Bổ sung endpoint batch return chạy trong một transaction, validate toàn bộ record/copy trước khi cập nhật và trả kết quả theo một phiếu giao dịch.

---

## Resolved Issues

### [BUG-005] RAG dùng sai trạng thái đặt trước của backend
- **Loại**: Bug
- **Ngày tạo**: 2026-06-15
- **Resolved**: 2026-06-15
- **Nguyên nhân**: `APIQueryService` lọc hold theo `PENDING`/`READY` và prompt mô tả bước thủ thư phê duyệt, trong khi backend chỉ dùng `ACTIVE`, `FULFILLED`, `CANCELED`, `EXPIRED` và giữ ngay một bản sao khi tạo hold.
- **Giải pháp**: Đồng bộ mapping đủ bốn trạng thái, hiển thị hạn nhận cho `ACTIVE`, giữ lịch sử trạng thái kết thúc, sửa prompt và bổ sung unit test contract.

### [BUG-001] GET /api/books/{id} trả về 500 Internal Server Error
- **Loại**: Bug
- **Ngày tạo**: 2026-05-14
- **Resolved**: 2026-05-14
- **Nguyên nhân**:
  1. Redis `GenericJackson2JsonRedisSerializer` không serialize `LocalDateTime` → fix: thêm `JavaTimeModule` + custom `ObjectMapper` trong CacheConfig
  2. Jackson cần `@Setter` trên DTOs để deserialize từ Redis cache → fix: thêm `@Setter` vào BookResponse, CategoryResponse, DashboardStatsResponse
  3. `Book.categories` là LAZY load → `LazyInitializationException` khi mapping ngoài transaction → fix: thêm `@Transactional(readOnly = true)` vào `BookService.getBookById()`
- **Giải pháp**: Xem commits ngày 2026-05-14

### [BUG-002] Frontend: Admin login không vào được Dashboard
- **Loại**: Bug
- **Ngày tạo**: 2026-05-14
- **Resolved**: 2026-05-14
- **Nguyên nhân**: Frontend `useAuth.tsx` destructure `{ username, role }` trực tiếp từ `res.data.data`, nhưng backend trả `{ accessToken, refreshToken, user: { username, role } }` → role luôn `undefined` → `isAdmin = false` → redirect về `/browse`
- **Giải pháp**: Đổi thành `const { accessToken, refreshToken, user } = res.data.data`

### [BUG-003] Seed import không lưu ảnh bìa sách từ Goodreads
- **Loại**: Bug
- **Ngày tạo**: 2026-06-02
- **Resolved**: 2026-06-02
- **Nguyên nhân**: `extract_books.py` sinh field snake_case (`cover_image_url`, `publish_year`) nhưng backend `BookSeedDto` chỉ nhận camelCase (`coverImageUrl`, `publishYear`), khiến `cover_image_url` trong DB bị `null` sau import qua `/api/admin/seed`.
- **Giải pháp**: Thêm `@JsonAlias` cho `BookSeedDto`, đổi script extract sang camelCase cho seed mới, thêm fallback ảnh bìa ở frontend, và cho `SeedImportService` backfill metadata thiếu khi re-run import với ISBN đã tồn tại.

### [BUG-004] Redis cache format cũ làm `/api/categories` trả 500
- **Loại**: Bug
- **Ngày tạo**: 2026-06-08
- **Resolved**: 2026-06-08
- **Nguyên nhân**: Redis key legacy `categories::all` được ghi bằng serializer generic/type metadata cũ. Backend mới có thể deserialize lỗi value này cho đến khi key hết TTL 24 giờ.
- **Giải pháp**: Đổi `CacheConfig` sang typed Jackson serializer cho `List<CategoryResponse>`, `BookResponse`, và `DashboardStatsResponse`; thêm prefix `library:v2:` để không đọc nhầm key format cũ; giữ `CacheErrorHandler` để cache failure không làm request hợp lệ trả 500.

### [ENH-001] Schema Refactor V9: book_copies + borrow_slips
- **Loại**: Enhancement
- **Ngày tạo**: 2026-05-15
- **Resolved**: 2026-05-16
- **Mô tả**: Thêm bảng `book_copies` (mỗi cuốn vật lý có NFC tag riêng) và `borrow_slips` (phiếu mượn gom nhiều records). Chuyển từ denormalized `quantity`/`available_quantity` sang computed COUNT.
- **Scope ảnh hưởng**: Migration V9, 2 entities mới (BookCopy, BorrowSlip), 2 enums mới (CopyStatus, BorrowSource), sửa Book/BorrowRecord entities, 2 repos mới, update BookService + BorrowService + BookMapper + BorrowRecordMapper + DTOs
- **Chi tiết**: Xem `implementation_plan.md` và commits ngày 2026-05-15/16

---

## Resolved Questions

### [Q-001] Chọn UI Component Library: Ant Design hay MUI?
- **Ngày**: 2026-03-04
- **Resolved**: 2026-05-08
- **Context**: Cả hai đều phù hợp. Ant Design có nhiều component cho admin panel (Table, Form). MUI có design đẹp hơn.
- **Kết luận**: Chọn **Shadcn/ui** (Radix + Nova preset) + TailwindCSS v4 — headless components, dễ customize, hiện đại hơn cả hai lựa chọn ban đầu.

### [Q-002] LLM cho RAG: OpenAI API hay Ollama local?
- **Ngày**: 2026-03-04
- **Context**: OpenAI dễ dùng nhưng tốn tiền. Ollama free nhưng cần máy mạnh (RAM >= 16GB cho Llama 3 8B).
- **Kết luận**: Develop với OpenAI (nhanh debug), demo với Ollama nếu máy đủ mạnh. Fallback: dùng OpenAI free tier / API key từ thầy.

### [Q-003] Denormalized `available_quantity` hay computed COUNT?
- **Ngày**: 2026-05-15
- **Resolved**: 2026-05-15
- **Context**: Với model `book_copies` mới, `available_quantity` có thể tính từ `COUNT(copies WHERE status = AVAILABLE)` hoặc giữ denormalized trên `books`.
- **Kết luận**: Chọn **computed (COUNT)** — code đơn giản hơn, data luôn chính xác, performance chênh lệch không đáng kể (~1-2ms) với quy mô thư viện. Xóa cả `quantity` + `available_quantity` khỏi `books`.

### [Q-004] `due_date` trên borrow_slips hay borrow_records?
- **Ngày**: 2026-05-15
- **Resolved**: 2026-05-15
- **Context**: Nếu trên slips: tất cả sách trong cùng phiếu chung 1 hạn trả. Nếu trên records: mỗi cuốn hạn trả riêng.
- **Kết luận**: Chọn **trên borrow_slips** — khớp với thực tế thư viện (mượn cùng lúc = chung hạn trả), tránh data trùng lặp. `return_date` + `status` vẫn trên records (mỗi cuốn trả riêng).
