# Architectural Decision Records (ADR)

> Ghi lại các quyết định kiến trúc quan trọng và lý do. Rất hữu ích khi hội đồng hỏi "Tại sao em chọn cái này?".

---

## ADR-001: Chọn SpringBoot làm Backend Framework

**Ngày**: 2026-03-04  
**Trạng thái**: Accepted

**Context**: Cần chọn backend framework cho web app quản lý thư viện.

**Lựa chọn xem xét**:
- Spring Boot (Java)
- Express.js (Node.js)
- Django (Python)
- .NET (C#)

**Quyết định**: Spring Boot 3.x

**Lý do**:
- Đã có kiến thức cơ bản từ khóa học (CRUD, JWT, BCrypt)
- Đồ án tập trung đào sâu backend -> Spring ecosystem rất phong phú (Security, Cache, AOP, Data JPA)
- Enterprise-grade framework, phù hợp cho đồ án cấp cử nhân
- Cộng đồng lớn, tài liệu nhiều
- Phù hợp xin việc tại thị trường Việt Nam và Nhật Bản

---

## ADR-002: Chọn PostgreSQL thay vì MySQL

**Ngày**: 2026-03-04  
**Trạng thái**: Accepted

**Context**: Chọn RDBMS cho hệ thống.

**Quyết định**: PostgreSQL

**Lý do**:
- Full-text search tốt hơn MySQL (hỗ trợ tsvector, fallback nếu không dùng Elasticsearch)
- JSON support tốt (lưu audit log details dạng JSONB)
- Partial index support (index chỉ trên records đang active)
- Miễn phí, production-ready
- Docker image nhẹ, dễ setup

---

## ADR-003: Tách RAG Service thành Microservice Python riêng

**Ngày**: 2026-03-04  
**Trạng thái**: Accepted

**Context**: RAG cần dùng LangChain, ChromaDB (Python ecosystem). Có thể tích hợp vào SpringBoot (qua Jython/GraalPy) hoặc tách riêng.

**Quyết định**: Tách thành FastAPI microservice riêng

**Lý do**:
- LangChain, ChromaDB, sentence-transformers đều là Python-native, chạy trên Python hiệu quả nhất
- Tách riêng giúp phát triển/deploy/scale độc lập
- SpringBoot gọi qua REST -> loose coupling
- Nếu RAG service chết, hệ thống chính vẫn hoạt động (graceful degradation)
- Thể hiện kiến trúc microservice trong đồ án (điểm cộng)

**Trade-off**: Thêm complexity (network call, deploy thêm service), nhưng lợi ích vượt trội.

---

## ADR-004: Dùng Redis cho Caching

**Ngày**: 2026-03-04  
**Trạng thái**: Accepted

**Context**: Cần caching để cải thiện performance.

**Lựa chọn**: In-memory cache (Caffeine) vs Distributed cache (Redis)

**Quyết định**: Redis

**Lý do**:
- Production-ready distributed cache
- Thể hiện kiến thức về distributed systems
- Dễ setup qua Docker
- Spring Cache abstraction hỗ trợ tốt
- Có thể mở rộng dùng cho session store, rate limiting nếu cần

---

## ADR-005: Dùng MapStruct thay vì manual mapping

**Ngày**: 2026-03-04  
**Trạng thái**: Accepted

**Context**: Cần convert Entity <-> DTO.

**Lựa chọn**: Manual mapping / ModelMapper / MapStruct

**Quyết định**: MapStruct

**Lý do**:
- Compile-time code generation -> type-safe, phát hiện lỗi sớm
- Performance tốt hơn runtime reflection (ModelMapper)
- Code generated rõ ràng, debug được
- Spring integration tốt

---

## ADR-006: Flyway cho Database Migration

**Ngày**: 2026-03-04  
**Trạng thái**: Accepted

**Context**: Cần quản lý database schema changes.

**Quyết định**: Flyway (thay vì Liquibase hoặc manual SQL)

**Lý do**:
- SQL-based migration (dễ hiểu, dễ viết)
- Spring Boot auto-configuration
- Version tracking tự động
- Simpler than Liquibase cho project size này

---

## Template cho ADR mới

```
## ADR-XXX: [Tiêu đề]

**Ngày**: YYYY-MM-DD
**Trạng thái**: Proposed / Accepted / Deprecated / Superseded

**Context**: [Mô tả vấn đề cần giải quyết]

**Lựa chọn xem xét**: [Các option đã cân nhắc]

**Quyết định**: [Option được chọn]

**Lý do**: [Tại sao chọn option này]

**Trade-off**: [Nhược điểm chấp nhận được]
```
