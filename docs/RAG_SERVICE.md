# RAG Service - AI Chatbot tìm kiếm sách

> Microservice Python (FastAPI) cung cấp chức năng hỏi đáp thông minh về sách.

## Mục đích

Cho phép sinh viên tương tác bằng ngôn ngữ tự nhiên:
- "Có sách nào về machine learning cho người mới không?"
- "Gợi ý sách lập trình Java"
- "Sách nào của tác giả Nguyễn Văn A?"
- "Tôi muốn học về database, nên đọc sách gì?"

## Tech Stack

- Python 3.10+
- FastAPI (REST API)
- LangChain (RAG orchestration)
- ChromaDB (vector database, chạy embedded)
- Sentence-Transformers hoặc OpenAI Embeddings
- OpenAI GPT-3.5/4 hoặc Ollama (Llama 3, Gemma) cho LLM

## Architecture

```
User question
    |
    v
[FastAPI endpoint: POST /api/chat]
    |
    v
[Embed question] --> sentence-transformers / OpenAI
    |
    v
[Query ChromaDB] --> top-k similar book descriptions
    |
    v
[Build prompt with context]
    |
    v
[Call LLM] --> OpenAI API / Ollama local
    |
    v
[Return answer + source books]
```

## RAG Pipeline Chi Tiết

### 1. Data Ingestion (chạy 1 lần hoặc khi có sách mới)
```
Books from PostgreSQL
    -> Lấy fields: title, author, description, categories
    -> Tạo text chunk cho mỗi sách
    -> Embed bằng sentence-transformers
    -> Lưu vào ChromaDB với metadata (book_id, title, author)
```

### 2. Query Pipeline
```python
# Pseudo-code
def chat(question: str) -> ChatResponse:
    # 1. Embed câu hỏi
    question_embedding = embed(question)
    
    # 2. Tìm sách tương tự trong ChromaDB
    results = chromadb.query(question_embedding, n_results=5)
    
    # 3. Build context
    context = format_book_results(results)
    
    # 4. Build prompt
    prompt = f"""Bạn là trợ lý thư viện thông minh. Dựa vào danh sách sách sau đây, 
    hãy trả lời câu hỏi của người dùng.
    
    Danh sách sách liên quan:
    {context}
    
    Câu hỏi: {question}
    
    Hãy trả lời bằng tiếng Việt, gợi ý sách phù hợp và giải thích ngắn gọn."""
    
    # 5. Call LLM
    answer = llm.generate(prompt)
    
    return ChatResponse(answer=answer, source_books=results.metadata)
```

## Project Structure

```
rag-service/
├── app/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings (LLM provider, ChromaDB path, etc.)
│   ├── routers/
│   │   └── chat.py          # Chat endpoint
│   ├── services/
│   │   ├── rag_service.py   # RAG pipeline logic
│   │   ├── embedding.py     # Embedding service
│   │   └── llm.py           # LLM client (OpenAI / Ollama)
│   ├── models/
│   │   ├── request.py       # Pydantic models
│   │   └── response.py
│   └── utils/
│       └── ingestion.py     # Script to ingest books from DB
├── requirements.txt
├── Dockerfile
└── .env.example
```

## API Endpoints

### POST /api/chat
```json
// Request
{
  "question": "Có sách nào về deep learning không?",
  "chat_history": []  // optional, for multi-turn
}

// Response
{
  "answer": "Thư viện có một số sách về deep learning...",
  "source_books": [
    {"book_id": 15, "title": "Deep Learning", "author": "Ian Goodfellow", "relevance_score": 0.89},
    {"book_id": 23, "title": "Neural Networks and Deep Learning", "author": "Michael Nielsen", "relevance_score": 0.82}
  ]
}
```

### POST /api/ingest
```json
// Trigger re-ingestion of books from DB
// Protected endpoint, only called by SpringBoot admin
{
  "db_connection_string": "postgresql://..."
}
```

## Model Choices

### Embedding Model
- **Option A (free, local)**: `sentence-transformers/all-MiniLM-L6-v2` - nhẹ, nhanh
- **Option B (paid, better)**: OpenAI `text-embedding-3-small` - chất lượng cao hơn

### LLM
- **Option A (free, local)**: Ollama + Llama 3 8B hoặc Gemma 2 9B
- **Option B (paid, easy)**: OpenAI GPT-3.5-turbo (rẻ, đủ tốt cho task này)
- **Khuyến nghị**: Develop với OpenAI (nhanh, dễ debug), demo với Ollama (không tốn tiền)

## Integration với SpringBoot

SpringBoot gọi RAG service qua REST:
```java
@Service
public class ChatService {
    @Value("${rag.service.url}")
    private String ragServiceUrl;
    
    public ChatResponse chat(String question) {
        // POST to ragServiceUrl + "/api/chat"
        // Handle timeout, fallback
    }
}
```

## Status: chưa bắt đầu
