from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field
from schemas.video import VideoResponse

class ChatMessageBase(BaseModel):
    role: str
    content: str


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(ChatMessageBase):
    id: int
    created_at: datetime
    sources: Optional[str] = None

    class Config:
        from_attributes = True


class ChatSource(BaseModel):
    video_id: str
    start: float
    end: float
    url: str
    score: float


class ChatSessionResponse(BaseModel):
    id: UUID
    title: Optional[str] = None
    channel_id: int
    created_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatSessionDetail(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []
    videos: List[VideoResponse] = []


class AskRequest(BaseModel):
    question: str
    channel_id: int 
    video_ids: List[str] = Field(default_factory=list)
    session_id: Optional[UUID] = None


class AskResponse(BaseModel):
    answer: str
    sources: List[ChatSource]
    session_id: UUID
    channel_id: int
    video_ids: List[str]
