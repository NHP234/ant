import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import time

from app.config import settings

logger = logging.getLogger("rag-service.ingestion")

def load_books_from_postgres() -> list[dict]:
    """
    Kết nối trực tiếp tới PostgreSQL database và tải danh sách toàn bộ sách cùng các thể loại tương ứng.
    """
    connection = None
    cursor = None
    books = []
    
    logger.info("Đang kết nối tới PostgreSQL để lấy dữ liệu sách...")
    start_time = time.time()
    
    try:
        connection = psycopg2.connect(settings.database_url)
        # Sử dụng RealDictCursor để lấy kết quả dạng dictionary key-value
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # Câu lệnh SQL gom nhóm các category name phân tách bằng dấu phẩy
        query = """
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
            GROUP BY b.id
        """
        
        cursor.execute(query)
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
    rag_service.upsert_books(books)
    duration = time.time() - start_time
    logger.info(f"Đồng bộ hóa {len(books)} cuốn sách vào ChromaDB hoàn tất trong {duration:.2f} giây.")
    return len(books)
