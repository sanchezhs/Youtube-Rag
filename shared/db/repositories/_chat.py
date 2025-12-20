import json
import uuid
from typing import List, Optional

from sqlalchemy import select

from shared.db.models import ChatSession, ChatMessage
from shared.db.repositories.base import BaseRepository


class ChatSessionRepository(BaseRepository[ChatSession]):
    def __init__(self, db):
        super().__init__(ChatSession, db)

    def get_or_create(self, question: str, session_id: Optional[str] = None) -> ChatSession:
        if session_id:
            try:
                normalized = session_id.strip().strip('"').strip("'")
                session_uuid = uuid.UUID(normalized)
                session = self.get(session_uuid)
                if session:
                    return session
            except ValueError:
                pass

        return self.create({"id": uuid.uuid4(), "title": question})

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
