# TỔNG HỢP NHẬN XÉT ĐỒ ÁN TỐT NGHIỆP — AWAKEN ANT LIBRARY

> **Sinh viên:** Nguyễn Hoàng Phúc — NH225905  
> **Hướng dẫn:** TS. Vũ Văn Thiệu  
> **Đề tài:** Xây dựng website quản lý thư viện  
> **Ngày:** 06/2026

---

## KẾT QUẢ ĐÁNH GIÁ TỔNG HỢP (SAU 2 LẦN CHẠY SUBAGENT)

### Điểm tổng thể: **8.2 / 10** — Xếp loại: **Giỏi**

| Tiêu chí | Trọng số | Điểm TB 2 lần | Ghi chú |
|---|---|---|---|
| Độ chi tiết nội dung | 20% | 7.0 | Chương 3 còn sơ sài |
| Giọng văn & văn phong | 15% | 7.3 | Súc tích chưa tốt, lặp ý |
| Tính minh hoạ & trực quan | 15% | 7.6 | Thiếu hình ở Ch.3 & Ch.5 |
| Cấu trúc & bố cục | 15% | 6.6 | Mất cân đối độ dài |
| So sánh với tham khảo | 15% | 7.0 | Thiếu phụ lục, số liệu |
| Chất lượng kỹ thuật tổng thể | 20% | 9.0 | Điểm mạnh nhất |

---

## A. ĐIỂM MẠNH NỔI BẬT

### 1. Kiến trúc RAG Intent Router (Xuất sắc)
Pipeline AI kết hợp SVM intent classifier + hybrid retrieval (PostgreSQL FTS + ChromaDB semantic) + RRF fusion + DeepSeek LLM + guardrail chống hallucination. Đây là thiết kế **vượt trội so với mặt bằng đồ án sinh viên**. Đặc biệt, việc tách intent classifier khỏi LLM giúp tiết kiệm chi phí API và latency cho câu hỏi đơn giản.

### 2. Thiết kế nghiệp vụ chặt chẽ
Mô hình `BorrowSlip`-`BorrowRecord`, hold lifecycle 24h, pessimistic locking, batch borrow atomic transaction, computed quantities thay vì denormalized fields — thể hiện tư duy kỹ sư phần mềm chuyên nghiệp.

### 3. Tích hợp đa công nghệ (Full-stack + AI + IoT)
Java Spring Boot + React TypeScript + Python FastAPI + ESP32/RC522 NFC + Docker — phạm vi kỹ thuật rộng, tất cả đều chạy được và kiểm thử bài bản.

### 4. UML đa dạng và đúng chuẩn
5 use case diagrams, 3 sequence diagrams, package diagram, class diagram, activity diagram với swimlane, ERD deployment diagram — **đầy đủ hơn 2 file tham khảo**.

---

## B. ĐIỂM YẾU CẦN CẢI THIỆN GẤP

### 🔴 Critical: Chương 3 (Công nghệ) quá sơ sài
| Vấn đề | Mức độ | Đề xuất |
|--------|--------|---------|
| 106 dòng cho 8 nhóm công nghệ, **không có hình vẽ nào** | Nghiêm trọng | Thêm lưu đồ pipeline RAG, sơ đồ SVM Intent Router, sơ đồ kiến trúc NFC |
| Mang tính "sách giáo khoa", thiếu bài toán cụ thể | Nghiêm trọng | Viết lại theo cấu trúc Problem → Solution → Tại sao chọn |
| Thiếu số liệu: accuracy SVM, benchmark RAG, confusion matrix | Nghiêm trọng | Bổ sung bảng precision/recall/F1, so sánh lexical vs semantic vs hybrid |
| Tham khảo (Việt/Minh) dành **40+ trang** cho phần tương đương | Nghiêm trọng | Cần mở rộng gấp 3-4 lần |

### 🔴 Critical: Thiếu phụ lục (Appendix)
| Vấn đề | File tham khảo có | Đề xuất |
|--------|-------------------|---------|
| Không có bảng thuộc tính CSDL chi tiết | Phụ lục C (7 bảng) | Thêm Phụ lục: 10 bảng PostgreSQL với kiểu, ràng buộc, mô tả |
| Không có danh sách API endpoints | Bảng 4.5-4.8 | Thêm Phụ lục: method, path, request/response, auth |
| Không có bảng trạng thái vòng đời | Phụ lục A | Thêm state machine: CopyStatus, HoldStatus, BorrowStatus |
| Không có đặc tả use case bổ sung | Phụ lục B | Thêm các UC còn lại (đăng nhập, quản lý user, gán NFC, audit log) |

### 🔴 Critical: Lặp nội dung giữa Chương 3 và Chương 5
Pipeline RAG được mô tả **5 lần** ở các chương khác nhau với nội dung gần như nhau. **Giải pháp:**
- Chương 3: chỉ giới thiệu khái niệm + lý do chọn (tóm gọn 2-3 trang)
- Chương 5: chi tiết pipeline + tại sao đây là đóng góp (so sánh với alternatives)
- Loại bỏ mô tả RAG thừa ở Chương 1 và Chương 4

### 🟡 High: Thiếu số liệu định lượng
| Thiếu | Gợi ý bổ sung |
|-------|---------------|
| API response time benchmark | Dùng k6/JMeter đo p50/p95/p99 cho 5 endpoint chính |
| SVM accuracy / confusion matrix | Train/test split report (115 samples) |
| RAG hit rate / retrieval quality | Đo NDCG@k thủ công trên 20-30 câu hỏi mẫu |
| NFC speed improvement | So sánh thời gian mượn: thủ công vs web vs NFC (giây/giao dịch) |
| Cache effectiveness | Cache hit ratio, response time có cache vs không cache |
| **File tham khảo đã có benchmark, đồ án cần bổ sung gấp** |

### 🟡 High: Chương 4 quá dài (557 dòng), Chương 6 quá ngắn (62 dòng)
- Chương 4 gộp quá nhiều: kiến trúc + thiết kế giao diện + thiết kế lớp + CSDL + xây dựng + kiểm thử + triển khai
- **Đề xuất:** Tách Chương 4 thành 2 chương hoặc chuyển bớt nội dung sang phụ lục
- Chương 6: thêm bảng tự đánh giá mục tiêu, bảng so sánh với Koha chi tiết hơn

### 🟡 Medium: Văn phong còn dài dòng, lặp ý
- Các câu dài >40 từ, thiếu dấu ngắt
- Đoạn liệt kê "Nhóm... gồm" x4 liên tiếp (Chương 4)
- **Đề xuất:** Rút gọn, thêm câu dẫn, biến liệt kê thành lập luận. Tham khảo Việt/Minh viết tự nhiên hơn.

### 🟢 Nice-to-have: Thiếu số liệu người dùng thực tế
- File tham khảo có "50+ người dùng nội bộ, 1200+ slide" — rất thuyết phục
- Đồ án nếu có thể: mời 5-10 sinh viên dùng thử, ghi nhận phản hồi (Likert scale), đưa vào báo cáo

---

## C. SO SÁNH VỚI 2 FILE THAM KHẢO

| Khía cạnh | Đồ án chính | Tham khảo (Việt) | Tham khảo (Minh) |
|-----------|-------------|-------------------|-------------------|
| **Kỹ thuật** | RAG + SVM + NFC + Locking (đa dạng) | Pipeline xử lý PPTX (sâu 1 mảng) | Pipeline xử lý PPTX (sâu 1 mảng) |
| **UML** | ✅ 5 use case, 3 sequence, package, class, activity, ERD | ❌ Chỉ use case + tổng quan | ❌ Chỉ use case + tổng quan |
| **Lưu đồ thuật toán** | ❌ Không có | ✅ 6 lưu đồ (Hình 3.4-3.9) | ✅ 6 lưu đồ |
| **Bảng thuộc tính CSDL** | ❌ Không có | ✅ Phụ lục C (7 bảng) | ✅ Phụ lục C |
| **Số liệu người dùng thật** | ❌ Chưa có | ✅ 50+ users, 1200+ slides | ✅ 50+ users, 1200+ slides |
| **Benchmark** | ❌ Không có | ✅ Bảng 5.1 (response time) | ✅ Bảng 5.1 |
| **Proof of correctness** | ❌ Không có | ✅ Mục 3.2.7 | ✅ Mục 3.2.7 |
| **Phụ lục** | ❌ 0 | ✅ 3 phụ lục | ✅ 3 phụ lục |
| **Số lượng bảng** | ~19 | ~30+ | ~30+ |
| **Kiến trúc** | Microservice + Layered | Event-driven + Microservice | Event-driven + Microservice |
| **Triển khai** | Docker DigitalOcean | Tích hợp Vbee AIVoice | Tích hợp Vbee AIVoice |

### File tham khảo làm tốt hơn:
1. Lưu đồ thuật toán + Proof of correctness
2. Phụ lục chi tiết (bảng thuộc tính CSDL, API endpoints)
3. Số liệu người dùng thật + benchmark
4. Cấu trúc giải pháp tổng thể trước thiết kế (Chương 2)

### Đồ án chính làm tốt hơn:
1. UML đa dạng và đúng chuẩn hơn nhiều
2. Thiết kế nghiệp vụ chặt chẽ (pessimistic locking, atomic borrow slip)
3. Tích hợp AI + IoT cùng lúc
4. Đặc tả use case chi tiết hơn (7 bảng)
5. Deployment production thực tế

---

## D. LỘ TRÌNH CẢI THIỆN (THEO THỨ TỰ ƯU TIÊN)

| # | Hành động | Tác động | Thời gian ước tính |
|---|-----------|----------|-------------------|
| 1 | **Mở rộng Chương 3**: thêm lưu đồ pipeline RAG, sơ đồ SVM, sơ đồ NFC + bảng so sánh công nghệ định lượng | ⭐⭐⭐ | 3-4 ngày |
| 2 | **Thêm Phụ lục A-B-C**: thuộc tính CSDL, API endpoints, đặc tả UC bổ sung | ⭐⭐⭐ | 2-3 ngày |
| 3 | **Bổ sung benchmark**: response time, cache hit rate, SVM accuracy, RAG hit rate | ⭐⭐⭐ | 2-3 ngày |
| 4 | **Cắt overlap Chương 3–Chương 5**: rút gọn Ch.3, chuyển chi tiết về Ch.5 | ⭐⭐ | 1-2 ngày |
| 5 | **Thêm state machine diagram** cho BookHold và BorrowRecord | ⭐⭐ | 1 ngày |
| 6 | **Tái phân bổ Chương 4**: tách hoặc chuyển bớt nội dung sang phụ lục | ⭐⭐ | 1-2 ngày |
| 7 | **Cải thiện văn phong**: rút gọn câu dài, thêm câu dẫn, giảm liệt kê | ⭐ | 1 ngày |
| 8 | **Bổ sung phân tích bảo mật**: JWT, CORS, SQL injection, rate limiting | ⭐ | 1 ngày |

---

## E. TỔNG KẾT

Đồ án **Awaken Ant Library** là một sản phẩm **chất lượng cao, đạt chuẩn đồ án tốt nghiệp loại Giỏi đến Xuất sắc**. Điểm mạnh vượt trội là kiến trúc kỹ thuật sâu sắc, UML đa dạng và đúng chuẩn, tích hợp thành công AI + IoT trong một hệ thống thống nhất.

**Ba việc cần làm ngay để nâng từ 8.2 → 9.0+:**

1. 🔴 **Mở rộng Chương 3**: thêm hình vẽ, số liệu, lưu đồ — đây là điểm yếu nhất so với tham khảo
2. 🔴 **Thêm Phụ lục**: ít nhất 3 phụ lục (CSDL, API, UC bổ sung) — tham khảo đều có
3. 🔴 **Bổ sung benchmark**: không thể thiếu số liệu hiệu năng và chất lượng AI trong đồ án kỹ thuật

> *"Đồ án có nền tảng kỹ thuật rất tốt, nhưng cần đầu tư thêm vào phần trình bày số liệu và phụ lục để đạt chuẩn đồ án xuất sắc."*
