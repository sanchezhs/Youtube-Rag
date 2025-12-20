from fastapi import Depends
from sqlalchemy.orm import Session

from shared.db.repositories.settings import SettingsRepository
from shared.db.session import get_db

from db.repositories.channel import ChannelRepository
from db.repositories.video import VideoRepository
from db.repositories.chat import ChatSessionRepository, ChatMessageRepository

def get_channel_repo(db: Session = Depends(get_db)) -> ChannelRepository:
    return ChannelRepository(db)


def get_video_repo(db: Session = Depends(get_db)) -> VideoRepository:
    return VideoRepository(db)


def get_chat_session_repo(db: Session = Depends(get_db)) -> ChatSessionRepository:
    return ChatSessionRepository(db)


def get_chat_message_repo(db: Session = Depends(get_db)) -> ChatMessageRepository:
    return ChatMessageRepository(db)

def get_settings_repo(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)
