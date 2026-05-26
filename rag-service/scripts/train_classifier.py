import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import torch
import sys

# Thêm thư mục gốc vào PYTHONPATH để nhận diện app package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.data.intent_training import TRAINING_DATA
from app.services.intent_classifier import IntentClassifier

def main():
    print("=== TIẾN TRÌNH HUẤN LUYỆN SVM INTENT CLASSIFIER ===")
    
    # Chia dữ liệu train thành texts và labels
    texts = [item[0] for item in TRAINING_DATA]
    labels = [item[1] for item in TRAINING_DATA]
    
    print(f"Tổng số mẫu huấn luyện: {len(texts)}")
    print(f"Danh sách các ý định (classes): {set(labels)}")
    
    # Khởi tạo và huấn luyện
    classifier = IntentClassifier()
    classifier.train(texts, labels)
    
    # Lưu mô hình
    model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    model_path = os.path.join(model_dir, "intent_classifier.joblib")
    
    classifier.save(model_path)
    print(f"Đã lưu mô hình huấn luyện hoàn tất tại: {model_path}")
    print("=== HOÀN THÀNH HUẤN LUYỆN ===")

if __name__ == "__main__":
    main()
