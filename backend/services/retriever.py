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
        target_index: str = "chunks",
        video_ids: List[str],
    ) -> List[dict]:

        if not video_ids:
            return []

        if not query_embedding:
            formatted_embedding = "[]"
        elif isinstance(query_embedding, str):
            formatted_embedding = query_embedding.replace("{", "[").replace("}", "]")
        else:
            formatted_embedding = str(query_embedding)

        if target_index == "summaries":
            vector_col = "summary_embedding"
            ts_vector_col = "summary_search_vector"
        else:
            vector_col = "embedding"
            ts_vector_col = "search_vector"

        sql = f"""
            WITH vector_results AS (
                SELECT id, video_id, chunk_index, start_time, end_time, text, summary,
                       {vector_col} <-> (:query_embedding)::vector AS vector_distance
                FROM chunks
                WHERE {vector_col} IS NOT NULL
                  AND video_id = ANY(:video_ids)
                ORDER BY vector_distance
                LIMIT :top_k
            ),
            text_results AS (
                SELECT id, video_id, chunk_index, start_time, end_time, text, summary,
                       ts_rank({ts_vector_col}, plainto_tsquery('spanish', :query)) AS text_rank
                FROM chunks
                WHERE {ts_vector_col} @@ plainto_tsquery('spanish', :query)
                  AND video_id = ANY(:video_ids)
                ORDER BY text_rank DESC
                LIMIT :top_k
            )
            SELECT
                COALESCE(v.id, t.id) AS id,
                COALESCE(v.video_id, t.video_id) AS video_id,
                COALESCE(v.chunk_index, t.chunk_index) AS chunk_index,
                COALESCE(v.start_time, t.start_time) AS start_time,
                COALESCE(v.end_time, t.end_time) AS end_time,
                COALESCE(v.text, t.text) AS text,
                COALESCE(v.summary, t.summary) AS summary,
                v.vector_distance,
                t.text_rank
            FROM vector_results v
            FULL OUTER JOIN text_results t ON v.id = t.id
        """

        results = db.execute(
            text(sql),
            {
                "query_embedding": formatted_embedding,
                "query": query,
                "top_k": top_k,
                "video_ids": video_ids,
            },
        ).fetchall()

        merged = []
        for r in results:
            vector_score = (1 - r.vector_distance) if r.vector_distance is not None else 0
            text_score = r.text_rank or 0
            final_score = vector_weight * vector_score + text_weight * text_score

            merged.append({
                "id": r.id,
                "video_id": r.video_id,
                "chunk_index": r.chunk_index,
                "start": r.start_time,
                "end": r.end_time,
                "text": r.text,
                "summary": r.summary,
                "score": final_score,
            })

        merged.sort(key=lambda x: x["score"], reverse=True)
        return merged[:top_k]

retriever_service = RetrieverService()
