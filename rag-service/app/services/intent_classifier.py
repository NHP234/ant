import os
import logging
import re
import numpy as np
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sentence_transformers import SentenceTransformer
import joblib

logger = logging.getLogger("rag-service.classifier")

def clean_text(text: str) -> str:
    """
    Làm sạch văn bản cơ bản (chuyển về chữ thường, bỏ ký tự đặc biệt và khoảng trắng thừa).
    Không dùng tách từ bằng underthesea vì SentenceTransformer hoạt động tốt nhất trên văn bản tự nhiên.
    """
    if not text:
        return ""
    text = text.lower().strip()
    # Loại bỏ ký tự đặc biệt, chỉ giữ lại chữ cái, số và khoảng trắng
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

class IntentClassifier:
    def __init__(self):
        self.model_name = 'paraphrase-multilingual-MiniLM-L12-v2'
        self.device = 'cpu' # Chạy trên CPU để tiết kiệm tài nguyên và tương thích mọi môi trường
        
        # Khởi tạo mô hình SVM tuyến tính cơ sở
        base_svm = LinearSVC(
            C=1.0,
            class_weight='balanced',
            max_iter=10000,
            random_state=42
        )
        # Sử dụng CalibratedClassifierCV với 5-fold cross-validation để hiệu chuẩn xác suất (Platt scaling)
        # Giúp confidence score phản ánh đúng xác suất thực tế thay vì dùng khoảng cách phân tách thô
        self.svm = CalibratedClassifierCV(estimator=base_svm, cv=5)
        self._model = None
        self.is_trained = False

    def _get_model(self) -> SentenceTransformer:
        """
        Lazy loading: Chỉ tải SentenceTransformer khi thực sự cần thiết (huấn luyện hoặc dự đoán).
        Điều này giúp FastAPI khởi động nhanh hơn rất nhiều.
        """
        if self._model is None:
            logger.info(f"Đang tải Embedding Model cho Classifier: {self.model_name}...")
            self._model = SentenceTransformer(self.model_name, device=self.device)
            logger.info("Tải Embedding Model cho Classifier thành công!")
        return self._model

    def train(self, texts: list[str], labels: list[str]):
        """
        Huấn luyện bộ phân loại ý định hiệu chuẩn dựa trên dense embeddings + SVM.
        """
        logger.info(f"Đang bắt đầu huấn luyện Calibrated SVM Classifier với {len(texts)} mẫu bằng dense embeddings...")
        
        # Tiền xử lý làm sạch văn bản
        cleaned_texts = [clean_text(t) for t in texts]
        
        # Mã hóa tất cả các câu mẫu sang dense vector embeddings
        model = self._get_model()
        logger.info("Đang mã hóa các mẫu huấn luyện sang dense vectors...")
        embeddings = model.encode(cleaned_texts, convert_to_numpy=True, show_progress_bar=False)
        
        # Huấn luyện Calibrated SVM
        self.svm.fit(embeddings, np.array(labels))
        self.is_trained = True
        logger.info("Huấn luyện Calibrated SVM Classifier hoàn tất thành công!")

    def predict(self, text: str) -> tuple[str, float]:
        """
        Dự đoán intent của câu hỏi đầu vào dùng dense embedding + Calibrated SVM.
        Trả về: (intent_name, confidence_score)
        """
        if not self.is_trained:
            logger.warning("Bộ phân loại chưa được huấn luyện! Fallback về GENERAL_CHAT.")
            return "GENERAL_CHAT", 0.0

        # Tiền xử lý làm sạch câu hỏi
        cleaned_text = clean_text(text)
        
        # Mã hóa câu hỏi sang dense vector
        model = self._get_model()
        embedding = model.encode([cleaned_text], convert_to_numpy=True, show_progress_bar=False)[0]
        
        # Dự đoán xác suất cho tất cả các lớp sử dụng mô hình đã hiệu chuẩn
        probabilities = self.svm.predict_proba([embedding])[0]
        classes = self.svm.classes_
        
        # Nhãn dự đoán là nhãn có xác suất cao nhất
        class_idx = np.argmax(probabilities)
        intent = classes[class_idx]
        confidence = float(probabilities[class_idx])

        logger.info(f"Dự đoán ý định (Hiệu chuẩn): '{text}' -> {intent} (độ tự tin: {confidence:.2f})")
        return intent, confidence

    def save(self, path: str):
        """
        Lưu duy nhất mô hình Calibrated SVM ra file joblib để dung lượng file cực kỳ nhẹ và tránh lỗi serialization PyTorch.
        """
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self.svm, path)
        logger.info(f"Đã lưu mô hình Calibrated SVM thành công vào {path}")

    def load(self, path: str):
        """
        Tải mô hình Calibrated SVM từ file joblib.
        """
        if not os.path.exists(path):
            raise FileNotFoundError(f"Không tìm thấy file mô hình tại {path}")
        self.svm = joblib.load(path)
        self.is_trained = True
        logger.info(f"Đã tải mô hình Calibrated SVM thành công từ {path}")
