import os
import logging
import numpy as np
from sklearn.svm import LinearSVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
import joblib

from app.utils.vietnamese import clean_and_tokenize

logger = logging.getLogger("rag-service.classifier")

class IntentClassifier:
    def __init__(self):
        # Pipeline gồm TF-IDF Vectorizer và SVM (LinearSVC)
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                tokenizer=str.split,     # Tokenizer mặc định là split khoảng trắng vì ta đã pre-tokenize
                max_features=5000,
                ngram_range=(1, 2),      # Unigram + Bigram (ví dụ: "trí_tuệ", "nhân_tạo", "trí_tuệ nhân_tạo")
                sublinear_tf=True
            )),
            ('svm', LinearSVC(
                C=1.0,
                class_weight='balanced', # Xử lý mất cân bằng mẫu tự động
                max_iter=10000,
                random_state=42
            ))
        ])
        self.is_trained = False

    def train(self, texts: list[str], labels: list[str]):
        """
        Huấn luyện bộ phân loại ý định.
        """
        logger.info(f"Đang bắt đầu huấn luyện SVM Classifier với {len(texts)} mẫu...")
        
        # Tiền xử lý tách từ tiếng Việt cho tất cả tập train
        tokenized_texts = [clean_and_tokenize(t) for t in texts]
        
        # Huấn luyện Pipeline
        self.pipeline.fit(tokenized_texts, labels)
        self.is_trained = True
        logger.info("Huấn luyện SVM Classifier hoàn tất thành công!")

    def predict(self, text: str) -> tuple[str, float]:
        """
        Dự đoán intent của câu hỏi đầu vào.
        Trả về: (intent_name, confidence_score)
        """
        if not self.is_trained:
            logger.warning("Bộ phân loại chưa được huấn luyện! Fallback về GENERAL_CHAT.")
            return "GENERAL_CHAT", 0.0

        # Tiền xử lý câu hỏi
        tokenized_text = clean_and_tokenize(text)
        
        # Dự đoán nhãn
        intent = self.pipeline.predict([tokenized_text])[0]
        
        # Tính toán độ tự tin (Confidence) dựa trên decision_function
        decision_scores = self.pipeline.decision_function([tokenized_text])[0]
        
        # Nếu chỉ có 2 lớp, decision_function trả về một số thực đơn lẻ
        # Nếu có nhiều lớp (> 2), decision_function trả về mảng scores cho từng lớp
        if isinstance(decision_scores, np.ndarray):
            # Tính softmax hoặc chuẩn hóa scores để có tỷ lệ tự tin tương đối
            exp_scores = np.exp(decision_scores - np.max(decision_scores))  # Tránh overflow
            probabilities = exp_scores / np.sum(exp_scores)
            
            # Lấy index của intent dự đoán để lấy xác suất tương ứng
            classes = self.pipeline.named_steps['svm'].classes_
            class_idx = list(classes).index(intent)
            confidence = float(probabilities[class_idx])
        else:
            # 2 lớp: score càng xa 0 càng tự tin. Chuẩn hóa về khoảng 0.5 - 1.0
            sigmoid = 1 / (1 + np.exp(-abs(decision_scores)))
            confidence = float(sigmoid)

        logger.info(f"Dự đoán ý định: '{text}' -> {intent} (độ tự tin: {confidence:.2f})")
        return intent, confidence

    def save(self, path: str):
        """
        Lưu model pipeline ra file joblib.
        """
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self.pipeline, path)
        logger.info(f"Đã lưu mô hình thành công vào {path}")

    def load(self, path: str):
        """
        Tải model pipeline từ file joblib.
        """
        if not os.path.exists(path):
            raise FileNotFoundError(f"Không tìm thấy file mô hình tại {path}")
        self.pipeline = joblib.load(path)
        self.is_trained = True
        logger.info(f"Đã tải mô hình thành công từ {path}")
