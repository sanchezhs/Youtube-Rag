import logging
from typing import Optional, List # Added typing imports

from shared.db.session import get_db_context
from shared.db.models import Chunk


# Lazy load the model
_embedding_model = None

logger = logging.getLogger(__name__) 
logger.setLevel(logging.INFO)

def get_embedding_model(embedding_model: str):
    """Get or create embedding model (singleton pattern)."""
    global _embedding_model
    
    if _embedding_model is None:
        import torch
        from sentence_transformers import SentenceTransformer
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _embedding_model = SentenceTransformer(
            embedding_model,
            device=device,
        )
    
    return _embedding_model


def count_pending_embeddings(video_ids: Optional[List[str]] = None) -> int:
    """
    Count chunks that need embeddings. 
    If video_ids is provided, only counts chunks belonging to those videos.
    """
    with get_db_context() as db:
        query = db.query(Chunk).filter(Chunk.embedding.is_(None))

        if video_ids:
            query = query.filter(Chunk.video_id.in_(video_ids))

        count = query.count()
        
        filter_msg = f" (filtered by {len(video_ids)} videos)" if video_ids else ""
        logger.info(f"Found {count} chunks pending embedding{filter_msg}")
        return count


def embed_batch(embedding_model: str, batch_size: int = 32, video_ids: Optional[List[str]] = None) -> dict:
    with get_db_context() as db:
        query = db.query(Chunk).filter(
            (Chunk.embedding.is_(None)) | (Chunk.summary_embedding.is_(None))
        )

        if video_ids:
            query = query.filter(Chunk.video_id.in_(video_ids))

        batch = query.limit(batch_size).all()

        if not batch:
            return {"processed": 0, "success": True}

        texts = [c.text for c in batch]
        summaries = [c.summary if c.summary else "" for c in batch]

        try:
            model = get_embedding_model(embedding_model)
            text_embeddings = model.encode(texts, normalize_embeddings=True, batch_size=batch_size)
            
            summary_embeddings = model.encode(summaries, normalize_embeddings=True, batch_size=batch_size)

            for i, chunk_obj in enumerate(batch):
                chunk_obj.embedding = text_embeddings[i].tolist()
                
                if chunk_obj.summary:
                    chunk_obj.summary_embedding = summary_embeddings[i].tolist()

            db.commit()
            return {"processed": len(batch), "success": True}

        except Exception as e:
            logger.error(f"Embedding batch failed: {e}")
            db.rollback()
            return {"processed": 0, "success": False, "error": str(e)}

def embed_flow(task_id: str, embedding_model: str, video_ids: Optional[List[str]] = None, batch_size: int = 32) -> dict:
    """
    Main flow for generating embeddings.
    
    Args:
        task_id: The ID of the pipeline task (for logging)
        video_ids: List of video IDs to restrict embedding to (Critical for worker isolation)
        batch_size: Number of chunks to process per batch
    
    Returns:
        Dictionary with embedding results
    """
    logger.info(f"[{task_id}] Starting embedding flow")
    total_pending = count_pending_embeddings(video_ids=video_ids)

    if total_pending == 0:
        logger.info(f"[{task_id}] No chunks to embed")
        return {"embedded": 0, "failed": 0}

    embedded = 0
    failed = 0

    while True:
        result = embed_batch(embedding_model=embedding_model, batch_size=batch_size, video_ids=video_ids)

        if result["processed"] == 0:
            if not result.get("success", True):
                failed += batch_size
            break

        embedded += result["processed"]
        logger.info(f"[{task_id}] Progress: {embedded}/{total_pending}")

        if embedded >= total_pending:
            break

    result = {
        "embedded": embedded,
        "failed": failed,
        "total": total_pending,
    }

    logger.info(f"[{task_id}] Embedding flow completed: {result}")
    return result


def embed_question(question: str, embedding_model: str) -> List[float]:
    """
    Generates the vector embedding for a single question string.
    
    Args:
        question: The text to embed
        
    Returns:
        List of floats representing the vector
    """
    # 1. Get the singleton model instance
    model = get_embedding_model(embedding_model)
    
    # 2. Generate embedding (returns numpy array)
    embedding = model.encode(
        question,
        normalize_embeddings=True,
    )
    
    # 3. Convert to standard list
    return embedding.tolist()
