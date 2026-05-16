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

_(Chưa có issue nào)_

---

## Resolved Issues

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
