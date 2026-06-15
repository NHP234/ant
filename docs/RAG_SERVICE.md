# RAG Service — AI Chatbot Thư viện Awaken Ant Library

> Microservice Python (FastAPI) cung cấp chatbot AI thông minh cho sinh viên.
> Kết hợp **Intent Classification (SVM)** + **RAG (Vector Search)** + **Direct API queries**.

## 1. Mục đích & Phạm vi

### Chatbot có thể xử lý 2 loại câu hỏi:

**Loại A — Câu hỏi về tìm kiếm sách (RAG):**
- "Có sách nào về machine learning cho người mới không?"
- "Gợi ý sách lập trình Java"
- "Sách nào về kinh tế vĩ mô?"
- "Tôi muốn học về database, nên đọc sách gì?"

**Loại B — Câu hỏi về tình trạng mượn trả cá nhân (API Query):**
- "Tôi còn bao nhiêu sách phải trả?"
- "Sách sắp tới tôi cần trả là sách nào?"
- "Tôi đang đặt mượn cuốn gì?"
- "Tôi đã mượn bao nhiêu sách rồi?"
- "Hạn trả sách của tôi là khi nào?"

---

## 2. Kiến trúc tổng quan — Intent Router

```
User question + JWT token
     |
     v
[FastAPI endpoint: POST /api/chat]
     |
     v
┌──────────────────────────────┐
│  Intent Classifier (SVM)     │
│  Phân loại câu hỏi thành:   │
│   - BOOK_SEARCH              │
│   - BORROW_STATUS            │
│   - HOLD_STATUS              │
│   - GENERAL_CHAT             │
│   - UNKNOWN                  │
└──────────────────────────────┘
     |
     ├── BOOK_SEARCH ──────────> [RAG Pipeline]
     │                              ├── Embed question
     │                              ├── Query ChromaDB (top-k)
     │                              ├── Build prompt + context
     │                              ├── Call LLM
     │                              └── Return answer + source books
     │
     ├── BORROW_STATUS ────────> [API Query Pipeline]
     │   HOLD_STATUS                ├── Parse user's JWT → userId
     │                              ├── Call Spring Boot APIs
     │                              │   (GET /borrows/my, /holds/my)
     │                              ├── Format kết quả thành context
     │                              ├── Build prompt + context
     │                              ├── Call LLM
     │                              └── Return friendly answer
     │
     └── GENERAL_CHAT ─────────> [Direct LLM]
         UNKNOWN                    ├── Prompt: "Bạn là trợ lý thư viện..."
                                    └── Trả lời chung / hướng dẫn sử dụng
```

> **Tại sao SVM + Transformer Embeddings?**
> - SVM (Support Vector Machine) là mô hình phân loại truyền thống, cực kỳ nhẹ và chạy suy diễn cực kỳ nhanh (< 2ms).
> - Nâng cấp sử dụng Dense Embeddings từ SentenceTransformer giúp hiểu sâu sắc về mặt ngữ nghĩa (Semantics), tránh bị giới hạn bởi các so khớp từ khóa tĩnh (Lexical).
> - Sử dụng giải pháp Hiệu chuẩn xác suất (Platt Scaling) giúp confidence score phản ánh chính xác phân phối xác suất thực tế, giải quyết tình trạng độ tự tin phân loại thấp.
> - Tránh gọi LLM cho bước phân loại → tiết kiệm tối đa chi phí + giảm đáng kể latency.
> - Dễ debug & có tính học thuật cao — hoàn hảo cho báo cáo đồ án tốt nghiệp.

---

## 3. Tech Stack

| Component | Công nghệ | Lý do |
|-----------|-----------|-------|
| Web Framework | FastAPI | Async, tự sinh docs, type-safe |
| Intent Classifier | scikit-learn SVM (LinearSVC) + CalibratedClassifierCV | Nhận diện ngữ nghĩa sâu, hiệu chuẩn xác suất (Platt Scaling) |
| Vector Database | ChromaDB (embedded) | Không cần server riêng, dễ deploy |
| Embedding Model | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Hỗ trợ tiếng Việt xuất sắc, nhẹ (~130MB), chạy CPU tốt |
| LLM | Google Gemini API (free tier) hoặc Ollama (local) | Free tier đủ cho đồ án, Ollama cho offline demo |
| Vietnamese NLP | Biểu diễn ngữ nghĩa (Dense Vectors) | Tự động phân tách từ bằng WordPiece/Subword của Transformer |
| HTTP Client | httpx | Async, gọi Spring Boot APIs |
| Containerization | Docker | Đồng nhất môi trường |

---

## 4. Intent Classification — Chi tiết

### 4.1 Training Data

```python
# intent_training_data.py

TRAINING_DATA = [
    # === BOOK_SEARCH ===
    ("có sách nào về machine learning không", "BOOK_SEARCH"),
    ("gợi ý sách lập trình java", "BOOK_SEARCH"),
    ("tìm sách về kinh tế", "BOOK_SEARCH"),
    ("sách nào dạy python cho người mới", "BOOK_SEARCH"),
    ("thư viện có sách về trí tuệ nhân tạo không", "BOOK_SEARCH"),
    ("cho tôi xem sách về cơ sở dữ liệu", "BOOK_SEARCH"),
    ("sách hay về văn học", "BOOK_SEARCH"),
    ("tôi muốn đọc sách về mạng máy tính", "BOOK_SEARCH"),
    ("có cuốn clean code không", "BOOK_SEARCH"),
    ("sách nào của tác giả robert martin", "BOOK_SEARCH"),
    # ... thêm ~100 câu nữa

    # === BORROW_STATUS ===
    ("tôi đang mượn bao nhiêu sách", "BORROW_STATUS"),
    ("sách sắp tới tôi cần trả là sách nào", "BORROW_STATUS"),
    ("tôi còn bao nhiêu sách phải trả", "BORROW_STATUS"),
    ("hạn trả sách của tôi là khi nào", "BORROW_STATUS"),
    ("sách nào của tôi sắp quá hạn", "BORROW_STATUS"),
    ("tôi đã trả sách gì rồi", "BORROW_STATUS"),
    ("lịch sử mượn sách của tôi", "BORROW_STATUS"),
    ("tôi có sách quá hạn không", "BORROW_STATUS"),
    # ... thêm ~50 câu nữa

    # === HOLD_STATUS ===
    ("tôi đang đặt mượn cuốn gì", "HOLD_STATUS"),
    ("tôi có đặt trước sách nào không", "HOLD_STATUS"),
    ("hold của tôi còn bao lâu", "HOLD_STATUS"),
    ("tôi có thể hủy đặt mượn được không", "HOLD_STATUS"),
    ("sách tôi đặt trước đã sẵn sàng chưa", "HOLD_STATUS"),
    # ... thêm ~30 câu nữa

    # === GENERAL_CHAT ===
    ("xin chào", "GENERAL_CHAT"),
    ("cảm ơn bạn", "GENERAL_CHAT"),
    ("thư viện mở cửa mấy giờ", "GENERAL_CHAT"),
    ("làm sao để mượn sách", "GENERAL_CHAT"),
    ("tôi là sinh viên năm nhất", "GENERAL_CHAT"),
    ("tạm biệt", "GENERAL_CHAT"),
    # ... thêm ~30 câu nữa
]
```

### 4.2 SVM Pipeline

```python
# intent_classifier.py
import re
import numpy as np
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sentence_transformers import SentenceTransformer
import joblib

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

class IntentClassifier:
    def __init__(self):
        self.model_name = 'paraphrase-multilingual-MiniLM-L12-v2'
        self.device = 'cpu'
        
        base_svm = LinearSVC(
            C=1.0,
            class_weight='balanced',
            max_iter=10000,
            random_state=42
        )
        # Sử dụng CalibratedClassifierCV hiệu chuẩn xác suất (Platt scaling)
        self.svm = CalibratedClassifierCV(estimator=base_svm, cv=5)
        self._model = None
        self.is_trained = False

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(self.model_name, device=self.device)
        return self._model

    def train(self, texts: list[str], labels: list[str]):
        cleaned_texts = [clean_text(t) for t in texts]
        model = self._get_model()
        embeddings = model.encode(cleaned_texts, convert_to_numpy=True, show_progress_bar=False)
        self.svm.fit(embeddings, np.array(labels))
        self.is_trained = True

    def predict(self, text: str) -> tuple[str, float]:
        if not self.is_trained:
            return "GENERAL_CHAT", 0.0
        cleaned_text = clean_text(text)
        model = self._get_model()
        embedding = model.encode([cleaned_text], convert_to_numpy=True, show_progress_bar=False)[0]
        
        # Dự đoán xác suất đã hiệu chuẩn
        probabilities = self.svm.predict_proba([embedding])[0]
        classes = self.svm.classes_
        class_idx = np.argmax(probabilities)
        intent = classes[class_idx]
        confidence = float(probabilities[class_idx])
        return intent, confidence

    def save(self, path: str):
        joblib.dump(self.svm, path)

    def load(self, path: str):
        self.svm = joblib.load(path)
        self.is_trained = True
```

### 4.3 Confidence Threshold

```python
CONFIDENCE_THRESHOLD = 0.5

intent, confidence = classifier.predict(question)

if confidence < CONFIDENCE_THRESHOLD:
    # Fallback: gửi thẳng vào LLM với system prompt chung
    intent = "GENERAL_CHAT"
```

> Nếu SVM không tự tin (< 0.6), fallback sang GENERAL_CHAT để LLM tự xử lý.

---

## 5. RAG Pipeline (BOOK_SEARCH) — Chi tiết

### 5.1 Data Ingestion

```python
# ingestion.py
import chromadb
from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
chroma_client = chromadb.PersistentClient(path="./chroma_data")
collection = chroma_client.get_or_create_collection("books")

def ingest_books(books: list[dict]):
    """
    Mỗi book dict có: id, title, author, description, categories, publisher, publishYear
    """
    documents = []
    metadatas = []
    ids = []

    for book in books:
        # Tạo rich text document cho mỗi sách
        doc = f"""
        Tên sách: {book['title']}
        Tác giả: {book['author']}
        Thể loại: {', '.join(book.get('categories', []))}
        Nhà xuất bản: {book.get('publisher', 'N/A')}
        Năm xuất bản: {book.get('publishYear', 'N/A')}
        Mô tả: {book.get('description', 'Chưa có mô tả')}
        """.strip()

        documents.append(doc)
        metadatas.append({
            "book_id": book["id"],
            "title": book["title"],
            "author": book["author"],
            "categories": ", ".join(book.get("categories", []))
        })
        ids.append(f"book_{book['id']}")

    # Upsert (create or update)
    collection.upsert(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
```

### 5.2 Query Pipeline

```python
# rag_service.py
def search_books(question: str, n_results: int = 5) -> list[dict]:
    """Tìm sách liên quan bằng vector similarity"""
    results = collection.query(
        query_texts=[question],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )

    source_books = []
    for i, metadata in enumerate(results["metadatas"][0]):
        source_books.append({
            "book_id": metadata["book_id"],
            "title": metadata["title"],
            "author": metadata["author"],
            "relevance_score": round(1 - results["distances"][0][i], 2)
        })

    context = "\n---\n".join(results["documents"][0])
    return context, source_books
```

### 5.3 Prompt Template

```python
BOOK_SEARCH_PROMPT = """Bạn là trợ lý thư viện thông minh của hệ thống Awaken Ant Library.
Nhiệm vụ của bạn là gợi ý sách phù hợp cho sinh viên dựa trên dữ liệu sách thực tế trong thư viện.

Quy tắc:
1. CHỈ gợi ý sách có trong danh sách được cung cấp, KHÔNG bịa sách.
2. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn.
3. Nếu không tìm thấy sách phù hợp, hãy nói rõ và gợi ý từ khóa tìm kiếm khác.
4. Giải thích ngắn gọn vì sao mỗi cuốn sách phù hợp với nhu cầu.

Danh sách sách liên quan trong thư viện:
{context}

Câu hỏi của sinh viên: {question}

Hãy trả lời:"""
```

---

## 6. API Query Pipeline (BORROW_STATUS / HOLD_STATUS) — Chi tiết

### 6.1 Flow

```python
# api_query_service.py
import httpx

SPRING_BOOT_URL = "http://backend:8080/api"

async def get_user_borrows(jwt_token: str) -> list[dict]:
    """Gọi Spring Boot API để lấy sách đang mượn của user"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SPRING_BOOT_URL}/borrows/my",
            headers={"Authorization": f"Bearer {jwt_token}"},
            params={"size": 50}
        )
        if resp.status_code == 200:
            return resp.json()["data"]["content"]
        return []

async def get_user_holds(jwt_token: str) -> list[dict]:
    """Gọi Spring Boot API để lấy holds của user"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SPRING_BOOT_URL}/holds/my",
            headers={"Authorization": f"Bearer {jwt_token}"},
            params={"size": 50}
        )
        if resp.status_code == 200:
            return resp.json()["data"]["content"]
        return []
```

`HOLD_STATUS` phải dùng đúng contract trạng thái của backend:

| Trạng thái | Ý nghĩa chatbot |
|------------|-----------------|
| `ACTIVE` | Bản sao đã được giữ tại quầy; sinh viên cần đến nhận trước `expiresAt` |
| `FULFILLED` | Sinh viên đã nhận sách và hold đã chuyển thành lượt mượn |
| `CANCELED` | Hold đã bị sinh viên hoặc nhân viên hủy |
| `EXPIRED` | Sinh viên không nhận sách trước hạn và hold đã hết hiệu lực |

Backend không có bước `PENDING`/`READY` hoặc chờ thủ thư duyệt. Khi tạo hold thành công, hệ thống chọn ngay một bản sao khả dụng, chuyển bản sao sang `RESERVED` và tạo hold `ACTIVE` trong 24 giờ.

### 6.2 Context Building

```python
def build_borrow_context(borrows: list[dict]) -> str:
    if not borrows:
        return "Bạn hiện không mượn sách nào."

    active = [b for b in borrows if b["status"] == "BORROWING"]
    overdue = [b for b in borrows if b["status"] == "OVERDUE"]

    lines = [f"Bạn đang mượn {len(active)} cuốn sách:"]
    for b in active:
        lines.append(f"- \"{b['bookTitle']}\" (hạn trả: {b['dueDate']})")

    if overdue:
        lines.append(f"\n⚠️ Có {len(overdue)} cuốn quá hạn:")
        for b in overdue:
            lines.append(f"- \"{b['bookTitle']}\" (quá hạn từ: {b['dueDate']})")

    return "\n".join(lines)
```

### 6.3 Prompt Template

```python
BORROW_STATUS_PROMPT = """Bạn là trợ lý thư viện thông minh của Awaken Ant Library.
Sinh viên đang hỏi về tình trạng mượn trả sách cá nhân.

Thông tin mượn trả hiện tại của sinh viên:
{context}

Câu hỏi: {question}

Quy tắc:
1. Trả lời chính xác dựa trên dữ liệu, KHÔNG bịa.
2. Nếu có sách quá hạn, nhắc nhở nhẹ nhàng.
3. Nếu có sách sắp đến hạn (trong 3 ngày), cảnh báo.
4. Trả lời bằng tiếng Việt, thân thiện.

Hãy trả lời:"""
```

---

## 7. Project Structure

```
rag-service/
├── app/
│   ├── main.py                  # FastAPI app, startup events
│   ├── config.py                # Settings (env vars)
│   ├── routers/
│   │   ├── chat.py              # POST /api/chat
│   │   └── admin.py             # POST /api/ingest, GET /api/health
│   ├── services/
│   │   ├── intent_classifier.py # SVM + TF-IDF classifier
│   │   ├── rag_service.py       # ChromaDB search + RAG pipeline
│   │   ├── api_query_service.py # Call Spring Boot APIs
│   │   ├── llm_service.py       # LLM client (Gemini / Ollama)
│   │   └── chat_orchestrator.py # Route intents → pipelines
│   ├── models/
│   │   ├── request.py           # Pydantic request models
│   │   └── response.py          # Pydantic response models
│   ├── data/
│   │   ├── intent_training.py   # Training data cho SVM
│   │   └── prompts.py           # Prompt templates
│   └── utils/
│       ├── ingestion.py         # Script ingest books from DB
│       └── vietnamese.py        # Vietnamese text utils
├── models/                      # Trained SVM model files (.joblib)
│   └── intent_classifier.joblib
├── chroma_data/                 # ChromaDB persistent storage
├── scripts/
│   ├── train_classifier.py      # Script train SVM
│   └── ingest_books.py          # Script ingest books
├── tests/
│   ├── test_classifier.py       # Unit tests cho SVM
│   └── test_rag.py              # Unit tests cho RAG
├── requirements.txt
├── Dockerfile
├── docker-compose.yml           # Standalone hoặc merge vào project chính
└── .env.example
```

---

## 8. API Endpoints

### POST /api/chat

```json
// Request
{
  "question": "Có sách nào về deep learning không?",
  "chat_history": []
}

// Headers
Authorization: Bearer <jwt_token>   // Bắt buộc — dùng để gọi Spring Boot APIs
```

```json
// Response — BOOK_SEARCH
{
  "answer": "Thư viện có một số sách về deep learning phù hợp cho bạn:\n\n1. **Deep Learning** - Ian Goodfellow: Cuốn sách kinh điển...\n2. **Neural Networks** - Michael Nielsen: Phù hợp cho người mới...",
  "intent": "BOOK_SEARCH",
  "confidence": 0.92,
  "source_books": [
    {"book_id": 15, "title": "Deep Learning", "author": "Ian Goodfellow", "relevance_score": 0.89},
    {"book_id": 23, "title": "Neural Networks and Deep Learning", "author": "Michael Nielsen", "relevance_score": 0.82}
  ]
}

// Response — BORROW_STATUS
{
  "answer": "Bạn đang mượn 3 cuốn sách:\n- \"Clean Code\" (hạn trả: 25/05/2026)\n- \"Java Cơ Bản\" (hạn trả: 28/05/2026)\n- \"Nhà Giả Kim\" (⚠️ quá hạn từ 18/05/2026)\n\nBạn nên mang cuốn \"Nhà Giả Kim\" ra trả sớm nhé!",
  "intent": "BORROW_STATUS",
  "confidence": 0.95,
  "source_books": []
}
```

### POST /api/ingest

```json
// Trigger re-ingestion of books from DB
// Protected: chỉ internal call từ Spring Boot (API key)
// Headers: X-Internal-Key: <shared_secret>

// Response
{
  "status": "success",
  "books_ingested": 150,
  "duration_seconds": 12.5
}
```

### GET /api/health

```json
{
  "status": "healthy",
  "classifier_loaded": true,
  "chroma_books_count": 150,
  "llm_provider": "gemini"
}
```

---

## 9. Model Choices

### Embedding Model
- **Khuyến nghị**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
  - Hỗ trợ tiếng Việt tốt (multilingual)
  - Nhẹ (~130MB), chạy CPU OK
  - 384 dimensions

### LLM
| Option | Chi phí | Chất lượng | Latency | Phù hợp |
|--------|---------|-----------|---------|---------|
| **Google Gemini 2.0 Flash** (free tier) | Free (15 RPM) | Tốt | ~1-2s | Development + Demo |
| Ollama + Gemma 2 9B | Free (local) | Khá | ~3-5s | Offline demo, cần 8GB+ RAM |
| OpenAI GPT-4o-mini | ~$0.15/1M tokens | Rất tốt | ~1s | Production (nếu có budget) |

> **Khuyến nghị**: Dùng **Gemini 2.0 Flash** free tier cho development và demo. Đủ tốt cho domain thư viện, hoàn toàn miễn phí (15 requests/phút). Fallback sang Ollama khi offline.

### Intent Classifier (SVM)
- `sklearn.svm.LinearSVC` + `CalibratedClassifierCV` + `SentenceTransformer`
- Training: ~115 câu mẫu thực tế phân bố chuẩn
- Inference: < 2ms
- Accuracy kỳ vọng: > 95% (domain hẹp, ngữ nghĩa sâu)

---

## 10. Integration với Spring Boot

### 10.1 Spring Boot Proxy (ChatController)

```java
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "RAG Chatbot - Proxy tới AI service")
public class ChatController {

    @Value("${rag.service.url:http://localhost:8000}")
    private String ragServiceUrl;

    private final RestClient restClient;

    @PostMapping
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @RequestBody ChatRequest request,
            @RequestHeader("Authorization") String authHeader) {

        try {
            // Forward request + JWT tới RAG service
            ChatResponse response = restClient.post()
                .uri(ragServiceUrl + "/api/chat")
                .header("Authorization", authHeader)
                .body(request)
                .retrieve()
                .body(ChatResponse.class);

            return ResponseEntity.ok(ApiResponse.ok(response));
        } catch (Exception e) {
            // Fallback khi RAG service down
            return ResponseEntity.ok(ApiResponse.ok(
                new ChatResponse("Xin lỗi, chatbot đang bảo trì. Bạn có thể dùng chức năng tìm kiếm sách trên trang chủ.", null, null, null),
                "RAG service unavailable"
            ));
        }
    }
}
```

### 10.2 Auto-Ingest khi thêm/sửa sách

```java
// Trong BookService.java — sau khi create/update book
@Async
public void triggerReIngest() {
    try {
        restClient.post()
            .uri(ragServiceUrl + "/api/ingest")
            .header("X-Internal-Key", internalApiKey)
            .retrieve()
            .toBodilessEntity();
    } catch (Exception e) {
        log.warn("RAG ingest failed (non-critical): {}", e.getMessage());
    }
}
```

### 10.3 Docker Compose

```yaml
# Thêm vào docker-compose.yml hiện có
rag-service:
  build: ./rag-service
  ports:
    - "8000:8000"
  environment:
    - SPRING_BOOT_URL=http://backend:8080/api
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - CHROMA_PERSIST_DIR=/data/chroma
    - INTERNAL_API_KEY=${INTERNAL_API_KEY}
  volumes:
    - rag_data:/data
  depends_on:
    backend:
      condition: service_healthy

volumes:
  rag_data:
```

---

## 11. Implementation Plan — Checklist

### Phase 1: Foundation (Tuần 11 — ngày 1-2)
- [x] Init FastAPI project (`rag-service/`)
- [x] Setup `requirements.txt` (fastapi, uvicorn, chromadb, sentence-transformers, scikit-learn, underthesea, httpx, python-dotenv, google-generativeai, psycopg2-binary)
- [x] Config `.env.example` + `config.py` (cần thêm `DATABASE_URL` để kết nối Postgres đọc dữ liệu sách)
- [x] Pydantic models (request/response)
- [x] Health check endpoint

### Phase 2: Intent Classifier (Tuần 11 — ngày 2-3)
- [x] Viết training data (~200 câu, 4 intents)
- [x] Implement `IntentClassifier` (SVM + TF-IDF)
- [x] Train + save model (`.joblib`)
- [x] Unit tests cho classifier (accuracy > 90%)
- [x] Confidence threshold + fallback logic

### Phase 3: RAG Pipeline (Tuần 11 — ngày 3-5)
- [x] Implement ingestion script (PostgreSQL → ChromaDB)
- [x] Implement vector search
- [x] Prompt templates cho BOOK_SEARCH
- [x] LLM service (Gemini API client)
- [x] Test RAG end-to-end

### Phase 4: API Query Pipeline (Tuần 12 — ngày 1-2)
- [x] Implement `api_query_service.py` (call Spring Boot APIs)
- [x] Context builders (borrow_context, hold_context)
- [x] Prompt templates cho BORROW_STATUS, HOLD_STATUS
- [x] Test với mock JWT

### Phase 5: Chat Orchestrator (Tuần 12 — ngày 2-3)
- [x] Implement `chat_orchestrator.py` (route intent → pipeline)
- [x] Chat history support (multi-turn context)
- [x] `POST /api/chat` endpoint
- [x] Error handling + fallback

### Phase 6: Integration (Tuần 12 — ngày 3-5)
- [x] Spring Boot `ChatController` (proxy)
- [x] Auto-ingest trigger khi thêm/sửa sách
- [x] Dockerfile cho rag-service
- [x] Docker Compose integration
- [x] Frontend: kết nối ChatPage.tsx với API thực
- [x] End-to-end test

---

## 12. Ước lượng thời gian

| Phase | Thời gian | Độ phức tạp |
|-------|-----------|-------------|
| Foundation | 0.5 ngày | Thấp |
| Intent Classifier | 1 ngày | Trung bình |
| RAG Pipeline | 1.5 ngày | Cao |
| API Query Pipeline | 1 ngày | Trung bình |
| Chat Orchestrator | 1 ngày | Trung bình |
| Integration + Test | 1.5 ngày | Trung bình |
| **Tổng** | **~6.5 ngày** | |

---

## 13. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| Gemini free tier rate limit (15 RPM) | Cache kết quả, queue requests, fallback Ollama |
| SVM accuracy thấp | Thêm training data, tune hyperparams, dùng LLM-based classification fallback |
| ChromaDB embedding chậm | Batch ingestion, chỉ re-ingest sách mới/thay đổi |
| Tiếng Việt không chính xác | Dùng `underthesea` tokenizer, thêm domain-specific từ vựng |
| JWT expired khi gọi Spring Boot | Forward nguyên JWT từ frontend, để Spring Boot tự validate |

## Status: ✅ Đã hoàn thành
