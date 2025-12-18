from typing import Optional, List

from sqlalchemy import select

from shared.db.models import Channel, Video
from shared.db.repositories.base import BaseRepository


class ChannelRepository(BaseRepository[Channel]):
    def __init__(self, db):
        super().__init__(Channel, db)

    def get_by_url(self, url: str) -> Optional[Channel]:
        stmt = select(Channel).where(Channel.url == url)
        return self.db.scalar(stmt)

    def get_with_stats(self, channel_id: int) -> Optional[dict]:
        channel = self.get(channel_id)
        if not channel:
            return None

        video_count = (
            self.db.query(Video)
            .filter(Video.channel_id == channel_id)
            .count()
        )
        downloaded_count = (
            self.db.query(Video)
            .filter(Video.channel_id == channel_id)
            .filter(Video.downloaded.is_(True))
            .count()
        )
        transcribed_count = (
            self.db.query(Video)
            .filter(Video.channel_id == channel_id)
            .filter(Video.transcribed.is_(True))
            .count()
        )

        return {
            "channel": channel,
            "video_count": video_count,
            "downloaded_count": downloaded_count,
            "transcribed_count": transcribed_count,
        }
