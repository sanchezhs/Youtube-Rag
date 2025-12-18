from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    debug: bool = False

    # Database
    database_url: str
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"

    # Whisper
    whisper_model_size: str = "large-v3"
    whisper_device: Optional[str] = None
    whisper_compute_type: Optional[str] = None

    # Embedding
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_batch_size: int = 32

    # Paths
    audio_dir: str = str(BASE_DIR / "data" / "audio")

    # RAG
    rag_top_k: int = 8
    rag_vector_weight: float = 0.7
    rag_text_weight: float = 0.3


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
