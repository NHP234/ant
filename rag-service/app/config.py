import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    spring_boot_url: str = "http://localhost:8080/api"
    database_url: str = "postgresql://library_user:library_pass@localhost:5432/library_db"
    gemini_api_key: str = ""
    internal_api_key: str = "SuperSecretInternalApiKey123!"
    chroma_persist_dir: str = "./chroma_data"
    env: str = "development"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
