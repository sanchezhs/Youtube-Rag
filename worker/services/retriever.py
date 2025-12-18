from typing import List, Optional

from sentence_transformers import SentenceTransformer
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.config import settings
from core.logging import logger


class RetrieverService:
    _instance: Optional["RetrieverService"] = None
    _model: Optional[SentenceTransformer] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            logger.info(f"Loading embedding model: {settings.embedding_model}")
            self._model = SentenceTransformer(settings.embedding_model)
        return self._model

    def search_vector(
        self,
        db: Session,
        query: str,
        *,
        top_k: int = 8,
    ) -> List[dict]:
        query_embedding = self.model.encode(
            query,
            normalize_embeddings=True,
        ).tolist()

        results = db.execute(
            text("""
                SELECT
                    id, video_id, start_time, end_time, text,
                    embedding <-> (:query_embedding)::vector AS distance
                FROM chunks
                WHERE embedding IS NOT NULL
                ORDER BY distance ASC
                LIMIT :top_k
            """),
            {"query_embedding": query_embedding, "top_k": top_k},
        ).fetchall()

        return [
            {
                "id": r.id,
                "video_id": r.video_id,
                "start": r.start_time,
                "end": r.end_time,
                "text": r.text,
                "score": 1 - r.distance,
            }
            for r in results
        ]

    def search_hybrid(
        self,
        db: Session,
        query: str,
        *,
        top_k: int = 8,
        vector_weight: float = 0.7,
        text_weight: float = 0.3,
    ) -> List[dict]:
        query_embedding = self.model.encode(
            query,
            normalize_embeddings=True,
        ).tolist()

        results = db.execute(
            text("""
                WITH vector_results AS (
                    SELECT id, video_id, start_time, end_time, text,
                           embedding <-> (:query_embedding)::vector AS vector_distance
                    FROM chunks
                    WHERE embedding IS NOT NULL
                    ORDER BY vector_distance
                    LIMIT :top_k
                ),
                text_results AS (
                    SELECT id, video_id, start_time, end_time, text,
                           ts_rank(search_vector, plainto_tsquery('spanish', :query)) AS text_rank
                    FROM chunks
                    WHERE search_vector @@ plainto_tsquery('spanish', :query)
                    ORDER BY text_rank DESC
                    LIMIT :top_k
                )
                SELECT
                    COALESCE(v.id, t.id) AS id,
                    COALESCE(v.video_id, t.video_id) AS video_id,
                    COALESCE(v.start_time, t.start_time) AS start_time,
                    COALESCE(v.end_time, t.end_time) AS end_time,
                    COALESCE(v.text, t.text) AS text,
                    v.vector_distance,
                    t.text_rank
                FROM vector_results v
                FULL OUTER JOIN text_results t ON v.id = t.id
            """),
            {"query_embedding": query_embedding, "query": query, "top_k": top_k},
        ).fetchall()

        merged = []
        for r in results:
            vector_score = 1 - r.vector_distance if r.vector_distance else 0
            text_score = r.text_rank or 0
            final_score = vector_weight * vector_score + text_weight * text_score

            merged.append({
                "id": r.id,
                "video_id": r.video_id,
                "start": r.start_time,
                "end": r.end_time,
                "text": r.text,
                "score": final_score,
            })

        merged.sort(key=lambda x: x["score"], reverse=True)
        return merged[:top_k]


retriever_service = RetrieverService()
