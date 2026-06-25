import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import time

from app.config import settings

logger = logging.getLogger("rag-service.ingestion")

def load_books_from_postgres(book_id: int | None = None) -> list[dict]:
    """
    Kết nối trực tiếp tới PostgreSQL database và tải danh sách toàn bộ sách cùng các thể loại tương ứng.
    """
    connection = None
    cursor = None
    books = []
    
    if book_id is None:
        logger.info("Đang kết nối tới PostgreSQL để lấy dữ liệu sách...")
    else:
        logger.info("Loading book %s from PostgreSQL for vector sync...", book_id)
    start_time = time.time()
    
    try:
        connection = psycopg2.connect(settings.database_url)
        # Sử dụng RealDictCursor để lấy kết quả dạng dictionary key-value
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # Câu lệnh SQL gom nhóm các category name phân tách bằng dấu phẩy
        where_clause = "WHERE b.id = %s" if book_id is not None else ""
        query = f"""
            SELECT 
                b.id, 
                b.title, 
                COALESCE(string_agg(DISTINCT auth.name, ', '), '') as author,
                b.publisher, 
                b.publish_year as "publishYear", 
                b.description,
                COALESCE(string_agg(DISTINCT c.name, ','), '') as categories
            FROM books b
            LEFT JOIN book_authors ba ON b.id = ba.book_id
            LEFT JOIN authors auth ON ba.author_id = auth.id
            LEFT JOIN book_categories bc ON b.id = bc.book_id
            LEFT JOIN categories c ON bc.category_id = c.id
            {where_clause}
            GROUP BY b.id
            ORDER BY b.id
        """
        
        if book_id is None:
            cursor.execute(query)
        else:
            cursor.execute(query, (book_id,))
        rows = cursor.fetchall()
        
        for row in rows:
            # Chuyển đổi chuỗi categories phân tách bằng dấu phẩy thành list
            cats_list = [cat.strip() for cat in row["categories"].split(",")] if row["categories"] else []
            
            books.append({
                "id": row["id"],
                "title": row["title"],
                "author": row["author"],
                "publisher": row["publisher"] or "N/A",
                "publishYear": row["publishYear"] or "N/A",
                "description": row["description"] or "Chưa có mô tả chi tiết.",
                "categories": cats_list
            })
            
        duration = time.time() - start_time
        logger.info(f"Tải thành công {len(books)} cuốn sách từ Postgres trong {duration:.2f} giây.")
        return books
        
    except Exception as e:
        logger.error(f"Lỗi khi truy vấn dữ liệu từ PostgreSQL: {str(e)}")
        return []
        
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

def sync_postgres_to_chroma(rag_service) -> int:
    """
    Thực hiện lấy sách từ Postgres và đồng bộ hóa (upsert) vào ChromaDB.
    Trả về số lượng sách đã được đồng bộ.
    """
    books = load_books_from_postgres()
    if not books:
        logger.warning("Không có dữ liệu sách từ PostgreSQL để đồng bộ.")
        return 0
        
    start_time = time.time()
    
    # Lọc bỏ các sách đã có sẵn vector trong ChromaDB để tránh việc encode lại từ đầu
    try:
        existing_results = rag_service.collection.get(include=[])
        existing_ids = set(existing_results.get("ids") or [])
        logger.info(f"Tìm thấy {len(existing_ids)} cuốn sách đã có vector trong ChromaDB.")
        
        books_to_ingest = [
            b for b in books 
            if f"book_{b['id']}" not in existing_ids
        ]
        logger.info(f"Số lượng sách cần sinh vector mới: {len(books_to_ingest)} / {len(books)} cuốn.")
    except Exception as e:
        logger.warning(f"Lỗi khi kiểm tra ID cũ từ ChromaDB, tiến hành nạp lại toàn bộ: {str(e)}")
        books_to_ingest = books
        
    rag_service.upsert_books(books_to_ingest)
    stale_count = rag_service.delete_books_not_in([book["id"] for book in books])
    duration = time.time() - start_time
    logger.info(
        "Đồng bộ hóa %s cuốn sách vào ChromaDB hoàn tất trong %.2f giây. Đã xóa %s vector cũ.",
        len(books),
        duration,
        stale_count,
    )
    return len(books)

def sync_book_from_postgres(rag_service, book_id: int) -> int:
    """
    Upsert one committed book from Postgres into ChromaDB.
    """
    books = load_books_from_postgres(book_id)
    if not books:
        logger.warning("Book %s was not found in PostgreSQL for vector sync.", book_id)
        return 0

    start_time = time.time()
    rag_service.upsert_books(books)
    duration = time.time() - start_time
    logger.info("Synced book %s into ChromaDB in %.2f seconds.", book_id, duration)
    return len(books)

def delete_book_from_chroma(rag_service, book_id: int) -> int:
    """
    Delete one book vector by ID.
    """
    rag_service.delete_book(book_id)
    return 1
