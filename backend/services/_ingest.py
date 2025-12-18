# import subprocess
# import json
# from datetime import datetime
# from pathlib import Path
# from typing import Generator
#
# from sqlalchemy.orm import Session
#
# from core.config import settings
# from core.logging import logger
# from core.exceptions import PipelineError, ExternalServiceError
# from .models import Channel, Video
#
#
# AUDIO_DIR = Path(settings.audio_dir)
# AUDIO_DIR.mkdir(parents=True, exist_ok=True)
#
#
# def fetch_channel_videos(channel_url: str) -> Generator[dict, None, None]:
#     """Fetch video metadata from a YouTube channel."""
#     cmd = ["yt-dlp", "--flat-playlist", "--dump-json", channel_url]
#
#     try:
#         result = subprocess.run(cmd, capture_output=True, text=True, check=True)
#         for line in result.stdout.splitlines():
#             yield json.loads(line)
#     except subprocess.CalledProcessError as e:
#         raise ExternalServiceError("yt-dlp", str(e))
#
#
# def download_audio(video_id: str, url: str) -> Path:
#     """Download and normalize audio for a video."""
#     output = AUDIO_DIR / f"{video_id}.wav"
#     tmp_output = AUDIO_DIR / f"{video_id}_tmp.wav"
#
#     if output.exists():
#         return output
#
#     try:
#         # Download audio
#         subprocess.run(
#             [
#                 "yt-dlp", "-f", "bestaudio",
#                 "--extract-audio", "--audio-format", "wav",
#                 "-o", str(output), url,
#             ],
#             check=True,
#             capture_output=True,
#         )
#
#         # Normalize audio
#         subprocess.run(
#             [
#                 "ffmpeg", "-y", "-i", str(output),
#                 "-ar", "16000", "-ac", "1", str(tmp_output),
#             ],
#             check=True,
#             capture_output=True,
#         )
#
#         tmp_output.replace(output)
#         return output
#
#     except subprocess.CalledProcessError as e:
#         raise ExternalServiceError("ffmpeg/yt-dlp", str(e))
#
#
# class IngestService:
#     def __init__(self, db: Session):
#         self.db = db
#
#     def ingest_channel(
#         self,
#         channel_url: str,
#         *,
#         max_videos: int = 10,
#         progress_callback=None,
#     ) -> dict:
#         logger.info(f"Starting ingest for channel: {channel_url}")
#
#         # Get or create channel
#         channel = self.db.query(Channel).filter(Channel.url == channel_url).first()
#         if not channel:
#             channel = Channel(
#                 name=channel_url.split("@")[-1],
#                 url=channel_url,
#             )
#             self.db.add(channel)
#             self.db.commit()
#             self.db.refresh(channel)
#             logger.info(f"Created channel: {channel.name}")
#
#         # Fetch and register new videos
#         new_videos = 0
#         for video_data in fetch_channel_videos(channel_url):
#             video_id = video_data["id"]
#
#             if self.db.query(Video).filter(Video.video_id == video_id).first():
#                 continue
#
#             published = None
#             if "upload_date" in video_data:
#                 published = datetime.strptime(video_data["upload_date"], "%Y%m%d")
#
#             self.db.add(
#                 Video(
#                     video_id=video_id,
#                     channel_id=channel.id,
#                     title=video_data.get("title"),
#                     description=video_data.get("description"),
#                     published_at=published,
#                     duration=video_data.get("duration"),
#                 )
#             )
#             new_videos += 1
#
#             if new_videos >= max_videos:
#                 break
#
#         self.db.commit()
#         logger.info(f"Registered {new_videos} new videos")
#
#         # Download pending videos
#         pending = (
#             self.db.query(Video)
#             .filter(Video.channel_id == channel.id)
#             .filter(Video.downloaded.is_(False))
#             .all()
#         )
#
#         downloaded = 0
#         failed = 0
#
#         for i, video in enumerate(pending):
#             if progress_callback:
#                 progress_callback(int((i / len(pending)) * 100))
#
#             try:
#                 audio_path = download_audio(
#                     video.video_id,
#                     f"https://www.youtube.com/watch?v={video.video_id}",
#                 )
#                 video.audio_path = str(audio_path)
#                 video.downloaded = True
#                 self.db.commit()
#                 downloaded += 1
#                 logger.info(f"Downloaded {video.video_id}")
#             except Exception as e:
#                 failed += 1
#                 logger.error(f"Download failed for {video.video_id}: {e}")
#
#         return {
#             "channel_id": channel.id,
#             "new_videos": new_videos,
#             "downloaded": downloaded,
#             "failed": failed,
#         }
