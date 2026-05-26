import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import torch
import sys

# Thêm thư mục gốc vào PYTHONPATH để nhận diện app package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_service import RAGService
from app.utils.ingestion import sync_postgres_to_chroma

def main():
    print("=== TIẾN TRÌNH ĐỒNG BỘ DỮ LIỆU SÁCH (POSTGRESQL -> CHROMADB) ===")
    
    try:
        # Khởi tạo RAG Service (lưu ý: sẽ tải embedding model nếu chạy lần đầu)
        rag_service = RAGService()
        
        # Bắt đầu đồng bộ
        count = sync_postgres_to_chroma(rag_service)
        
        print(f"Đã hoàn thành đồng bộ thành công {count} cuốn sách vào Vector Database!")
        print(f"Tổng số bản ghi hiện có trong ChromaDB: {rag_service.get_books_count()}")
        print("=== TIẾN TRÌNH HOÀN TẤT ===")
    except Exception as e:
        print(f"⚠️ Gặp lỗi nghiêm trọng trong quá trình đồng bộ: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
