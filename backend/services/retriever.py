import json

from typing import List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

class RetrieverService:
    _instance: Optional["RetrieverService"] = None

    def search_hybrid(
        self,
        db: Session,
        query: str,
        query_embedding: Optional[List[float]] = None,
        *,
        top_k: int = 8,
        vector_weight: float = 0.7,
        text_weight: float = 0.3,
    ) -> List[dict]:
        
        if not query_embedding:
            formatted_embedding = "[]"

        # Handle String Input (e.g. "{0.1, 0.2}")
        elif isinstance(query_embedding, str):
            formatted_embedding = query_embedding.replace("{", "[").replace("}", "]")

        else:
            raise ValueError

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
            {"query_embedding": formatted_embedding, "query": query, "top_k": top_k},
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
