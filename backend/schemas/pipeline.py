from datetime import datetime
from typing import Literal, Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

from shared.db.models import TaskStatus


class TaskRequest(BaseModel):
    task_type: Literal["pipeline", "embed_question"]
    question_to_embed: Optional[str] = None
    channel_url: Optional[str] = None
    max_videos: int = Field(default=10, ge=1, le=100)
    download: bool = True


class TranscribeRequest(BaseModel):
    language: str = "es"
    video_ids: Optional[List[str]] = None


class ChunkRequest(BaseModel):
    video_ids: Optional[List[str]] = None


class EmbedRequest(BaseModel):
    batch_size: int = Field(default=32, ge=1, le=256)


class FullPipelineRequest(BaseModel):
    channel_url: str
    max_videos: int = Field(default=10, ge=1, le=100)
    language: str = "es"
    batch_size: int = Field(default=32, ge=1, le=256)


class PipelineTaskCreate(BaseModel):
    task_type: str
    channel_id: Optional[int] = None
    video_id: Optional[str] = None


class PipelineTaskResponse(BaseModel):
    id: UUID
    task_type: str
    status: TaskStatus
    progress: int
    error_message: Optional[str] = None
    result: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PipelineStatsResponse(BaseModel):
    total_channels: int
    total_videos: int
    videos_downloaded: int
    videos_transcribed: int
    total_chunks: int
    chunks_embedded: int
