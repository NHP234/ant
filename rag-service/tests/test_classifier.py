import os
import sys
import pytest

# Thêm thư mục gốc vào PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.intent_classifier import IntentClassifier
from app.data.intent_training import TRAINING_DATA

def test_intent_classifier_flow():
    # 1. Khởi tạo classifier
    classifier = IntentClassifier()
    assert not classifier.is_trained
    
    # 2. Lấy dữ liệu train rút gọn để test nhanh
    test_data = [
        ("tìm sách java cơ bản", "BOOK_SEARCH"),
        ("muốn mượn sách python", "BOOK_SEARCH"),
        ("tôi đang mượn những sách gì", "BORROW_STATUS"),
        ("hạn trả sách của tôi", "BORROW_STATUS"),
        ("tôi đang đặt trước cuốn nào", "HOLD_STATUS"),
        ("hủy hold sách hộ tôi", "HOLD_STATUS"),
        ("xin chào trợ lý thư viện", "GENERAL_CHAT"),
        ("thư viện mấy giờ mở cửa", "GENERAL_CHAT")
    ]
    
    texts = [item[0] for item in test_data]
    labels = [item[1] for item in test_data]
    
    # 3. Huấn luyện
    classifier.train(texts, labels)
    assert classifier.is_trained
    
    # 4. Dự đoán thử câu thuộc BOOK_SEARCH
    intent, confidence = classifier.predict("Tôi muốn tìm sách lập trình Python")
    assert intent == "BOOK_SEARCH"
    assert confidence > 0.0
    
    # 5. Dự đoán thử câu thuộc BORROW_STATUS
    intent, confidence = classifier.predict("khi nào tôi phải trả sách")
    assert intent == "BORROW_STATUS"
    assert confidence > 0.0
    
    # 6. Test Save và Load
    temp_model_path = "./tests/temp_classifier.joblib"
    try:
        classifier.save(temp_model_path)
        assert os.path.exists(temp_model_path)
        
        # Load lại model mới
        new_classifier = IntentClassifier()
        new_classifier.load(temp_model_path)
        assert new_classifier.is_trained
        
        # Dự đoán bằng model mới load
        intent2, conf2 = new_classifier.predict("Tôi muốn tìm sách lập trình Python")
        assert intent2 == "BOOK_SEARCH"
        assert conf2 > 0.0
    finally:
        # Dọn dẹp file tạm
        if os.path.exists(temp_model_path):
            os.remove(temp_model_path)
            # Xóa thư mục tests tạm nếu rỗng
            if len(os.listdir("./tests")) == 1: # chỉ còn test_classifier.py
                pass
