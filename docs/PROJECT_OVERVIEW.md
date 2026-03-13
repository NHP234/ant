# Project Overview - Hệ thống Quản lý Thư viện

## Thông tin chung

- **Sinh viên**: Năm 4, ngành CNTT Việt Nhật, ĐH Bách Khoa Hà Nội
- **Loại**: Đồ án tốt nghiệp cử nhân
- **Hình thức**: Solo project
- **Timeline**: 4-5 tháng (bắt đầu ~03/2026)
- **Trọng tâm kỹ thuật**: Backend SpringBoot (đào sâu kiến trúc, patterns, testing)

## Mô tả dự án

Web application quản lý mượn trả sách thư viện, tích hợp:
- **RAG chatbot**: Tìm kiếm/hỏi đáp thông minh về sách bằng ngôn ngữ tự nhiên
- **NFC**: Demo quẹt thẻ để mượn/trả sách (bonus feature)

## Tech Stack

### Backend (Trọng tâm)
- Spring Boot 3.x + Java 17+
- Spring Security (JWT + Refresh Token, RBAC)
- Spring Data JPA + PostgreSQL
- Spring Cache + Redis
- Elasticsearch (full-text search)
- Spring AOP (audit logging)
- MapStruct (DTO mapping)
- Swagger/OpenAPI 3
- JUnit 5 + Mockito
- Flyway (DB migration)
- Docker + Docker Compose

### Frontend (Phụ trợ)
- React 18 + Vite
- Ant Design hoặc MUI
- TanStack Query (React Query)
- React Router v6
- Axios

### AI Service (Điểm nhấn)
- Python FastAPI
- LangChain + ChromaDB
- OpenAI API hoặc Ollama (local LLM)

### NFC (Bonus)
- USB NFC Reader (ACR122U)
- Python script giao tiếp serial/USB

## Kiến trúc tổng thể

```
[React Frontend] <--REST--> [SpringBoot Backend] <--REST--> [FastAPI RAG Service]
                                    |                              |
                              [PostgreSQL]                    [ChromaDB]
                              [Redis Cache]
                              [Elasticsearch]
                              [NFC Reader]
```

### Luồng chính:
1. User tương tác qua React UI
2. React gọi REST API tới SpringBoot
3. SpringBoot xử lý business logic, trả kết quả
4. Khi user dùng chat RAG: SpringBoot proxy request tới FastAPI service
5. FastAPI dùng LangChain query ChromaDB + LLM, trả kết quả

### Roles:
- **ADMIN**: Quản lý toàn bộ hệ thống, users, books, thống kê
- **LIBRARIAN**: Quản lý sách, xử lý mượn/trả
- **STUDENT**: Tìm kiếm sách, đặt mượn, chat RAG, xem lịch sử

## Cấu trúc thư mục dự kiến

```
d:\ant\
├── docs/                    # Documentation & context
├── backend/                 # SpringBoot project
│   └── src/main/java/com/library/
│       ├── config/          # Security, Redis, Elasticsearch config
│       ├── controller/      # REST controllers
│       ├── service/         # Business logic
│       ├── repository/      # Data access
│       ├── model/           # JPA entities
│       ├── dto/             # Request/Response DTOs
│       ├── mapper/          # MapStruct mappers
│       ├── security/        # JWT, filters
│       ├── exception/       # Custom exceptions + handler
│       └── util/            # Utilities
├── frontend/                # React project
│   └── src/
│       ├── components/      # Reusable components
│       ├── pages/           # Page components
│       ├── hooks/           # Custom hooks
│       ├── services/        # API calls
│       └── utils/           # Utilities
├── rag-service/             # Python FastAPI
│   ├── app/
│   ├── requirements.txt
│   └── Dockerfile
├── nfc-service/             # NFC reader script
├── docker-compose.yml       # Orchestration
└── .cursor/rules/           # Cursor AI context
```

## Tham khảo nhanh các file docs khác

| File | Nội dung |
|------|----------|
| PROGRESS.md | Tiến độ theo tuần, checklist |
| BACKEND.md | Chi tiết kiến trúc backend |
| DATABASE.md | Schema, migrations |
| FRONTEND.md | Components, routing |
| RAG_SERVICE.md | RAG pipeline, prompts |
| NFC.md | Hardware setup, integration |
| API_SPEC.md | Danh sách API endpoints |
| DECISIONS.md | Lý do chọn công nghệ/pattern |
| ISSUES.md | Bugs, blockers, questions |
