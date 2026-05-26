FROM python:3.10-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài đặt các thư viện hệ thống cần thiết để build ChromaDB, Scikit-Learn và psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép mã nguồn của service
COPY app/ ./app/
COPY scripts/ ./scripts/

# Tạo thư mục chứa mô hình đã huấn luyện và dữ liệu Vector DB
RUN mkdir -p models chroma_data

# Expose cổng 8000 của FastAPI
EXPOSE 8000

# Lệnh khởi chạy FastAPI app bằng uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
