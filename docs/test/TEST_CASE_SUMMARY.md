# Test Case Summary

Tài liệu này tóm tắt các nhóm test hiện có trong hệ thống để phục vụ phần kiểm thử của đồ án. Danh sách tập trung vào mục tiêu kiểm thử chính, không liệt kê toàn bộ assertion chi tiết.

## Backend Tests

### Service Unit Tests

| Test suite | Nội dung chính |
| --- | --- |
| `AuthServiceTest` | Đăng ký sinh viên, chuẩn hóa input, bắt trùng MSSV. |
| `UserServiceTest` | Tạo user, đổi role/status, bắt buộc MSSV cho STUDENT, mở khóa hold ban. |
| `BookServiceTest` | Xem/tạo/xóa/tìm kiếm sách, gắn category, đồng bộ RAG sau commit. |
| `BookCopyServiceTest` | Danh sách bản sao, thêm/sửa/xóa bản sao, trạng thái bản sao, NFC tag, chống trùng tag. |
| `BookHoldServiceTest` | Tạo/hủy hold, chặn staff tạo hold, chặn user bị ban, xử lý hold hết hạn. |
| `BookHoldLifecycleServiceTest` | Lock và chuyển trạng thái hold, expire/cancel/fulfill, release copy, no-show ban. |
| `BorrowPolicyServiceTest` | Giới hạn mượn/đặt, loại hold hết hạn, chống mượn/đặt trùng, mixed hold/direct borrow. |
| `BorrowServiceTest` | Delegate luồng mượn/trả, confirm hold, pickup hold, khóa record khi trả, overdue notification. |
| `BorrowSlipCreationServiceTest` | Tạo một phiếu nhiều sách, batch borrow atomic, mixed hold/direct, pickup nhiều hold của một sinh viên. |
| `BorrowSlipServiceTest` | Xem danh sách phiếu mượn cá nhân và chi tiết phiếu mượn. |
| `NfcServiceTest` | Nhận diện UID user/book copy, chuẩn hóa UID, gán thẻ sinh viên, gán tag bản sao, chống trùng tag. |
| `NotificationServiceTest` | Tạo thông báo, phân quyền sở hữu, đánh dấu đã đọc một thông báo/toàn bộ thông báo. |
| `RagBookSyncServiceTest` | Gọi endpoint upsert/delete từng sách sang RAG service bằng internal key, lỗi sync không làm hỏng nghiệp vụ chính. |
| `SeedImportServiceTest` | Import sách idempotent, xử lý sách thiếu ISBN, backfill metadata. |
| `AuditLogServiceTest` | Map audit log entity sang response khi truy vấn danh sách. |

### Backend Integration And Controller Tests

| Test suite | Nội dung chính |
| --- | --- |
| `BorrowServiceIntegrationTest` | Kiểm thử transaction thật với PostgreSQL: một phiếu nhiều record, rollback khi item lỗi, confirm hold hết hạn vẫn lưu trạng thái expire. |
| `AuthControllerTest` | Validate API đăng ký sinh viên thiếu MSSV. |
| `UserControllerTest` | Phân quyền API mở khóa hold ban: ADMIN được phép, LIBRARIAN bị từ chối. |
| `BookHoldControllerTest` | STUDENT-only hold creation, lỗi `HOLD_EXPIRED`, batch pickup tạo borrow slip. |
| `BorrowSlipControllerTest` | ADMIN/LIBRARIAN tạo borrow slip, STUDENT bị từ chối, validate items và borrower identifiers. |
| `NfcControllerTest` | Phân quyền tìm sinh viên/gán NFC, validate UID rỗng, response gán thẻ. |
| `TimeConfigTest` | Xác nhận `Clock` dùng timezone ứng dụng `Asia/Ho_Chi_Minh`. |
| `BookSeedDtoTest` | Deserialize seed data snake_case tương thích dữ liệu cũ. |
| `ChatResponseTest` | Map response RAG snake_case sang DTO camelCase cho frontend. |
| `DemoApplicationTests` | Spring context load smoke test. |

## Frontend E2E Tests

| Playwright spec | Nội dung chính |
| --- | --- |
| `auth.spec.ts` | Đăng ký sinh viên, login admin, login student, redirect theo role. |
| `catalog.spec.ts` | Browse catalog, xem chi tiết sách, sinh viên đặt mượn từ trang chi tiết. |
| `admin-flow.spec.ts` | Luồng đầy đủ hold -> xác nhận mượn -> xem phiếu -> trả sách. |
| `book-mgmt.spec.ts` | Admin thêm sách, xem/thêm bản sao, xóa sách. |
| `notifications.spec.ts` | Sinh viên xem số thông báo và đánh dấu đã đọc. |
| `role-navigation.spec.ts` | Điều hướng 3 role, staff catalog read-only, admin-only routes, student-only routes. |
| `direct-borrow.spec.ts` | Mock API cho mượn tại quầy nhiều sách trong một `borrow-slip`, giữ danh sách khi request lỗi. |
| `kiosk-borrow-batch.spec.ts` | Mock SSE/API cho kiosk NFC, gửi nhiều sách trong một request `source = NFC`. |
| `nfc-tag-assignment.spec.ts` | Staff quét và gán NFC tag cho bản sao sách. |
| `nfc-student-card-assignment.spec.ts` | Librarian quét và gán thẻ NFC cho sinh viên. |

Ghi chú: E2E có global setup/teardown để dọn dữ liệu test trong PostgreSQL/ChromaDB/Redis, tránh để lại user, sách, hold, borrow slip, notification và vector rác sau khi chạy.

## RAG Service Tests

| Pytest suite | Nội dung chính |
| --- | --- |
| `test_classifier.py` | Phân loại intent câu hỏi chatbot. |
| `test_query_normalizer.py` | Chuẩn hóa câu hỏi tìm sách, giữ query semantic và lexical đúng mục đích. |
| `test_chat_context.py` | Lịch sử hội thoại, query rewrite, câu hỏi follow-up như "sách này...". |
| `test_rag.py` | Luồng RAG cơ bản và response tìm kiếm sách. |
| `test_rag_hybrid_search.py` | Hybrid retrieval PostgreSQL FTS + ChromaDB semantic + RRF, lọc match yếu. |
| `test_llm_service.py` | Gọi DeepSeek, xử lý lỗi API/rate limit, làm sạch output. |
| `test_api_query_service.py` | Truy vấn dữ liệu nghiệp vụ từ backend cho chatbot. |
| `test_api_query_dates.py` | Format ngày giờ hold/borrow đúng timezone. |
| `test_ingestion.py` | Full/incremental ingest sách vào ChromaDB, prune vector không còn trong PostgreSQL. |
| `test_admin_ingest_router.py` | API upsert/delete từng sách bằng internal key, validate bảo mật endpoint ingest. |

## Common Test Commands

```powershell
cd backend; mvn test
cd frontend; npm run build
cd frontend; npx playwright test
cd rag-service; pytest
```

Trong quyển, nên mô tả phạm vi là "kiểm thử các service nghiệp vụ trọng tâm, controller/API quan trọng, luồng E2E chính và RAG service", không nên ghi là đã benchmark hoặc kiểm thử toàn bộ mọi tình huống hiệu năng.
