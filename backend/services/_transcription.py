import os
from typing import Optional

import torch
from faster_whisper import WhisperModel
from sqlalchemy.orm import Session

from core.config import settings
from core.logging import logger
from shared.db.models import Video, Segment


class TranscriptionService:
    _instance: Optional["TranscriptionService"] = None
    _model: Optional[WhisperModel] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def model(self) -> WhisperModel:
        if self._model is None:
            device = settings.whisper_device
            compute_type = settings.whisper_compute_type

            if not device:
                device = "cuda" if torch.cuda.is_available() else "cpu"
            if not compute_type:
                compute_type = "float16" if device == "cuda" else "int8"

            logger.info(
                f"Loading Whisper model "
                f"(size={settings.whisper_model_size}, device={device})"
            )

            self._model = WhisperModel(
                settings.whisper_model_size,
                device=device,
                compute_type=compute_type,
            )

        return self._model

    def transcribe_video(
        self,
        db: Session,
        video: Video,
        *,
        language: Optional[str] = None,
    ) -> int:
        logger.info(f"Transcribing video {video.video_id}")

        if not video.audio_path or not os.path.exists(video.audio_path):
            raise FileNotFoundError(f"Audio not found: {video.audio_path}")

        segments_generator, info = self.model.transcribe(
            video.audio_path,
            language=language,
            vad_filter=True,
        )

        segment_objects = []
        for seg in segments_generator:
            segment_objects.append(
                Segment(
                    video_id=video.video_id,
                    start_time=seg.start,
                    end_time=seg.end,
                    text=seg.text.strip(),
                )
            )

        db.add_all(segment_objects)
        video.transcribed = True
        db.commit()

        logger.info(f"Transcribed {video.video_id}: {len(segment_objects)} segments")
        return len(segment_objects)

    def transcribe_pending(
        self,
        db: Session,
        *,
        language: str = "es",
        progress_callback=None,
    ) -> dict:
        videos = (
            db.query(Video)
            .filter(Video.downloaded.is_(True))
            .filter(Video.transcribed.is_(False))
            .all()
        )

        logger.info(f"{len(videos)} videos pending transcription")

        transcribed = 0
        failed = 0

        for i, video in enumerate(videos):
            if progress_callback:
                progress_callback(int((i / len(videos)) * 100))

            try:
                self.transcribe_video(db, video, language=language)
                transcribed += 1
            except Exception as e:
                failed += 1
                logger.error(f"Transcription failed for {video.video_id}: {e}")

        return {"transcribed": transcribed, "failed": failed}


transcription_service = TranscriptionService()
