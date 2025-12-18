import math
from dataclasses import dataclass
from typing import List

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.logging import logger
from ..models import Video, Segment

TARGET_TOKENS = 512
OVERLAP_TOKENS = 100
AVG_CHARS_PER_TOKEN = 4


@dataclass
class ChunkBuffer:
    texts: List[str]
    start_time: float
    end_time: float

    @property
    def text(self) -> str:
        return " ".join(self.texts)


def estimate_tokens(text_len: int) -> int:
    return math.ceil(text_len / AVG_CHARS_PER_TOKEN)


class ChunkingService:
    def __init__(self, db: Session):
        self.db = db

    def chunk_video(self, video_id: str) -> List[ChunkBuffer]:
        segments = (
            self.db.query(Segment)
            .filter(Segment.video_id == video_id)
            .order_by(Segment.start_time)
            .all()
        )

        if not segments:
            return []

        chunks = []
        current_segments = []
        current_char_len = 0

        for seg in segments:
            text = seg.text.strip()
            if not text:
                continue

            current_segments.append(seg)
            current_char_len += len(text) + 1

            if estimate_tokens(current_char_len) >= TARGET_TOKENS:
                chunk_texts = [s.text.strip() for s in current_segments]
                chunks.append(
                    ChunkBuffer(
                        texts=chunk_texts,
                        start_time=current_segments[0].start_time,
                        end_time=current_segments[-1].end_time,
                    )
                )

                # Handle overlap
                overlap_char_limit = OVERLAP_TOKENS * AVG_CHARS_PER_TOKEN
                while current_char_len > overlap_char_limit and len(current_segments) > 1:
                    removed = current_segments.pop(0)
                    current_char_len -= len(removed.text.strip()) + 1

        # Final chunk
        if current_segments and estimate_tokens(current_char_len) > 50:
            chunk_texts = [s.text.strip() for s in current_segments]
            chunks.append(
                ChunkBuffer(
                    texts=chunk_texts,
                    start_time=current_segments[0].start_time,
                    end_time=current_segments[-1].end_time,
                )
            )

        return chunks

    def build_chunks(self, progress_callback=None) -> dict:
        videos = self.db.query(Video).filter(Video.transcribed.is_(True)).all()

        total_chunks = 0

        for i, video in enumerate(videos):
            if progress_callback:
                progress_callback(int((i / len(videos)) * 100))

            chunks = self.chunk_video(video.video_id)

            # Delete existing chunks
            self.db.execute(
                text("DELETE FROM chunks WHERE video_id = :vid"),
                {"vid": video.video_id},
            )

            # Insert new chunks
            for ch in chunks:
                self.db.execute(
                    text("""
                        INSERT INTO chunks (video_id, start_time, end_time, text)
                        VALUES (:vid, :start, :end, :text)
                    """),
                    {
                        "vid": video.video_id,
                        "start": ch.start_time,
                        "end": ch.end_time,
                        "text": ch.text,
                    },
                )

            self.db.commit()
            total_chunks += len(chunks)
            logger.info(f"{video.video_id}: {len(chunks)} chunks")

        return {"videos_processed": len(videos), "total_chunks": total_chunks}
