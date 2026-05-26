import re
from underthesea import word_tokenize

def clean_and_tokenize(text: str) -> str:
    """
    Làm sạch văn bản tiếng Việt và tách từ (word tokenization).
    Sử dụng underthesea với format="text" để nối các từ ghép bằng dấu gạch dưới (ví dụ: "trí_tuệ nhân_tạo").
    """
    if not text:
        return ""
    
    # Chuyển về chữ thường
    text = text.lower().strip()
    
    # Loại bỏ ký tự đặc biệt, chỉ giữ lại chữ cái, số và khoảng trắng
    text = re.sub(r"[^\w\s\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    
    # Tách từ tiếng Việt
    try:
        tokenized = word_tokenize(text, format="text")
        return tokenized
    except Exception:
        # Fallback nếu underthesea bị lỗi
        return text
