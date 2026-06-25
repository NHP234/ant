import os
import logging
import re
import chromadb
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.services.query_normalizer import normalize_book_search_query, normalize_search_text

logger = logging.getLogger("rag-service.rag")

VECTOR_RELEVANCE_THRESHOLD = 0.53

SEARCH_STOPWORDS = {
    "a",
    "about",
    "ai",
    "anh",
    "author",
    "book",
    "books",
    "cho",
    "chung",
    "co",
    "cua",
    "cuon",
    "dau",
    "chu",
    "de",
    "duoc",
    "find",
    "gia",
    "gi",
    "giup",
    "khong",
    "kiem",
    "la",
    "nao",
    "noi",
    "of",
    "quyen",
    "sach",
    "search",
    "tac",
    "the",
    "thi",
    "tim",
    "toi",
    "truyen",
    "sao",
    "thu",
    "ve",
    "vien",
    "viet",
    "voi",
}


def _normalize_title(title: str) -> str:
    normalized = re.sub(r"\s+", " ", (title or "").strip().lower())
    return normalized.strip("\"'`*_.,:;!? ")


def _normalize_search_text(value: str) -> str:
    return normalize_search_text(value)


def _extract_lexical_terms(question: str, limit: int = 8) -> list[str]:
    normalized = _normalize_search_text(question)
    terms = []
    for token in normalized.split():
        if len(token) < 2 or token.isdigit() or token in SEARCH_STOPWORDS:
            continue
        if token not in terms:
            terms.append(token)
        if len(terms) >= limit:
            break
    return terms


def _format_book_document(book: dict) -> str:
    categories = book.get("categories", [])
    categories_str = ", ".join(categories) if isinstance(categories, list) else str(categories or "")
    return f"""
Tên sách: {book.get("title", "")}
Tác giả: {book.get("author", "")}
Thể loại: {categories_str}
Nhà xuất bản: {book.get("publisher", "N/A")}
Năm xuất bản: {book.get("publishYear", "N/A")}
Mô tả: {book.get("description", "Chưa có mô tả chi tiết cho cuốn sách này.")}
""".strip()


def _source_from_book(book: dict, relevance_score: float) -> dict:
    return {
        "book_id": int(book["id"]),
        "title": book["title"],
        "author": book.get("author", ""),
        "relevance_score": round(max(0.0, min(1.0, relevance_score)), 2),
    }


def _score_lexical_book(book: dict, terms: list[str]) -> int:
    title = _normalize_search_text(book.get("title", ""))
    author = _normalize_search_text(book.get("author", ""))
    categories = _normalize_search_text(" ".join(book.get("categories", [])))
    description = _normalize_search_text(book.get("description", ""))
    title_tokens = title.split()
    author_tokens = author.split()
    category_tokens = categories.split()
    description_tokens = description.split()
    phrase = " ".join(terms)
    title_count = _count_token_matches(terms, title_tokens)
    author_count = _count_token_matches(terms, author_tokens, allow_prefix=False)
    category_count = _count_token_matches(terms, category_tokens)
    description_count = _count_token_matches(terms, description_tokens)
    phrase_in_title = len(terms) > 1 and phrase in title
    phrase_in_author = len(terms) > 1 and phrase in author
    phrase_in_categories = len(terms) > 1 and phrase in categories
    phrase_in_description = len(terms) > 1 and phrase in description

    if len(terms) > 1 and not (
        phrase_in_title
        or phrase_in_author
        or phrase_in_categories
        or phrase_in_description
        or title_count == len(terms)
        or author_count == len(terms)
        or category_count == len(terms)
        or description_count == len(terms)
    ):
        return 0

    score = 0
    if phrase_in_title:
        score += 100
    if phrase_in_author:
        score += 95
    if phrase_in_categories:
        score += 80
    if phrase_in_description:
        score += 45
    if title_count == len(terms):
        score += 70
    if author_count == len(terms):
        score += 65

    for term in terms:
        if _matches_token(term, title_tokens):
            score += 22
        if _matches_token(term, author_tokens, allow_prefix=False):
            score += 20
        if _matches_token(term, category_tokens):
            score += 4
        if _matches_token(term, description_tokens):
            score += 2
    return score


def _is_strong_lexical_score(score: int) -> bool:
    return score >= 20


def _matches_token(term: str, tokens: list[str], allow_prefix: bool = True) -> bool:
    if term in tokens:
        return True
    return allow_prefix and len(term) >= 4 and any(token.startswith(term) for token in tokens)


def _count_token_matches(terms: list[str], tokens: list[str], allow_prefix: bool = True) -> int:
    return sum(1 for term in terms if _matches_token(term, tokens, allow_prefix))


def _is_relevant_vector_match(relevance: float) -> bool:
    return relevance >= VECTOR_RELEVANCE_THRESHOLD

class SentenceTransformerEmbeddingFunction:
    def __init__(self, model_name: str = 'BAAI/bge-m3'):
        logger.info(f"Đang tải Embedding Model: {model_name} (khoảng 2.2GB, BGE-M3)...")
        import torch
        import os
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Sử dụng thiết bị: {device}")
        if device == 'cpu':
            num_threads = int(os.environ.get("OMP_NUM_THREADS", 6))
            torch.set_num_threads(num_threads)
            logger.info(f"Cấu hình PyTorch CPU threads: {torch.get_num_threads()}")
        self.model = SentenceTransformer(model_name, device=device)
        if device == 'cuda':
            logger.info("Chuyển mô hình sang half-precision (float16) để tiết kiệm VRAM...")
            self.model = self.model.half()
        logger.info("Tải Embedding Model thành công!")

    def __call__(self, input: list[str]) -> list[list[float]]:
        # Thực hiện encode và chuyển kết quả thành list các số thực float
        import torch
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        if device == 'cuda':
            try:
                # Chạy mặc định với batch_size=16
                embeddings = self.model.encode(input, batch_size=16, convert_to_numpy=True)
                torch.cuda.empty_cache()
            except RuntimeError as e:
                if "out of memory" in str(e).lower():
                    logger.warning("Phát hiện CUDA Out of Memory! Đang dọn dẹp cache và chạy lại với batch_size=2 để tiết kiệm bộ nhớ...")
                    torch.cuda.empty_cache()
                    try:
                        embeddings = self.model.encode(input, batch_size=2, convert_to_numpy=True)
                        torch.cuda.empty_cache()
                    except RuntimeError as e2:
                        if "out of memory" in str(e2).lower():
                            logger.warning("Vẫn bị CUDA OOM khi chạy với batch_size=2! Tự động chuyển sang chạy bằng CPU cho lô này để đảm bảo an toàn...")
                            torch.cuda.empty_cache()
                            # Tạm thời chuyển model sang CPU để encode lô này
                            self.model = self.model.to('cpu')
                            embeddings = self.model.encode(input, batch_size=16, convert_to_numpy=True)
                            # Sau đó trả model về lại GPU CUDA
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

class RAGService:
    def __init__(self):
        self.persist_dir = settings.chroma_persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        
        try:
            logger.info("Initializing PostgreSQL Connection Pool...")
            self.db_pool = ThreadedConnectionPool(
                minconn=1,
                maxconn=20,
                dsn=settings.database_url
            )
            logger.info(f"Đang khởi tạo ChromaDB Persistent Client tại: {self.persist_dir}")
            self.client = chromadb.PersistentClient(path=self.persist_dir)
            
            # Khởi tạo embedding function
            self.embedding_fn = SentenceTransformerEmbeddingFunction()
            
            # Khởi tạo hoặc lấy collection sách, dùng Cosine similarity
            self.collection = self.client.get_or_create_collection(
                name="books",
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("Khởi tạo RAG Service (ChromaDB + SentenceTransformer) thành công!")
        except Exception as e:
            logger.error(f"Lỗi khi khởi tạo ChromaDB hoặc Embedding Model: {str(e)}")
            raise e

    def close(self):
        """
        Close all active database connections in the pool.
        """
        if hasattr(self, "db_pool") and self.db_pool:
            logger.info("Closing PostgreSQL connection pool...")
            self.db_pool.closeall()

    def get_books_count(self) -> int:
        """
        Trả về tổng số sách hiện có trong ChromaDB collection.
        """
        try:
            return self.collection.count()
        except Exception as e:
            logger.error(f"Lỗi khi lấy số lượng sách trong ChromaDB: {str(e)}")
            return 0

    def upsert_books(self, books: list[dict]):
        """
        Đồng bộ danh sách sách vào Vector Database (Upsert).
        Mỗi book dict chứa: id, title, author, description, categories (list), publisher, publishYear
        """
        if not books:
            logger.warning("Không có sách nào được gửi để nạp (empty list).")
            return
            
        documents = []
        metadatas = []
        ids = []
        
        for book in books:
            categories_str = ", ".join(book.get("categories", [])) if isinstance(book.get("categories"), list) else str(book.get("categories", ""))
            
            # Sử dụng mô tả đầy đủ theo yêu cầu của người dùng để tránh giảm chất lượng tìm kiếm RAG
            raw_desc = book.get('description', 'Chưa có mô tả chi tiết cho cuốn sách này.') or 'Chưa có mô tả chi tiết cho cuốn sách này.'
            
            # Xây dựng văn bản mô tả phong phú (Rich Text Document) đầy đủ thông tin
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
                "categories": categories_str,
            })
            ids.append(f"book_{book['id']}")
            
        logger.info(f"Đang chuẩn bị upsert {len(ids)} cuốn sách vào ChromaDB...")
        
        # Chia nhỏ dữ liệu (chunking) để nạp vào ChromaDB, tránh lỗi quá tải RAM hoặc giới hạn Batch
        batch_size = 500
        for i in range(0, len(ids), batch_size):
            end_idx = min(i + batch_size, len(ids))
            logger.info(f"  -> Đang upsert lô sách từ {i+1} đến {end_idx}...")
            
            self.collection.upsert(
                documents=documents[i:end_idx],
                metadatas=metadatas[i:end_idx],
                ids=ids[i:end_idx]
            )
            
        logger.info("Upsert toàn bộ dữ liệu sách vào ChromaDB hoàn tất!")

    def delete_book(self, book_id: int):
        """
        Remove one book from the vector database. Missing IDs are treated as a no-op.
        """
        chroma_id = f"book_{book_id}"
        try:
            self.collection.delete(ids=[chroma_id])
            logger.info("Deleted book %s from ChromaDB if it existed.", book_id)
        except Exception as e:
            logger.error("Failed to delete book %s from ChromaDB: %s", book_id, str(e))
            raise

    def delete_books_not_in(self, book_ids: list[int]) -> int:
        """
        Remove stale vectors that no longer exist in PostgreSQL.
        """
        keep_ids = {f"book_{book_id}" for book_id in book_ids}
        results = self.collection.get(include=[])
        existing_ids = results.get("ids") or []
        stale_ids = [chroma_id for chroma_id in existing_ids if chroma_id not in keep_ids]
        if not stale_ids:
            return 0

        batch_size = 500
        for i in range(0, len(stale_ids), batch_size):
            self.collection.delete(ids=stale_ids[i:i + batch_size])

        logger.info("Deleted %s stale book vectors from ChromaDB.", len(stale_ids))
        return len(stale_ids)

    def _search_books_lexically(self, question: str, limit: int) -> list[tuple[str, dict]]:
        terms = _extract_lexical_terms(question)
        if not terms:
            return []

        search_query = " ".join(terms)
        query = """
            SELECT
                b.id,
                b.title,
                COALESCE(string_agg(DISTINCT auth.name, ', '), '') AS author,
                b.publisher,
                b.publish_year AS "publishYear",
                COALESCE(b.description, '') AS description,
                COALESCE(string_agg(DISTINCT c.name, ','), '') AS categories
            FROM books b
            LEFT JOIN book_authors ba ON b.id = ba.book_id
            LEFT JOIN authors auth ON ba.author_id = auth.id
            LEFT JOIN book_categories bc ON b.id = bc.book_id
            LEFT JOIN categories c ON bc.category_id = c.id
            WHERE b.search_vector @@ plainto_tsquery('vietnamese', %s)
            GROUP BY b.id
            ORDER BY ts_rank_cd(b.search_vector, plainto_tsquery('vietnamese', %s)) DESC, b.id
            LIMIT 200
        """
        params = (search_query, search_query)

        try:
            connection = self.db_pool.getconn()
            try:
                with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, params)
                    rows = cursor.fetchall()
            finally:
                self.db_pool.putconn(connection)
        except Exception as e:
            logger.warning("Lexical PostgreSQL book search failed; falling back to Chroma only: %s", str(e))
            return []

        scored_books = []
        for row in rows:
            book = dict(row)
            categories = book.get("categories") or ""
            book["categories"] = [category.strip() for category in categories.split(",") if category.strip()]
            score = _score_lexical_book(book, terms)
            if _is_strong_lexical_score(score):
                scored_books.append((score, book))

        scored_books.sort(key=lambda item: (-item[0], item[1]["id"]))
        matches = []
        for score, book in scored_books[:limit]:
            relevance = 0.65 + (min(score, 160) / 400)
            matches.append((_format_book_document(book), _source_from_book(book, relevance)))
        return matches

    def _search_books_chroma_only(self, question: str, n_results: int = 5) -> list[tuple[str, dict]]:
        """
        Tìm kiếm các sách liên quan nhất trong vector database bằng cosine similarity.
        Trả về: list[tuple[document_text, source_dict]]
        """
        if self.get_books_count() == 0:
            logger.warning("ChromaDB đang trống rỗng. Hãy nạp sách trước!")
            return []
            
        logger.info(f"Đang tìm kiếm sách khớp với câu hỏi: '{question}'...")
        results = self.collection.query(
            query_texts=[question],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )
        
        if not results or not results["documents"] or not results["documents"][0]:
            return []
            
        matches = []
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]
        
        for i, meta in enumerate(metadatas):
            # Với Cosine distance, khoảng cách (distance) dao động từ 0 (giống nhất) đến 2 (khác nhất).
            # Relevance score = 1 - Cosine distance. Đảm bảo nằm trong khoảng 0.0 - 1.0.
            distance = distances[i]
            relevance = max(0.0, min(1.0, float(1.0 - distance)))
            if not _is_relevant_vector_match(relevance):
                continue
            
            source = {
                "book_id": meta["book_id"],
                "title": meta["title"],
                "author": meta["author"],
                "relevance_score": round(relevance, 2)
            }
            matches.append((documents[i], source))
            
        logger.info(f"Tìm thấy {len(matches)} sách liên quan trong ChromaDB.")
        return matches

    def search_books(self, question: str, n_results: int = 5) -> tuple[str, list[dict]]:
        """
        Search books with hybrid search using Reciprocal Rank Fusion (RRF).
        Returns: (context_str, source_books_list)
        """
        if self.get_books_count() == 0:
            logger.warning("ChromaDB is empty. Ingest books before searching.")
            return "", []

        book_query = normalize_book_search_query(question)
        if book_query.changed:
            logger.info(
                "Normalized book search query. original='%s', normalized='%s'",
                book_query.original,
                book_query.normalized,
            )

        logger.info("Performing hybrid search for question: '%s'...", question)

        # 1. Lexical Search
        lexical_raw = self._search_books_lexically(book_query.lexical, limit=n_results * 2)
        if book_query.changed:
            lexical_raw.extend(self._search_books_lexically(normalize_search_text(book_query.original), limit=n_results * 2))

        # Sort and deduplicate lexical matches to form a single ranked lexical list
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

        # 3. Reciprocal Rank Fusion (RRF) with constant k=60
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
                # Keep the maximum relevance score if a book appears in both lists
                existing_score = scores[bid]["source"]["relevance_score"]
                new_score = source["relevance_score"]
                if new_score > existing_score:
                    scores[bid]["source"]["relevance_score"] = new_score
            scores[bid]["rrf_score"] += 1.0 / (k + rank)

        # Sort by combined RRF score descending
        sorted_results = sorted(scores.values(), key=lambda item: -item["rrf_score"])
        top_results = sorted_results[:n_results]

        merged_documents = [item["doc"] for item in top_results]
        source_books = [item["source"] for item in top_results]

        if not source_books:
            return "", []

        context = "\n\n---\n\n".join(merged_documents)
        logger.info(
            "Hybrid book search completed: merged %s candidates into %s final books.",
            len(scores),
            len(source_books),
        )
        return context, source_books

    def get_book_by_title(self, title: str) -> tuple[str, list[dict]]:
        if self.get_books_count() == 0:
            logger.warning("ChromaDB is empty. Ingest books before exact title lookup.")
            return "", []

        expected_title = _normalize_title(title)
        logger.info("Looking up book by exact title: '%s'...", title)
        results = self.collection.get(
            where={"title": title},
            include=["documents", "metadatas"],
        )

        documents = results.get("documents") or []
        metadatas = results.get("metadatas") or []
        if not documents:
            logger.info("Exact title lookup missed; falling back to vector search by title.")
            context, source_books = self.search_books(title, n_results=1)
            if source_books and _normalize_title(source_books[0].get("title", "")) == expected_title:
                return context, source_books
            return "", []

        for document, meta in zip(documents, metadatas):
            if _normalize_title(meta.get("title", "")) != expected_title:
                continue
            return document, [
                {
                    "book_id": meta["book_id"],
                    "title": meta["title"],
                    "author": meta["author"],
                    "relevance_score": 1.0,
                }
            ]

        return "", []
