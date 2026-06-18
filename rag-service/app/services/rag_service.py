import os
import logging
import re
import unicodedata
import chromadb
import psycopg2
from psycopg2.extras import RealDictCursor
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger("rag-service.rag")

VECTOR_RELEVANCE_THRESHOLD = 0.57

SEARCH_STOPWORDS = {
    "a",
    "about",
    "ai",
    "anh",
    "author",
    "ban",
    "book",
    "books",
    "cho",
    "chung",
    "co",
    "cua",
    "cuon",
    "dau",
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
    ascii_text = unicodedata.normalize("NFKD", value or "")
    ascii_text = "".join(char for char in ascii_text if not unicodedata.combining(char))
    normalized = re.sub(r"[^a-zA-Z0-9]+", " ", ascii_text.lower())
    return re.sub(r"\s+", " ", normalized).strip()


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
    def __init__(self, model_name: str = 'paraphrase-multilingual-MiniLM-L12-v2'):
        logger.info(f"Đang tải Embedding Model: {model_name} (khoảng 130MB, có hỗ trợ tiếng Việt)...")
        # Sử dụng CPU để chạy ổn định trên mọi môi trường
        self.model = SentenceTransformer(model_name, device='cpu')
        logger.info("Tải Embedding Model thành công!")

    def __call__(self, input: list[str]) -> list[list[float]]:
        # Thực hiện encode và chuyển kết quả thành list các số thực float
        embeddings = self.model.encode(input, convert_to_numpy=True)
        return embeddings.tolist()

class RAGService:
    def __init__(self):
        self.persist_dir = settings.chroma_persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        
        try:
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
            
            # Xây dựng văn bản mô tả phong phú (Rich Text Document)
            doc = f"""
Tên sách: {book['title']}
Tác giả: {book['author']}
Thể loại: {categories_str}
Nhà xuất bản: {book.get('publisher', 'N/A')}
Năm xuất bản: {book.get('publishYear', 'N/A')}
Mô tả: {book.get('description', 'Chưa có mô tả chi tiết cho cuốn sách này.')}
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

        where_clause = " OR ".join(["search_text LIKE %s" for _ in terms])
        rank_clause = " + ".join(["CASE WHEN search_text LIKE %s THEN 1 ELSE 0 END" for _ in terms])
        like_params = [f"%{term}%" for term in terms]
        params = like_params + like_params
        query = f"""
            WITH book_data AS (
                SELECT
                    b.id,
                    b.title,
                    COALESCE(string_agg(DISTINCT auth.name, ', '), '') AS author,
                    b.publisher,
                    b.publish_year AS "publishYear",
                    COALESCE(b.description, '') AS description,
                    COALESCE(string_agg(DISTINCT c.name, ','), '') AS categories,
                    lower(unaccent(concat_ws(
                        ' ',
                        b.title,
                        COALESCE(string_agg(DISTINCT auth.name, ', '), ''),
                        COALESCE(b.description, ''),
                        COALESCE(string_agg(DISTINCT c.name, ','), '')
                    ))) AS search_text
                FROM books b
                LEFT JOIN book_authors ba ON b.id = ba.book_id
                LEFT JOIN authors auth ON ba.author_id = auth.id
                LEFT JOIN book_categories bc ON b.id = bc.book_id
                LEFT JOIN categories c ON bc.category_id = c.id
                GROUP BY b.id
            )
            SELECT id, title, author, publisher, "publishYear", description, categories
            FROM book_data
            WHERE {where_clause}
            ORDER BY ({rank_clause}) DESC, id
            LIMIT 200
        """

        try:
            with psycopg2.connect(settings.database_url) as connection:
                with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query, params)
                    rows = cursor.fetchall()
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

    def _search_books_chroma_only(self, question: str, n_results: int = 5) -> tuple[str, list[dict]]:
        """
        Tìm kiếm các sách liên quan nhất trong vector database bằng cosine similarity.
        Trả về: (context_str, source_books_list)
        """
        if self.get_books_count() == 0:
            logger.warning("ChromaDB đang trống rỗng. Hãy nạp sách trước!")
            return "", []
            
        logger.info(f"Đang tìm kiếm sách khớp với câu hỏi: '{question}'...")
        results = self.collection.query(
            query_texts=[question],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )
        
        if not results or not results["documents"] or not results["documents"][0]:
            return "", []
            
        source_books = []
        relevant_documents = []
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
            
            relevant_documents.append(documents[i])
            source_books.append({
                "book_id": meta["book_id"],
                "title": meta["title"],
                "author": meta["author"],
                "relevance_score": round(relevance, 2)
            })
            
        # Ghép các documents thành một chuỗi context ngăn cách bởi dấu phân tách
        context = "\n\n---\n\n".join(relevant_documents)
        logger.info(f"Tìm thấy {len(source_books)} sách liên quan trong ChromaDB.")
        return context, source_books

    def search_books(self, question: str, n_results: int = 5) -> tuple[str, list[dict]]:
        """
        Search books with a lexical PostgreSQL pass first, then Chroma semantic search.
        Returns: (context_str, source_books_list)
        """
        if self.get_books_count() == 0:
            logger.warning("ChromaDB is empty. Ingest books before searching.")
            return "", []

        logger.info("Searching books for question: '%s'...", question)
        lexical_matches = self._search_books_lexically(question, limit=n_results)
        decisive_lexical_match = (
            bool(lexical_matches)
            and lexical_matches[0][1].get("relevance_score", 0.0) >= 0.9
        )
        if decisive_lexical_match:
            lexical_matches = [
                match
                for match in lexical_matches
                if match[1].get("relevance_score", 0.0) >= 0.9
            ]
        if lexical_matches:
            vector_context, vector_sources = "", []
        else:
            vector_context, vector_sources = self._search_books_chroma_only(
                question,
                n_results=max(n_results, n_results + len(lexical_matches)),
            )

        merged_documents = []
        source_books = []
        seen_book_ids = set()

        for document, source in lexical_matches:
            book_id = source["book_id"]
            if book_id in seen_book_ids:
                continue
            merged_documents.append(document)
            source_books.append(source)
            seen_book_ids.add(book_id)

        vector_documents = [doc for doc in vector_context.split("\n\n---\n\n") if doc.strip()]
        for index, source in enumerate(vector_sources):
            if len(source_books) >= n_results:
                break
            book_id = source["book_id"]
            if book_id in seen_book_ids:
                continue
            if index < len(vector_documents):
                merged_documents.append(vector_documents[index])
            source_books.append(source)
            seen_book_ids.add(book_id)

        if not source_books:
            return "", []

        context = "\n\n---\n\n".join(merged_documents)
        logger.info(
            "Hybrid book search found %s lexical and %s vector matches; returning %s books.",
            len(lexical_matches),
            len(vector_sources),
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
