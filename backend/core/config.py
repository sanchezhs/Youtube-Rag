from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "YouTube RAG API"
    app_version: str = "1.0.0"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+psycopg2://yt_rag:yt_rag@localhost:5432/yt_rag"
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"

    # RAG
    rag_top_k: int = 8
    rag_vector_weight: float = 0.7
    rag_text_weight: float = 0.3


@lru_cache
def get_settings() -> Settings:
    return Settings()

BACKEND_SETTINGS_SPEC = {
    "rag": {
        "rag_top_k": ("int", lambda s: s.rag_top_k, "Backend RAG top k"),
        "rag_text_weight": ("float", lambda s: s.rag_text_weight, "Backend RAG text weight"),
        "rag_vector_weight": ("float", lambda s: s.rag_vector_weight, "Backend RAG vector weight"),
    },
    "llm": {
        "llm_model": ("string", lambda s: s.openai_model, "Backend LLM service"),
    },
}

settings = get_settings()
