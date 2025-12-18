import logging
import subprocess
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from core.config import settings
from shared.db.session import get_db_context
from shared.db.models import Channel, Video


AUDIO_DIR = Path(settings.audio_dir)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__) 
logger.setLevel(logging.INFO)

METADATA_TIMEOUT = 60  # seconds
DOWNLOAD_TIMEOUT = 600 # seconds

def fetch_channel_videos(channel_url: str, max_videos: int = 10, timeout_seconds: int = METADATA_TIMEOUT) -> list[dict]:
    """Fetch video metadata from a YouTube channel."""
    logger.info(f"Fetching {max_videos} videos from: {channel_url}")

    cmd = ["yt-dlp", "-v", "--flat-playlist", "--dump-json", channel_url]


    try:
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            check=True,
            timeout=timeout_seconds * max_videos,
        )
        
        videos = []
        for line in result.stdout.splitlines():
            videos.append(json.loads(line))
            if len(videos) >= max_videos:
                break
        
        logger.info(f"Fetched {len(videos)} video metadata entries")
        return videos

    except subprocess.TimeoutExpired:
        logger.error(f"yt-dlp metadata fetch timed out after {timeout_seconds}s")
        raise 
    except subprocess.CalledProcessError as e:
        logger.error(f"yt-dlp failed with exit code {e.returncode}: {e.stderr}")
        raise


def register_channel(channel_url: str) -> int:
    """Create or get channel in database, return channel ID."""
    with get_db_context() as db:
        channel = db.query(Channel).filter(Channel.url == channel_url).first()
        
        if not channel:
            channel = Channel(
                name=channel_url.split("@")[-1],
                url=channel_url,
            )
            db.add(channel)
            db.commit()
            db.refresh(channel)
            logger.info(f"Created new channel: {channel.name}")
        else:
            logger.info(f"Using existing channel: {channel.name}")

        return channel.id


def register_videos(channel_id: int, videos_data: list[dict]) -> list[str]:
    """Register videos in database, return list of new video IDs."""
    new_video_ids = []

    with get_db_context() as db:
        for video_data in videos_data:
            video_id = video_data["id"]

            # Skip if already exists
            if db.query(Video).filter(Video.video_id == video_id).first():
                continue

            published = None
            if "upload_date" in video_data:
                try:
                    published = datetime.strptime(video_data["upload_date"], "%Y%m%d")
                except (ValueError, TypeError):
                    pass

            db.add(
                Video(
                    video_id=video_id,
                    channel_id=channel_id,
                    title=video_data.get("title"),
                    description=video_data.get("description"),
                    published_at=published,
                    duration=video_data.get("duration"),
                )
            )
            new_video_ids.append(video_id)

        db.commit()
        logger.info(f"Registered {len(new_video_ids)} new videos")

    return new_video_ids


def download_audio(video_id: str, timeout_seconds: int = DOWNLOAD_TIMEOUT) -> Optional[str]:
    """Download and normalize audio for a video."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    output = AUDIO_DIR / f"{video_id}.wav"
    tmp_output = AUDIO_DIR / f"{video_id}_tmp.wav"

    if output.exists():
        logger.info(f"Audio already exists: {video_id}")
        return str(output)

    try:
        logger.info(f"Downloading audio for: {video_id}")

        # Download audio
        subprocess.run(
            [
                "yt-dlp", "-f", "bestaudio",
                "--extract-audio", "--audio-format", "wav",
                "-o", str(output), url,
            ],
            check=True,
            capture_output=True,
            timeout=timeout_seconds,
        )

        # Normalize audio
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(output),
                "-ar", "16000", "-ac", "1", str(tmp_output),
            ],
            check=True,
            capture_output=True,
            timeout=timeout_seconds,
        )

        tmp_output.replace(output)
        logger.info(f"Downloaded and normalized: {video_id}")
        return str(output)

    except subprocess.CalledProcessError as e:
        logger.error(f"Download failed for {video_id}: {e}")
        return None
    except subprocess.TimeoutExpired:
        logger.error(f"Download timed out for {video_id}")
        if output.exists():
            output.unlink()
        if tmp_output.exists():
            tmp_output.unlink()

        return None


def update_video_download_status(video_id: str, audio_path: Optional[str]):
    """Update video download status in database."""
    with get_db_context() as db:
        video = db.query(Video).filter(Video.video_id == video_id).first()
        if video and audio_path:
            video.audio_path = audio_path
            video.downloaded = True
            db.commit()
            logger.info(f"Updated download status for: {video_id}")

def ingest_channel_flow(
    channel_url: str,
    task_id: str,
    max_videos: int = 10,
    download: bool = True,
) -> dict:
    """
    Main flow for ingesting a YouTube channel.
    
    Args:
        channel_url: YouTube channel URL
        max_videos: Maximum number of videos to ingest
        download: Whether to download audio files
    
    Returns:
        Dictionary with ingestion results
    """
    logger.info(f"Starting ingest flow for channel: {channel_url} and task: {task_id}")

    # Step 1: Register channel
    channel_id = register_channel(channel_url)

    # Step 2: Fetch video metadata
    videos_data = fetch_channel_videos(channel_url, max_videos)

    # Step 3: Register videos
    new_video_ids = register_videos(channel_id, videos_data)

    # Step 4: Download audio (if enabled)
    downloaded = 0
    failed = 0

    if download and new_video_ids:
        logger.info(f"Downloading audio for {len(new_video_ids)} videos")

        for video_id in new_video_ids:
            audio_path = download_audio(video_id)
            update_video_download_status(video_id, audio_path)
            
            if audio_path:
                downloaded += 1
            else:
                failed += 1

    result = {
        "channel_id": channel_id,
        "video_ids": new_video_ids,
        "videos_fetched": len(videos_data),
        "videos_registered": len(new_video_ids),
        "videos_downloaded": downloaded,
        "videos_failed": failed,
    }

    logger.info(f"Ingest flow completed: {result}")
    return result
