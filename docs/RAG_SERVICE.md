# RAG Service — AI Chatbot Thư viện Awaken Ant Library

> Microservice Python (FastAPI) cung cấp chatbot AI thông minh cho sinh viên.
> Kết hợp **Intent Classification (SentenceTransformer + Calibrated SVM)** + **Query Normalization** + **Hybrid Retrieval (PostgreSQL lexical + ChromaDB semantic)** + **Direct API queries** + **DeepSeek LLM**.

## 1. Mục đích & Phạm vi

### Chatbot có thể xử lý 4 nhóm câu hỏi:

**Loại A — Câu hỏi về tìm kiếm/tra cứu sách (RAG):**
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

**Loại C — Câu hỏi nối tiếp dựa trên lịch sử hội thoại:**
- "Sách này nói về gì?"
- "Tác giả là ai?"
- "Cuốn này thuộc thể loại gì?"

**Loại D — Hội thoại chung / hướng dẫn sử dụng thư viện:**
- "Xin chào"
- "Tôi có thể hỏi bạn những gì?"
- "Làm sao để đặt mượn sách?"

---

## 2. Kiến trúc tổng quan — Intent Router

```
User question + chat_history + JWT token
     |
     v
[FastAPI endpoint: POST /api/chat]
     |
     v
[LLM Query Rewriter (DeepSeek)]
     |
     v
┌──────────────────────────────┐
│  Intent Classifier           │
│  SentenceTransformer + SVM   │
│  Phân loại câu hỏi thành:    │
│   - BOOK_SEARCH              │
│   - BORROW_STATUS            │
│   - HOLD_STATUS              │
│   - GENERAL_CHAT             │
└──────────────────────────────┘
     |
     ├── BOOK_SEARCH ──────────> [RAG Pipeline]
     │                              ├── Query normalization
     │                              ├── PostgreSQL lexical lookup
     │                              ├── ChromaDB semantic retrieval
     │                              ├── Merge + dedupe by book_id
     │                              ├── Build prompt + context
     │                              ├── Call DeepSeek
     │                              └── Return answer + source books
     │
     ├── BORROW_STATUS ────────> [API Query Pipeline]
     │   HOLD_STATUS                ├── Parse user's JWT → userId
     │                              ├── Call Spring Boot APIs
     │                              │   (GET /borrows/my, /holds/my)
     │                              ├── Format kết quả thành context
     │                              ├── Build prompt + context
     │                              ├── Call DeepSeek
     │                              └── Return friendly answer
     │
     └── GENERAL_CHAT ─────────> [Direct DeepSeek]
                                    ├── Prompt: "Bạn là trợ lý thư viện..."
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
| Intent Classifier | SentenceTransformer + scikit-learn LinearSVC + CalibratedClassifierCV | Nhận diện ngữ nghĩa sâu, hiệu chuẩn xác suất (Platt Scaling) |
| Vector Database | ChromaDB (embedded) | Không cần server riêng, dễ deploy |
| Embedding Model (RAG) | `BAAI/bge-m3` | Trích xuất ngữ nghĩa đa ngôn ngữ; chạy CUDA/float16 khi host có NVIDIA GPU, mặc định chạy CPU trên VPS thường |
| Embedding Model (SVM) | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Nhẹ (~130MB), chạy nhanh suy diễn (< 2ms) trên CPU/GPU để phân loại ý định |
| Lexical Retrieval | PostgreSQL FTS + `unaccent` + `ts_rank_cd` + scoring trong Python | Kết hợp kết quả từ khóa chính xác (lexical) với truy xuất ngữ nghĩa (semantic) qua RRF |
| LLM | DeepSeek API (`deepseek-v4-flash`) | Chi phí thấp, OpenAI-compatible, kết nối bất đồng bộ (Async) |
| Vietnamese NLP | Biểu diễn ngữ nghĩa (Dense Vectors) | Tự động phân tách từ bằng WordPiece/Subword của Transformer |
| HTTP Client / LLM Caller | httpx (AsyncClient) | Async, gọi Spring Boot APIs và DeepSeek API để tránh chặn (block) Event Loop |
| DB Connection Pool | ThreadedConnectionPool (psycopg2) | Quản lý kết nối PostgreSQL hiệu quả, tránh cạn kiệt tài nguyên |
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
    # ... tổng cộng 45 câu BOOK_SEARCH

    # === BORROW_STATUS ===
    ("tôi đang mượn bao nhiêu sách", "BORROW_STATUS"),
    ("sách sắp tới tôi cần trả là sách nào", "BORROW_STATUS"),
    ("tôi còn bao nhiêu sách phải trả", "BORROW_STATUS"),
    ("hạn trả sách của tôi là khi nào", "BORROW_STATUS"),
    ("sách nào của tôi sắp quá hạn", "BORROW_STATUS"),
    ("tôi đã trả sách gì rồi", "BORROW_STATUS"),
    ("lịch sử mượn sách của tôi", "BORROW_STATUS"),
    ("tôi có sách quá hạn không", "BORROW_STATUS"),
    # ... tổng cộng 25 câu BORROW_STATUS

    # === HOLD_STATUS ===
    ("tôi đang đặt mượn cuốn gì", "HOLD_STATUS"),
    ("tôi có đặt trước sách nào không", "HOLD_STATUS"),
    ("hold của tôi còn bao lâu", "HOLD_STATUS"),
    ("tôi có thể hủy đặt mượn được không", "HOLD_STATUS"),
    ("sách tôi đặt trước đã sẵn sàng chưa", "HOLD_STATUS"),
    # ... tổng cộng 20 câu HOLD_STATUS

    # === GENERAL_CHAT ===
    ("xin chào", "GENERAL_CHAT"),
    ("cảm ơn bạn", "GENERAL_CHAT"),
    ("thư viện mở cửa mấy giờ", "GENERAL_CHAT"),
    ("làm sao để mượn sách", "GENERAL_CHAT"),
    ("tôi là sinh viên năm nhất", "GENERAL_CHAT"),
    ("tạm biệt", "GENERAL_CHAT"),
    # ... tổng cộng 25 câu GENERAL_CHAT
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

> Nếu SVM không tự tin (< 0.5), fallback sang GENERAL_CHAT để LLM tự xử lý.

---

## 5. RAG Pipeline (BOOK_SEARCH) — Chi tiết

### 5.1 Data Ingestion

```python
# ingestion.py or rag_service.py
import os
import chromadb
from sentence_transformers import SentenceTransformer

# Embedding function wrapper for ChromaDB using BGE-M3
class SentenceTransformerEmbeddingFunction:
    def __init__(self, model_name: str = 'BAAI/bge-m3'):
        import torch
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model = SentenceTransformer(model_name, device=self.device)
        if self.device == 'cuda':
            self.model = self.model.half() # float16 precision for VRAM savings

    def __call__(self, input: list[str]) -> list[list[float]]:
        import torch
        if self.device == 'cuda':
            try:
                # Default batch size 16
                embeddings = self.model.encode(input, batch_size=16, convert_to_numpy=True)
                torch.cuda.empty_cache()
            except RuntimeError as e:
                if "out of memory" in str(e).lower():
                    # Fallback to batch size 2 under OOM
                    torch.cuda.empty_cache()
                    try:
                        embeddings = self.model.encode(input, batch_size=2, convert_to_numpy=True)
                        torch.cuda.empty_cache()
                    except RuntimeError as e2:
                        if "out of memory" in str(e2).lower():
                            # Fallback to CPU if GPU still runs OOM
                            torch.cuda.empty_cache()
                            self.model = self.model.to('cpu')
                            embeddings = self.model.encode(input, batch_size=16, convert_to_numpy=True)
                            self.model = self.model.to('cuda')
                            self.model = self.model.half()
                            torch.cuda.empty_cache()
                        else:
                            raise e2
                else:
                    raise e
        else:
            embeddings = self.model.encode(input, convert_to_numpy=True)
        return embeddings.tolist()

# ChromaDB persistence setup
chroma_client = chromadb.PersistentClient(path="./chroma_data")
collection = chroma_client.get_or_create_collection(
    name="books",
    embedding_function=SentenceTransformerEmbeddingFunction(),
    metadata={"hnsw:space": "cosine"}
)

def upsert_books(books: list[dict]):
    """
    Đồng bộ dữ liệu sách vào ChromaDB.
    """
    documents = []
    metadatas = []
    ids = []

    for book in books:
        categories_str = ", ".join(book.get("categories", []))
        raw_desc = book.get('description', 'Chưa có mô tả chi tiết.')
        
        doc = f"""
Tên sách: {book['title']}
Tác giả: {book['author']}
Thể loại: {categories_str}
Nhà xuất bản: {book.get('publisher', 'N/A')}
Năm xuất bản: {book.get('publishYear', 'N/A')}
Mô tả: {raw_desc}
        """.strip()

        documents.append(doc)
        metadatas.append({
            "book_id": int(book["id"]),
            "title": book["title"],
            "author": book["author"],
            "categories": categories_str
        })
        ids.append(f"book_{book['id']}")

    # Ingest in batches of 500
    batch_size = 500
    for i in range(0, len(ids), batch_size):
        end_idx = min(i + batch_size, len(ids))
        collection.upsert(
            documents=documents[i:end_idx],
            metadatas=metadatas[i:end_idx],
            ids=ids[i:end_idx]
        )
```

### 5.2 Query Pipeline

```python
# rag_service.py
    def search_books(self, question: str, n_results: int = 5) -> tuple[str, list[dict]]:
        """
        Tìm kiếm sách bằng cơ chế hybrid search kết hợp Reciprocal Rank Fusion (RRF).
        Kết hợp PostgreSQL Lexical Search (được đánh trọng số qua Full-Text Search) 
        và ChromaDB Semantic Search (sử dụng mô hình BGE-M3).
        """
        if self.get_books_count() == 0:
            return "", []

        book_query = normalize_book_search_query(question)

        # 1. Lexical Search
        lexical_raw = self._search_books_lexically(book_query.lexical, limit=n_results * 2)
        if book_query.changed:
            lexical_raw.extend(self._search_books_lexically(normalize_search_text(book_query.original), limit=n_results * 2))

        # Sắp xếp và loại bỏ trùng lặp cho danh sách lexical
        lexical_raw.sort(key=lambda match: (-match[1].get("relevance_score", 0.0)))
        lexical_ranked = []
        seen_lexical = set()
        for doc, source in lexical_raw:
            bid = source["book_id"]
            if bid not in seen_lexical:
                seen_lexical.add(bid)
                lexical_ranked.append((doc, source))

        # 2. Semantic Search (ChromaDB + BGE-M3)
        semantic_ranked = self._search_books_chroma_only(book_query.normalized, n_results=n_results * 2)

        # 3. Reciprocal Rank Fusion (RRF) với hằng số k = 60
        k = 60.0
        scores = {}  # book_id -> {"doc": doc, "source": source, "rrf_score": score}

        for rank, (doc, source) in enumerate(lexical_ranked, start=1):
            bid = source["book_id"]
            if bid not in scores:
                scores[bid] = {
                    "doc": doc,
                    "source": source.copy(),
                    "rrf_score": 0.0
                }
            scores[bid]["rrf_score"] += 1.0 / (k + rank)

        for rank, (doc, source) in enumerate(semantic_ranked, start=1):
            bid = source["book_id"]
            if bid not in scores:
                scores[bid] = {
                    "doc": doc,
                    "source": source.copy(),
                    "rrf_score": 0.0
                }
            else:
                # Nếu sách xuất hiện ở cả hai danh sách, giữ relevance score cao nhất
                existing_score = scores[bid]["source"]["relevance_score"]
                new_score = source["relevance_score"]
                if new_score > existing_score:
                    scores[bid]["source"]["relevance_score"] = new_score
            scores[bid]["rrf_score"] += 1.0 / (k + rank)

        # Sắp xếp theo điểm RRF giảm dần
        sorted_results = sorted(scores.values(), key=lambda item: -item["rrf_score"])
        top_results = sorted_results[:n_results]

        merged_documents = [item["doc"] for item in top_results]
        source_books = [item["source"] for item in top_results]

        if not source_books:
            return "", []

        context = "\n\n---\n\n".join(merged_documents)
        return context, source_books
```

Ghi chú hiện trạng:
- `source_books` của RAG service chỉ chứa metadata phục vụ retrieval: `book_id`, `title`, `author`, `relevance_score`.
- Ảnh bìa không được lưu trong ChromaDB. Spring Boot proxy sẽ enrich `coverImageUrl` từ PostgreSQL trước khi trả về Frontend.
- Với câu hỏi chi tiết về sách đã được nhắc trong lịch sử chat, orchestrator ưu tiên lookup chính xác theo title; riêng câu hỏi tác giả có thể trả lời trực tiếp từ metadata thay vì gọi LLM.

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
│   │   └── admin.py             # GET /api/health, full + single-book ingest endpoints
│   ├── services/
│   │   ├── intent_classifier.py # SentenceTransformer embeddings + Calibrated SVM
│   │   ├── query_normalizer.py  # Cleanup natural-language book search questions
│   │   ├── rag_service.py       # PostgreSQL lexical + ChromaDB semantic retrieval
│   │   ├── api_query_service.py # Call Spring Boot APIs
│   │   ├── llm_service.py       # DeepSeek API client
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
│   ├── test_classifier.py             # Unit tests cho SVM
│   ├── test_rag.py                    # ChromaDB ephemeral + mock embedding
│   ├── test_ingestion.py              # PostgreSQL -> Chroma sync orchestration
│   └── test_admin_ingest_router.py    # Internal ingest/delete endpoints + X-Internal-Key
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

RAG service nhận cả `chat_history` và `chatHistory` để tương thích với Spring Boot/Frontend. Trước khi phân loại intent và truy xuất dữ liệu, orchestrator dùng **LLM Query Rewrite** để viết lại câu hỏi nối tiếp thành câu hỏi độc lập dựa trên tối đa 4 tin nhắn gần nhất. Ví dụ câu "sách này tác giả là ai?" sẽ được viết lại kèm tên sách đã nhắc trong lịch sử nếu ngữ cảnh đủ rõ. Câu hỏi đã viết lại dùng cho routing/search; prompt gửi LLM vẫn giữ cả câu hỏi gốc và câu hỏi đã bổ sung ngữ cảnh để câu trả lời tự nhiên nhưng không mất tham chiếu.

Để chống Prompt Injection và bảo mật cho luồng hội thoại, lịch sử hội thoại (`chat_history`) được bóc tách và phân phối thành mảng tin nhắn (`messages`) với các role `user` và `assistant` riêng biệt dựa trên tiền tố `"User: "` và `"Bot: "`. Hệ thống tuyệt đối không ghép chuỗi thô (plain text) chat history vào tin nhắn `user` cuối cùng, giúp DeepSeek hiểu rõ ranh giới ngữ cảnh.

`source_books` from RAG only contains retrieval metadata: `book_id`, `title`, `author`, and `relevance_score`. Cover images are not stored in ChromaDB; Spring Boot enriches `coverImageUrl` from PostgreSQL before returning `/api/chat` to the frontend.

Book search uses hybrid retrieval with **Reciprocal Rank Fusion (RRF)**: the RAG service first normalizes natural-language question frames such as `co sach nao`, `lien quan toi`, `chu de ve`, `noi dung ve`, or `co noi dung` into the core search phrase. It then runs both retrieval channels: PostgreSQL lexical search (FTS with category aggregation from Flyway V14/V15) and ChromaDB semantic search (using `BAAI/bge-m3`; CUDA when available, CPU otherwise). The ranked candidates from both channels are combined using the Reciprocal Rank Fusion (RRF) algorithm (with constant `k = 60`) to yield a unified relevance ranking. If a book is matched by both lexical and semantic pipelines, the maximum of the two relevance scores is retained. This architecture prevents exact keyword searches (like specific titles `lego chima` or authors `tracey west`) from being displaced by purely semantic embeddings, while still allowing broad topic and conceptual queries to utilize the robust semantic capabilities of ChromaDB. Weak vector matches (under threshold 0.53) are filtered beforehand to ensure high precision.

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
// Trigger full re-ingestion of books from PostgreSQL.
// Protected: chỉ internal call từ Spring Boot/admin tooling (API key)
// Headers: X-Internal-Key: <shared_secret>

// Response
{
  "status": "success",
  "message": "Đã bắt đầu tiến trình đồng bộ dữ liệu sách trong nền (Background Ingestion started)."
}
```

Full ingest chạy nền: đọc toàn bộ sách từ PostgreSQL, upsert vào ChromaDB, sau đó prune các vector `book_*` không còn tồn tại trong PostgreSQL.

### POST /api/ingest/books/{book_id}

```json
// Upsert một đầu sách đã commit từ PostgreSQL vào ChromaDB.
// Protected: internal call, header X-Internal-Key.

// Response
{
  "status": "success",
  "books_ingested": 1,
  "book_id": 25445
}
```

### DELETE /api/ingest/books/{book_id}

```json
// Xóa vector của một đầu sách khỏi ChromaDB sau khi sách bị xóa ở backend.
// Protected: internal call, header X-Internal-Key.

// Response
{
  "status": "success",
  "books_deleted": 1,
  "book_id": 25445
}
```

### GET /api/health

```json
{
  "status": "healthy",
  "classifier_loaded": true,
  "chroma_books_count": 150,
  "llm_provider": "deepseek"
}
```

---

## 9. Model Choices
 
### Embedding Model
- **RAG Semantic Search**: `BAAI/bge-m3`
  - Hỗ trợ ngữ nghĩa đa ngôn ngữ xuất sắc (Dense, Sparse, Multi-vector).
  - Hệ thống hiện dùng BGE-M3 ở chế độ dense embedding thuần cho ChromaDB; lexical retrieval do PostgreSQL FTS xử lý.
  - Nếu host có NVIDIA GPU và Docker GPU runtime, model chạy trên CUDA với half-precision (float16). Trên DigitalOcean Droplet thường không có GPU, service chạy CPU với cấu hình thread giới hạn.
  - Kích hoạt cơ chế tự phục hồi **CUDA Out of Memory (Self-Healing Loop)** khi chạy trên GPU: tự động hạ xuống `batch_size=2` hoặc fallback sang CPU tạm thời khi gặp văn bản mô tả siêu dài.
  - Cấu hình cache **`HF_HOME=/data/huggingface`** trên volume bền vững giúp tránh tải lại mô hình 2.2GB khi container restart/rebuild.
  - Khi đổi embedding model hoặc dùng lại Chroma volume cũ từ model khác, cần recreate collection/clear ChromaDB rồi full ingest lại để tránh lỗi sai kích thước vector.
- **Intent Classifier**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
  - Nhẹ (~130MB), hỗ trợ tiếng Việt tốt.
  - Phục vụ phân loại ý định cực kỳ nhanh (< 2ms) trên CPU/GPU.

### LLM
| Option | Chi phí | Chất lượng | Latency | Phù hợp |
|--------|---------|-----------|---------|---------|
| **DeepSeek V4 Flash** | Trả theo token | Tốt | ~1-3s | Development + Demo |
| Ollama + Gemma 2 9B | Free (local) | Khá | ~3-5s | Offline demo, cần 8GB+ RAM |

> **Cấu hình hiện tại**: dùng duy nhất `deepseek-v4-flash` ở non-thinking mode, `temperature=0.3` và giới hạn mặc định 1200 output tokens (`LLM_MAX_TOKENS`). Prompt tìm sách giới hạn tối đa 3 gợi ý và service dọn các dấu Markdown/emphasis để giao diện chat hiển thị sạch hơn.

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

### 10.2 Auto-sync khi thêm/sửa/xóa sách

```java
// BookService registers this after the DB transaction commits.
runAfterCommit(() -> ragBookSyncService.upsertBook(bookId));

// RagBookSyncService sends non-critical async internal requests.
POST /api/ingest/books/{bookId}
DELETE /api/ingest/books/{bookId}
```

Backend không gọi full `/api/ingest` cho từng lần thêm/sửa sách nữa. Full ingest chỉ dùng khi cần rebuild/backfill toàn bộ vector DB.

### 10.3 Docker Compose

```yaml
# Thêm vào docker-compose.yml hiện có
rag-service:
  build: ./rag-service
  ports:
    - "8000:8000"
  environment:
    - SPRING_BOOT_URL=http://backend:8080/api
    - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
    - DEEPSEEK_MODEL=${DEEPSEEK_MODEL:-deepseek-v4-flash}
    - INTERNAL_API_KEY=${INTERNAL_API_KEY:-SuperSecretInternalApiKey123!}
    - CHROMA_PERSIST_DIR=/data/chroma
    - HF_HOME=/data/huggingface
    - ENV=production
    - PYTHONUNBUFFERED=1
    - OMP_NUM_THREADS=6
    - MKL_NUM_THREADS=6
  volumes:
    - rag_data:/data
  depends_on:
    postgres:
      condition: service_healthy

# Optional only for machines with NVIDIA GPU + Docker GPU runtime.
# DigitalOcean Basic/Premium CPU Droplets should omit this block and run BGE-M3 on CPU.
# deploy:
#   resources:
#     reservations:
#       devices:
#         - driver: nvidia
#           count: all
#           capabilities: [gpu]

volumes:
  rag_data:
```

---

## 11. Implementation Plan — Checklist

### Phase 1: Foundation (Tuần 11 — ngày 1-2)
- [x] Init FastAPI project (`rag-service/`)
- [x] Setup `requirements.txt` (fastapi, uvicorn, chromadb, sentence-transformers, scikit-learn, underthesea, httpx, python-dotenv, psycopg2-binary)
- [x] Config `.env.example` + `config.py` (cần thêm `DATABASE_URL` để kết nối Postgres đọc dữ liệu sách)
- [x] Pydantic models (request/response)
- [x] Health check endpoint

### Phase 2: Intent Classifier (Tuần 11 — ngày 2-3)
- [x] Viết training data (115 câu, 4 intents: 45 BOOK_SEARCH, 25 BORROW_STATUS, 20 HOLD_STATUS, 25 GENERAL_CHAT)
- [x] Implement `IntentClassifier` (SentenceTransformer dense embeddings + Calibrated SVM)
- [x] Train + save model (`.joblib`)
- [x] Unit tests cho classifier (accuracy > 90%)
- [x] Confidence threshold + fallback logic

### Phase 3: RAG Pipeline (Tuần 11 — ngày 3-5)
- [x] Implement ingestion script (PostgreSQL → ChromaDB)
- [x] Implement hybrid search (PostgreSQL lexical + ChromaDB semantic retrieval + RRF)
- [x] Implement query normalization before lexical/vector retrieval
- [x] Prompt templates cho BOOK_SEARCH
- [x] LLM service dùng DeepSeek API
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
- [x] Auto-sync từng sách khi thêm/sửa/xóa, full ingest có prune vector cũ
- [x] Kiểm thử chuỗi sync nội bộ: Spring Boot gọi đúng endpoint, RAG endpoint xác thực `X-Internal-Key`, ingestion gọi upsert/delete và ChromaDB ephemeral lưu/truy vấn được bằng mock embedding
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
| DeepSeek hết số dư hoặc rate limit | Hiển thị lỗi thân thiện và theo dõi Usage/Billing để nạp thêm hạn mức |
| SVM accuracy thấp | Thêm training data, tune hyperparams, dùng LLM-based classification fallback |
| ChromaDB embedding chậm | Batch ingestion, chỉ re-ingest sách mới/thay đổi |
| Tiếng Việt không chính xác | Dùng SentenceTransformer multilingual cho phân loại/tìm kiếm ngữ nghĩa; bổ sung training data và query normalization theo các mẫu câu hỏi nghiệp vụ khi gặp cách hỏi mới |
| JWT expired khi gọi Spring Boot | Forward nguyên JWT từ frontend, để Spring Boot tự validate |

## Status: ✅ Đã hoàn thành
