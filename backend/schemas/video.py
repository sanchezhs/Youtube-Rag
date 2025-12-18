from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class VideoBase(BaseModel):
    video_id: str
    title: Optional[str] = None
    description: Optional[str] = None


class VideoResponse(VideoBase):
    channel_id: int
    published_at: Optional[datetime] = None
    duration: Optional[int] = None
    downloaded: bool
    transcribed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class VideoDetail(VideoResponse):
    audio_path: Optional[str] = None
    chunk_count: int = 0
    segment_count: int = 0
