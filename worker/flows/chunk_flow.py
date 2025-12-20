import math
import sqlalchemy as sa
import logging

from typing import Optional

from services.llm import llm_service

from shared.db.session import get_db_context
from shared.db.models import Video, Segment


# Chunking configuration
TARGET_TOKENS = 512
OVERLAP_TOKENS = 100
AVG_CHARS_PER_TOKEN = 4

logger = logging.getLogger(__name__) 
logger.setLevel(logging.INFO)

def estimate_tokens(text_len: int) -> int:
    return math.ceil(text_len / AVG_CHARS_PER_TOKEN)


def get_transcribed_videos() -> list[str]:
    """Get video IDs that have been transcribed."""
    with get_db_context() as db:
        videos = db.query(Video).filter(Video.transcribed.is_(True)).all()
        video_ids = [v.video_id for v in videos]
        logger.info(f"Found {len(video_ids)} transcribed videos")
        return video_ids

def chunk_video(video_id: str) -> dict:
    """Create chunks for a single video."""
    logger.info(f"Chunking video: {video_id}")

    with get_db_context() as db:
        # Get segments
        segments = (
            db.query(Segment)
            .filter(Segment.video_id == video_id)
            .order_by(Segment.start_time)
            .all()
        )

        if not segments:
            logger.warning(f"No segments found for: {video_id}")
            return {"video_id": video_id, "chunks": 0}

        # Build chunks
        chunks = []
        current_segments = []
        current_char_len = 0

        for seg in segments:
            text = seg.text.strip()
            if not text:
                continue

            current_segments.append({
                "start_time": seg.start_time,
                "end_time": seg.end_time,
                "text": text,
            })
            current_char_len += len(text) + 1

            if estimate_tokens(current_char_len) >= TARGET_TOKENS:
                # Create chunk
                chunk_text = " ".join(s["text"] for s in current_segments)
                prompt = f"Summarize the following transcript segment in one concise sentence:\n\n{chunk_text}"
                summary = llm_service.generate(prompt).strip()

                chunks.append({
                    "start_time": current_segments[0]["start_time"],
                    "end_time": current_segments[-1]["end_time"],
                    "text": chunk_text,
                    "summary": summary,
                })

                # Handle overlap
                overlap_char_limit = OVERLAP_TOKENS * AVG_CHARS_PER_TOKEN
                while current_char_len > overlap_char_limit and len(current_segments) > 1:
                    removed = current_segments.pop(0)
                    current_char_len -= len(removed["text"]) + 1

        # Final chunk
        if current_segments and estimate_tokens(current_char_len) > 50:
            chunk_text = " ".join(s["text"] for s in current_segments)
            prompt = f"Summarize the following transcript segment in one concise sentence:\n\n{chunk_text}"
            summary = llm_service.generate(prompt).strip()
            chunks.append({
                "start_time": current_segments[0]["start_time"],
                "end_time": current_segments[-1]["end_time"],
                "text": chunk_text,
                "summary": summary,
            })

        # Delete existing chunks and insert new ones
        db.execute(
            sa.text("DELETE FROM chunks WHERE video_id = :vid"),
            {"vid": video_id},
        )

        for index, ch in enumerate(chunks):
            db.execute(
                sa.text("""
                    INSERT INTO chunks (video_id, chunk_index, start_time, end_time, text, summary)
                    VALUES (:vid, :idx, :start, :end, :text, :summary)
                """),
                {
                    "vid": video_id,
                    "idx": index,
                    "start": ch["start_time"],
                    "end": ch["end_time"],
                    "text": ch["text"],
                    "summary": ch["summary"],
                },
            )

        db.commit()
        logger.info(f"Created {len(chunks)} chunks for: {video_id}")

        return {"video_id": video_id, "chunks": len(chunks)}


def chunk_flow(task_id: str, video_ids: Optional[list[str]] = None) -> dict:
    """
    Main flow for building chunks from transcriptions.
    
    Args:
        video_ids: Optional list of specific video IDs to chunk
    
    Returns:
        Dictionary with chunking results
    """
    logger.info(f"Starting chunking flow for task: {task_id}")

    # Get transcribed videos
    all_video_ids = get_transcribed_videos()

    # Filter if specific video IDs provided
    if video_ids:
        all_video_ids = [vid for vid in all_video_ids if vid in video_ids]

    if not all_video_ids:
        logger.info("No videos to chunk")
        return {"videos_processed": 0, "total_chunks": 0}

    logger.info(f"Processing {len(all_video_ids)} videos")

    total_chunks = 0
    for video_id in all_video_ids:
        result = chunk_video(video_id)
        total_chunks += result["chunks"]

    result = {
        "videos_processed": len(all_video_ids),
        "total_chunks": total_chunks,
    }

    logger.info(f"Chunking flow completed: {result}")
    return result
