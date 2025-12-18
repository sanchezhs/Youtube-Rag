import logging
import os

from typing import Optional

from core.config import settings
from shared.db.session import get_db_context
from shared.db.models import Video, Segment

_whisper_model = None

logger = logging.getLogger(__name__) 
logger.setLevel(logging.INFO)

def get_whisper_model():
    """Get or create Whisper model (singleton pattern)."""
    global _whisper_model
    
    if _whisper_model is None:
        import torch
        from faster_whisper import WhisperModel
        
        device = settings.whisper_device
        compute_type = settings.whisper_compute_type

        if not device:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        if not compute_type:
            compute_type = "float16" if device == "cuda" else "int8"

        _whisper_model = WhisperModel(
            settings.whisper_model_size,
            device=device,
            compute_type=compute_type,
        )
    
    return _whisper_model

def get_pending_videos() -> list[dict]:
    """Get videos that need transcription."""
    with get_db_context() as db:
        videos = (
            db.query(Video)
            .filter(Video.downloaded.is_(True))
            .filter(Video.transcribed.is_(False))
            .all()
        )

        result = [
            {
                "video_id": v.video_id,
                "audio_path": v.audio_path,
                "title": v.title,
            }
            for v in videos
        ]

        logger.info(f"Found {len(result)} videos pending transcription")
        return result


def transcribe_video(
    video_id: str,
    audio_path: str,
    language: str = "es",
) -> dict:
    """Transcribe a single video."""
    logger.info(f"Transcribing: {video_id}")

    if not audio_path or not os.path.exists(audio_path):
        logger.error(f"Audio file not found: {audio_path}")
        return {"video_id": video_id, "success": False, "segments": 0}

    try:
        model = get_whisper_model()
        
        segments_generator, info = model.transcribe(
            audio_path,
            language=language,
            vad_filter=True,
        )

        # Collect segments
        segments = []
        for seg in segments_generator:
            segments.append({
                "start_time": seg.start,
                "end_time": seg.end,
                "text": seg.text.strip(),
            })

        # Save to database
        with get_db_context() as db:
            for seg_data in segments:
                db.add(Segment(
                    video_id=video_id,
                    start_time=seg_data["start_time"],
                    end_time=seg_data["end_time"],
                    text=seg_data["text"],
                ))

            video = db.query(Video).filter(Video.video_id == video_id).first()
            if video:
                video.transcribed = True
            
            db.commit()

        logger.info(f"Transcribed {video_id}: {len(segments)} segments")
        return {"video_id": video_id, "success": True, "segments": len(segments)}

    except Exception as e:
        logger.error(f"Transcription failed for {video_id}: {e}")
        return {"video_id": video_id, "success": False, "segments": 0, "error": str(e)}


def transcribe_flow(
    task_id: str,
    language: str = "es",
    video_ids: Optional[list[str]] = None,
) -> dict:
    """
    Main flow for transcribing videos.
    
    Args:
        language: Language code for transcription
        video_ids: Optional list of specific video IDs to transcribe
    
    Returns:
        Dictionary with transcription results
    """
    logger.info(f"Starting transcription flow for task: {task_id}")

    # Get pending videos
    pending = get_pending_videos()

    # Filter if specific video IDs provided
    if video_ids:
        pending = [v for v in pending if v["video_id"] in video_ids]

    if not pending:
        logger.info("No videos to transcribe")
        return {"transcribed": 0, "failed": 0, "total_segments": 0}

    logger.info(f"Transcribing {len(pending)} videos")

    transcribed = 0
    failed = 0
    total_segments = 0

    # Process videos sequentially (Whisper is GPU-bound)
    for video_data in pending:
        result = transcribe_video(
            video_id=video_data["video_id"],
            audio_path=video_data["audio_path"],
            language=language,
        )

        if result["success"]:
            transcribed += 1
            total_segments += result["segments"]
        else:
            failed += 1

    result = {
        "transcribed": transcribed,
        "failed": failed,
        "total_segments": total_segments,
    }

    logger.info(f"Transcription flow completed: {result}")
    return result
