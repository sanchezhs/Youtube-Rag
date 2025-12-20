import json
import uuid
from typing import List, Optional

from sqlalchemy import select, text

from shared.db.models import ChatSession, ChatMessage, Video
from shared.db.repositories.base import BaseRepository


class ChatSessionRepository(BaseRepository[ChatSession]):
    def __init__(self, db):
        super().__init__(ChatSession, db)

    def get_or_create(self, question: str, channel_id: int, session_id: Optional[str] = None) -> ChatSession:
        if session_id:
            try:
                normalized = session_id.strip().strip('"').strip("'")
                session_uuid = uuid.UUID(normalized)
                session = self.get(session_uuid)
                if session:
                    return session
            except ValueError:
                pass

        return self.create({"id": uuid.uuid4(), "title": question, "channel_id": channel_id})

    
    def upsert_chat_videos(
        self,
        chat_id: uuid.UUID,
        video_ids: List[str],
    ) -> None:
        # Remove existing
        self.db.execute(
            text("DELETE FROM chat_videos WHERE chat_id = :chat_id"),
            {"chat_id": chat_id},
        )

        if video_ids:
            self.db.execute(
                text(
                    """
                    INSERT INTO chat_videos (chat_id, video_id)
                    SELECT :chat_id, unnest(:video_ids)
                    """
                ),
                {
                    "chat_id": chat_id,
                    "video_ids": video_ids,
                },
            )

        self.db.commit()

    def get_messages(
        self,
        session_id: uuid.UUID,
        *,
        limit: int = 50,
    ) -> List[ChatMessage]:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_recent_context(
        self,
        session_id: uuid.UUID,
        *,
        limit: int = 6,
    ) -> List[ChatMessage]:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        messages = list(self.db.scalars(stmt).all())
        return list(reversed(messages))

    def get_video_by_ids(self, session_id: uuid.UUID) -> List[Video]:
        stmt = (
            select(ChatSession)
            .where(ChatSession.id == session_id)
        )

        session = self.db.scalars(stmt).first()

        return list(session.videos)

class ChatMessageRepository(BaseRepository[ChatMessage]):
    def __init__(self, db):
        super().__init__(ChatMessage, db)

    def add_message(
        self,
        session_id: uuid.UUID,
        role: str,
        content: str,
        sources: Optional[List[dict]] = None,
    ) -> ChatMessage:
        return self.create({
            "session_id": session_id,
            "role": role,
            "content": content,
            "sources": json.dumps(sources) if sources else None,
        })
