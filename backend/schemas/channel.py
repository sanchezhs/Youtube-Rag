from datetime import datetime
from typing import Optional

from pydantic import BaseModel, HttpUrl


class ChannelBase(BaseModel):
    name: str
    url: str


class ChannelCreate(BaseModel):
    url: str


class ChannelUpdate(BaseModel):
    name: Optional[str] = None


class ChannelResponse(ChannelBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChannelWithStats(ChannelResponse):
    video_count: int
    downloaded_count: int
    transcribed_count: int
