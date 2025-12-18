from typing import Optional

import torch
from sqlalchemy.orm import Session

from sentence_transformers import SentenceTransformer
from core.config import settings
from core.logging import logger
from shared.db.models import Chunk


class EmbeddingService:

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[SentenceTransformer] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Loading embedding model on {device}")
            self._model = SentenceTransformer(settings.embedding_model, device=device)
        return self._model

    def embed_chunks(
        self,
        db: Session,
        *,
        batch_size: int = 32,
        progress_callback=None,
    ) -> dict:
        total_pending = db.query(Chunk).filter(Chunk.embedding.is_(None)).count()

        if total_pending == 0:
            logger.info("No chunks pending embedding")
            return {"embedded": 0, "failed": 0}

        logger.info(f"{total_pending} chunks pending embedding")

        embedded = 0
        failed = 0

        while True:
            batch = (
                db.query(Chunk)
                .filter(Chunk.embedding.is_(None))
                .limit(batch_size)
                .all()
            )

            if not batch:
                break

            texts = [c.text for c in batch]

            try:
                embeddings = self.model.encode(
                    texts,
                    normalize_embeddings=True,
                    batch_size=batch_size,
                )

                for chunk_obj, emb in zip(batch, embeddings):
                    chunk_obj.embedding = emb.tolist()

                db.commit()
                embedded += len(batch)

                if progress_callback:
                    progress_callback(int((embedded / total_pending) * 100))

                logger.info(f"Progress: {embedded}/{total_pending}")

            except Exception as e:
                failed += len(batch)
                logger.error(f"Embedding batch failed: {e}")
                db.rollback()
                break

        return {"embedded": embedded, "failed": failed}


embedding_service = EmbeddingService()
