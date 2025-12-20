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
    whisper_device: Optional[str] = "gpu"
    whisper_compute_type: Optional[str] = "float16"

    # Embedding
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_batch_size: int = 32

    # Chunking
    target_tokens: int = 512
    overlap_tokens: int = 100
    avg_chars_per_token: int = 4

    # Paths
    audio_dir: str = str(BASE_DIR / "data" / "audio")

@lru_cache
def get_settings() -> Settings:
    return Settings()

WORKER_SETTINGS_SPEC = {
    "transcribing": {
        "whisper_compute_type": ("string", lambda s: s.whisper_compute_type, None),
        "whisper_device": ("string", lambda s: s.whisper_device, None),
    },
    "embedding": {
        "embedding_model": ("string", lambda s: s.embedding_model, None),
        "embedding_batch_size": ("int", lambda s: s.embedding_batch_size, None),
    },
    "chunking": {
        "target_tokens": ("int", lambda s: s.target_tokens, None),
        "overlap_tokens": ("int", lambda s: s.overlap_tokens, None),
        "avg_chars_per_token": ("int", lambda s: s.avg_chars_per_token, None),
    },
}

settings = get_settings()
