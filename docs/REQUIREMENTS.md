# Phân tích Yêu cầu & Nghiệp vụ

## 1. Bài toán thực tế

### 1.1. Hiện trạng quản lý thư viện truyền thống

Tại nhiều thư viện trường đại học, đặc biệt các thư viện khoa/viện quy mô nhỏ-vừa, quy trình quản lý mượn trả sách vẫn tồn tại nhiều bất cập:

**Về phía thủ thư:**
- Quản lý mượn trả bằng sổ tay hoặc file Excel, dễ sai sót khi số lượng sinh viên lớn;
- Không có cơ chế tự động nhắc nhở sinh viên trả sách quá hạn, phải kiểm tra thủ công;
- Khó thống kê: sách nào được mượn nhiều, sách nào ít được quan tâm, tỷ lệ quá hạn;
- Tốn thời gian tìm kiếm sách trong kho khi sinh viên hỏi tư vấn;
- Quy trình mượn/trả tại quầy chậm: phải ghi tay, tra cứu thủ công.

**Về phía sinh viên:**
- Không biết sách mình cần có ở thư viện không, phải đến tận nơi mới biết;
- Tìm kiếm sách chỉ theo đúng tên/tác giả, không thể mô tả nhu cầu bằng ngôn ngữ tự nhiên ("có sách nào dạy Java cho người mới bắt đầu không?");
- Không biết mình đang mượn bao nhiêu sách, sách nào sắp đến hạn trả;
- Không có hệ thống gợi ý sách phù hợp với nhu cầu học tập.

**Về phía quản lý (trưởng thư viện / admin):**
- Thiếu dữ liệu để ra quyết định: nên bổ sung sách gì, loại sách nào cần mua thêm;
- Không có cái nhìn tổng quan về hoạt động thư viện;
- Khó kiểm soát tài sản sách (mất mát, hư hỏng).

### 1.2. Giải pháp đề xuất

Xây dựng **hệ thống web quản lý mượn trả sách thư viện** giải quyết toàn bộ các vấn đề trên, với 3 điểm nhấn:

1. **Quản lý mượn trả trực tuyến**: Thay thế sổ tay/Excel, số hóa toàn bộ quy trình
2. **Chatbot AI (RAG)**: Sinh viên tìm kiếm sách bằng ngôn ngữ tự nhiên, hệ thống gợi ý sách phù hợp
3. **NFC**: Tăng tốc quy trình mượn/trả tại quầy bằng quẹt thẻ

---

## 2. Đối tượng sử dụng (Actors)

### 2.1. Sinh viên (STUDENT)
- Người dùng chính, số lượng lớn nhất
- Nhu cầu: tìm sách, mượn sách, xem lịch sử, nhận thông báo, hỏi chatbot

### 2.2. Thủ thư (LIBRARIAN)
- Người vận hành hệ thống hàng ngày
- Nhu cầu: quản lý sách, xử lý mượn/trả (bao gồm quẹt NFC), xem thống kê, gửi thông báo

### 2.3. Quản trị viên (ADMIN)
- Quản lý toàn bộ hệ thống
- Nhu cầu: quản lý users, phân quyền, cấu hình hệ thống, xem báo cáo tổng quan

---

## 3. Yêu cầu chức năng (Functional Requirements)

### FR-01: Quản lý tài khoản & Xác thực
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-01.1 | Sinh viên đăng ký tài khoản (username, email, mật khẩu, họ tên, MSSV) | Cao |
| FR-01.2 | Đăng nhập bằng username/password, nhận JWT token | Cao |
| FR-01.3 | Refresh token khi JWT hết hạn | Cao |
| FR-01.4 | Đăng xuất (invalidate refresh token) | Cao |
| FR-01.5 | Phân quyền theo role: ADMIN, LIBRARIAN, STUDENT | Cao |
| FR-01.6 | Admin tạo/sửa/khóa tài khoản, thay đổi role | Trung bình |
| FR-01.7 | User xem và cập nhật thông tin cá nhân | Trung bình |

### FR-02: Quản lý sách
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-02.1 | LIBRARIAN/ADMIN thêm sách mới (tên, tác giả, ISBN, mô tả, số lượng, ảnh bìa, thể loại) | Cao |
| FR-02.2 | LIBRARIAN/ADMIN cập nhật thông tin sách | Cao |
| FR-02.3 | ADMIN xóa sách | Trung bình |
| FR-02.4 | Tất cả user xem danh sách sách (phân trang, sắp xếp) | Cao |
| FR-02.5 | Xem chi tiết sách (thông tin đầy đủ + trạng thái còn/hết) | Cao |
| FR-02.6 | Tìm kiếm sách theo tên, tác giả (full-text search) | Cao |
| FR-02.7 | Lọc sách theo thể loại (category) | Trung bình |

### FR-03: Quản lý thể loại sách
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-03.1 | ADMIN thêm/sửa/xóa thể loại | Trung bình |
| FR-03.2 | Xem danh sách thể loại | Trung bình |
| FR-03.3 | Mỗi sách thuộc một hoặc nhiều thể loại | Trung bình |

### FR-04: Mượn / Trả sách
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-04.1 | Sinh viên đặt mượn sách trên web (nếu sách còn available) | Cao |
| FR-04.2 | LIBRARIAN xác nhận mượn / trả sách | Cao |
| FR-04.3 | Hệ thống tự giảm available_quantity khi mượn, tăng khi trả | Cao |
| FR-04.4 | Giới hạn số sách mượn đồng thời (mặc định 5 cuốn) | Cao |
| FR-04.5 | Không cho mượn sách đã hết (available_quantity = 0) | Cao |
| FR-04.6 | Không cho mượn cuốn sách đang mượn (chưa trả) | Cao |
| FR-04.7 | Hạn trả mặc định 14 ngày, configurable | Cao |
| FR-04.8 | Sinh viên xem lịch sử mượn trả của mình | Trung bình |
| FR-04.9 | LIBRARIAN/ADMIN xem tất cả borrow records, lọc theo trạng thái | Trung bình |
| FR-04.10 | LIBRARIAN/ADMIN xem danh sách sách quá hạn | Trung bình |

### FR-05: Thông báo
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-05.1 | Thông báo xác nhận khi mượn sách thành công | Trung bình |
| FR-05.2 | Thông báo xác nhận khi trả sách thành công | Trung bình |
| FR-05.3 | Tự động cảnh báo khi sách sắp quá hạn (trước 2 ngày) | Trung bình |
| FR-05.4 | Tự động cảnh báo khi sách đã quá hạn | Trung bình |
| FR-05.5 | Xem danh sách thông báo, đánh dấu đã đọc | Trung bình |
| FR-05.6 | Hiển thị số thông báo chưa đọc (badge) | Thấp |

### FR-06: Dashboard & Thống kê
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-06.1 | Thống kê tổng quan: tổng sách, tổng user, đang mượn, quá hạn | Trung bình |
| FR-06.2 | Top sách phổ biến (được mượn nhiều nhất) | Trung bình |
| FR-06.3 | Hoạt động gần đây (mượn/trả gần nhất) | Thấp |
| FR-06.4 | Thống kê theo thời gian (số lượt mượn theo tháng) | Thấp |

### FR-07: Chatbot AI (RAG)
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-07.1 | Sinh viên hỏi bằng ngôn ngữ tự nhiên, chatbot trả lời và gợi ý sách | Cao |
| FR-07.2 | Chatbot trả lời dựa trên dữ liệu sách thực tế trong thư viện (RAG) | Cao |
| FR-07.3 | Hiển thị danh sách sách liên quan kèm theo câu trả lời | Trung bình |
| FR-07.4 | Hỗ trợ tiếng Việt | Trung bình |
| FR-07.5 | Fallback khi AI service không khả dụng (hiện thông báo lỗi) | Trung bình |

### FR-08: NFC (Bonus)
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-08.1 | ADMIN/LIBRARIAN đăng ký thẻ NFC cho sinh viên (gán UID -> user) | Thấp |
| FR-08.2 | ADMIN/LIBRARIAN đăng ký NFC tag cho sách (gán UID -> book) | Thấp |
| FR-08.3 | Quẹt thẻ sinh viên -> nhận diện user | Thấp |
| FR-08.4 | Quẹt tag sách -> nhận diện sách | Thấp |
| FR-08.5 | Flow mượn nhanh: quẹt thẻ SV + quẹt sách -> tạo borrow record | Thấp |
| FR-08.6 | Flow trả nhanh: quẹt thẻ SV -> hiện sách đang mượn -> quẹt sách trả | Thấp |

### FR-09: Audit Log
| ID | Mô tả | Độ ưu tiên |
|----|-------|-----------|
| FR-09.1 | Tự động ghi log mọi hành động quan trọng (mượn, trả, thêm/xóa sách) | Thấp |
| FR-09.2 | ADMIN xem audit log (ai làm gì, khi nào) | Thấp |

---

## 4. Yêu cầu phi chức năng (Non-Functional Requirements)

| ID | Mô tả | Chi tiết |
|----|-------|----------|
| NFR-01 | Bảo mật | JWT authentication, BCrypt password hashing, role-based authorization, CORS config |
| NFR-02 | Hiệu năng | Response time < 500ms cho API thông thường, caching với Redis cho dữ liệu ít thay đổi |
| NFR-03 | Khả dụng | Hệ thống chính vẫn hoạt động khi RAG service hoặc NFC service ngừng (graceful degradation) |
| NFR-04 | Khả năng mở rộng | Kiến trúc microservice, mỗi service có thể scale độc lập |
| NFR-05 | Dễ triển khai | Toàn bộ stack chạy bằng 1 lệnh docker-compose up |
| NFR-06 | Dễ bảo trì | Clean architecture, DTO pattern, migration-based schema changes |
| NFR-07 | Tương thích | Frontend responsive, hoạt động trên Chrome, Firefox, Edge |
| NFR-08 | Dữ liệu | Atomic operations khi cập nhật available_quantity, đảm bảo consistency |

---

## 5. Quy tắc nghiệp vụ (Business Rules)

| ID | Quy tắc | Mô tả |
|----|---------|-------|
| BR-01 | Giới hạn mượn | Mỗi sinh viên mượn tối đa 5 cuốn cùng lúc (configurable) |
| BR-02 | Hạn trả | Mặc định 14 ngày kể từ ngày mượn (configurable) |
| BR-03 | Không mượn trùng | Sinh viên không thể mượn cuốn sách mình đang mượn (chưa trả) |
| BR-04 | Kiểm tra tồn kho | Chỉ cho mượn khi available_quantity > 0 |
| BR-05 | Quá hạn | Sách quá hạn được hệ thống tự chuyển trạng thái BORROWING -> OVERDUE hàng ngày |
| BR-06 | Cảnh báo sớm | Thông báo cảnh báo trước 2 ngày khi sách sắp đến hạn |
| BR-07 | Quyền xóa | Chỉ ADMIN được xóa sách và user |
| BR-08 | Đăng ký mặc định | User mới đăng ký có role STUDENT, chỉ ADMIN thay đổi role |
| BR-09 | NFC duy nhất | Mỗi thẻ NFC chỉ gán cho 1 user, mỗi tag NFC chỉ gán cho 1 sách |
| BR-10 | Trả sách | Chỉ LIBRARIAN/ADMIN mới xác nhận trả sách (sinh viên không tự trả trên web) |

---

## 6. Use Cases chính

### UC-01: Sinh viên tìm và mượn sách

```
Actor: Sinh viên
Precondition: Đã đăng nhập, chưa đạt giới hạn mượn
Flow:
  1. Sinh viên vào trang danh sách sách
  2. Tìm kiếm theo tên/tác giả hoặc dùng chatbot RAG
  3. Xem chi tiết sách, kiểm tra trạng thái "Còn sách"
  4. Bấm "Mượn sách"
  5. Hệ thống kiểm tra: chưa mượn trùng, chưa đạt giới hạn, còn available
  6. Tạo borrow_record (status=BORROWING, due_date=now+14 ngày)
  7. Giảm available_quantity
  8. Gửi notification xác nhận cho sinh viên
Postcondition: Borrow record được tạo, available_quantity giảm 1
Exception:
  - 5a. Đã mượn cuốn này -> thông báo lỗi
  - 5b. Đạt giới hạn 5 cuốn -> thông báo lỗi
  - 5c. Hết sách -> thông báo lỗi
```

### UC-02: Thủ thư xử lý trả sách

```
Actor: Thủ thư (LIBRARIAN)
Precondition: Đã đăng nhập, sinh viên mang sách đến trả
Flow:
  1. Thủ thư tìm borrow record (theo tên SV hoặc quẹt thẻ NFC)
  2. Hệ thống hiện danh sách sách đang mượn của sinh viên
  3. Thủ thư chọn sách được trả (hoặc quẹt tag NFC trên sách)
  4. Bấm "Xác nhận trả"
  5. Hệ thống cập nhật: return_date=now, status=RETURNED
  6. Tăng available_quantity
  7. Gửi notification xác nhận cho sinh viên
Postcondition: Borrow record cập nhật, available_quantity tăng 1
```

### UC-03: Mượn/trả nhanh bằng NFC

```
Actor: Thủ thư + Sinh viên
Precondition: Thủ thư đã đăng nhập, NFC reader kết nối, thẻ SV và tag sách đã đăng ký

Flow mượn:
  1. Thủ thư bấm "Phiên mượn mới"
  2. Sinh viên đưa thẻ, thủ thư quẹt thẻ SV -> hệ thống hiện thông tin SV
  3. Thủ thư quẹt tag NFC trên sách -> sách được thêm vào danh sách mượn
  4. Quẹt thêm sách nếu cần
  5. Thủ thư bấm "Xác nhận mượn"
  6. Hệ thống tạo borrow_records cho tất cả sách

Flow trả:
  1. Thủ thư bấm "Phiên trả sách"
  2. Quẹt thẻ SV -> hiện danh sách sách đang mượn
  3. Quẹt tag sách trả -> sách được tick trong danh sách
  4. Thủ thư bấm "Xác nhận trả"
```

### UC-04: Sinh viên hỏi chatbot AI

```
Actor: Sinh viên
Precondition: Đã đăng nhập, RAG service đang chạy
Flow:
  1. Sinh viên mở chat widget
  2. Nhập câu hỏi bằng ngôn ngữ tự nhiên
     VD: "Có sách nào dạy machine learning cho người mới không?"
  3. Hệ thống gửi câu hỏi tới RAG service
  4. RAG service: embed câu hỏi -> tìm sách tương tự trong ChromaDB -> build prompt -> gọi LLM
  5. Trả về câu trả lời + danh sách sách liên quan
  6. Sinh viên có thể click vào sách gợi ý để xem chi tiết / mượn
Exception:
  - 3a. RAG service không khả dụng -> hiện thông báo "Chatbot đang bảo trì"
```

### UC-05: Hệ thống kiểm tra sách quá hạn (tự động)

```
Actor: Hệ thống (Scheduled task)
Trigger: Chạy tự động mỗi ngày lúc 00:00
Flow:
  1. Query tất cả borrow_records có status=BORROWING và due_date < now
  2. Cập nhật status -> OVERDUE
  3. Gửi notification "Sách X đã quá hạn" cho sinh viên
  4. Query borrow_records có status=BORROWING và due_date trong 2 ngày tới
  5. Gửi notification cảnh báo "Sách X sắp đến hạn trả" cho sinh viên
```

---

## 7. Phạm vi đồ án

### Trong phạm vi (In scope):
- Quản lý sách, thể loại, người dùng (CRUD)
- Mượn/trả sách với business rules đầy đủ
- Xác thực JWT + phân quyền 3 roles
- Chatbot RAG tìm kiếm sách bằng ngôn ngữ tự nhiên
- NFC mượn/trả nhanh tại quầy
- Thông báo in-app
- Dashboard thống kê cơ bản
- Docker deployment

### Ngoài phạm vi (Out of scope):
- Thanh toán phí phạt online
- Đặt trước sách (reservation/hold)
- Quản lý nhiều chi nhánh thư viện
- Mobile app (chỉ có responsive web)
- Email notification (chỉ in-app notification)
- Barcode/QR code (chỉ dùng NFC)
- Quản lý tình trạng sách (hư hỏng, mất)
