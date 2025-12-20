from typing import List, Optional

from sqlalchemy import select

from shared.db.models import Channel, Video
from shared.db.repositories.base import BaseRepository


class VideoRepository(BaseRepository[Video]):
    def __init__(self, db):
        super().__init__(Video, db)

    def get_by_channel(
        self,
        channel_id: int,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Video]:
        stmt = (
            select(Video)
            .where(Video.channel_id == channel_id)
            .order_by(Video.published_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_chat_video_ids(
        self,
        channel_id: int,
        video_ids: List[str],
        limit: int = 200,
    ) -> List[str]:

        query = (
            self.db.query(Video.video_id)
            .join(Channel, Channel.id == Video.channel_id)
            .filter(Channel.id == channel_id)
        )

        if video_ids:
            query = query.filter(Video.video_id.in_(video_ids))
        else:
            query = query.limit(limit)

        rows = query.all()
        return [row.video_id for row in rows]


    def get_pending_download(self, channel_id: Optional[int] = None) -> List[Video]:
        stmt = select(Video).where(Video.downloaded.is_(False))
        if channel_id:
            stmt = stmt.where(Video.channel_id == channel_id)
        return list(self.db.scalars(stmt).all())

    def get_pending_transcription(self) -> List[Video]:
        stmt = (
            select(Video)
            .where(Video.downloaded.is_(True))
            .where(Video.transcribed.is_(False))
        )
        return list(self.db.scalars(stmt).all())
