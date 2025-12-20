import uuid
from enum import Enum as PyEnum
from typing import Optional, List

from sqlalchemy import (
    JSON,
    String,
    Text,
    Boolean,
    ForeignKey,
    func,
    Computed,
    CheckConstraint,
    DateTime,
    Enum,
    text,
)
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from shared.db.session import Base, engine

with engine.connect() as con:
    con.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    con.commit()

class TaskStatus(str, PyEnum):
    PENDING   = "pending"
    RUNNING   = "running"
    COMPLETED = "completed"
    FAILED    = "failed"

class VideoStatus(str, PyEnum):
    PENDING     = "pending"
    DOWNLOADED  = "downloaded"
    TRANSCRIBED = "transcribed"
    EMBEDDED    = "embedded" # Ready for RAG
    FAILED      = "failed"

class PipelineTask(Base):
    """Track async pipeline tasks."""
    __tablename__ = "pipeline_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    task_type: Mapped[str] = mapped_column(String(50), nullable=False)

    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus),
        default=TaskStatus.PENDING,
        nullable=False,
        index=True,
    )

    channel_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("channels.id", ondelete="SET NULL")
    )

    video_id: Mapped[Optional[str]] = mapped_column(
        String(32),
        ForeignKey("videos.video_id", ondelete="SET NULL"),
    )

    request: Mapped[dict] = mapped_column(JSON, default=None, nullable=True)
    progress: Mapped[int] = mapped_column(default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    result: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    started_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True)
    )

    completed_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True)
    )

class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    videos: Mapped[List["Video"]] = relationship(
        back_populates="channel",
        cascade="all, delete-orphan",
    )


class Video(Base):
    __tablename__ = "videos"

    video_id: Mapped[str] = mapped_column(primary_key=True)

    channel_id: Mapped[int] = mapped_column(
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=False,
    )

    title: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)

    published_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True)
    )

    duration: Mapped[Optional[int]] = mapped_column()
    audio_path: Mapped[Optional[str]] = mapped_column(Text)
    downloaded: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    transcribed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    channel: Mapped["Channel"] = relationship(back_populates="videos")
    segments: Mapped[List["Segment"]] = relationship(
        back_populates="video",
        cascade="all, delete-orphan",
    )
    chunks: Mapped[List["Chunk"]] = relationship(
        back_populates="video",
        cascade="all, delete-orphan",
    )


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(primary_key=True)

    video_id: Mapped[str] = mapped_column(
        ForeignKey("videos.video_id", ondelete="CASCADE"),
        nullable=False,
    )

    start_time: Mapped[float] = mapped_column(nullable=False)
    end_time: Mapped[float] = mapped_column(nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    video: Mapped["Video"] = relationship(back_populates="segments")


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(primary_key=True)

    video_id: Mapped[str] = mapped_column(
        ForeignKey("videos.video_id", ondelete="CASCADE"),
        nullable=False,
    )

    # Level 1: Timestamps and Order
    chunk_index: Mapped[int] = mapped_column(nullable=False, default=0)
    start_time: Mapped[float] = mapped_column(nullable=False)
    end_time: Mapped[float] = mapped_column(nullable=False)
    
    # The raw full text
    text: Mapped[str] = mapped_column(Text, nullable=False)

    # Level 1: Mini-summary per chunk
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Main content embedding
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))
    
    # Level 2: Distinct Index (Summary Embedding)
    summary_embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))

    search_vector: Mapped[str] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('spanish', coalesce(text, ''))",
        ),
    )

    summary_search_vector: Mapped[str] = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('spanish', summary)", persisted=True),
    )
    
    video: Mapped["Video"] = relationship(back_populates="chunks")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    channel_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=True,
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    messages: Mapped[List["ChatMessage"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )
    videos: Mapped[List["Video"]] = relationship(
        secondary="chat_videos",
        lazy="selectin",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session: Mapped["ChatSession"] = relationship(back_populates="messages")

    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'assistant')",
            name="chat_messages_role_check",
        ),
    )


class ChatVideo(Base):
    __tablename__ = "chat_videos"

    chat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        primary_key=True,
    )

    video_id: Mapped[str] = mapped_column(
        ForeignKey("videos.video_id", ondelete="CASCADE"),
        primary_key=True,
    )

