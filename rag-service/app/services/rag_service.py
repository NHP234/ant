import os
import logging
import re
import chromadb
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger("rag-service.rag")


def _normalize_title(title: str) -> str:
    normalized = re.sub(r"\s+", " ", (title or "").strip().lower())
    return normalized.strip("\"'`*_.,:;!? ")

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

    def search_books(self, question: str, n_results: int = 5) -> tuple[str, list[dict]]:
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
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]
        
        for i, meta in enumerate(metadatas):
            # Với Cosine distance, khoảng cách (distance) dao động từ 0 (giống nhất) đến 2 (khác nhất).
            # Relevance score = 1 - Cosine distance. Đảm bảo nằm trong khoảng 0.0 - 1.0.
            distance = distances[i]
            relevance = max(0.0, min(1.0, float(1.0 - distance)))
            
            source_books.append({
                "book_id": meta["book_id"],
                "title": meta["title"],
                "author": meta["author"],
                "relevance_score": round(relevance, 2)
            })
            
        # Ghép các documents thành một chuỗi context ngăn cách bởi dấu phân tách
        context = "\n\n---\n\n".join(documents)
        logger.info(f"Tìm thấy {len(source_books)} sách liên quan trong ChromaDB.")
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
