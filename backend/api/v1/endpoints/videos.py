from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.deps import get_video_repo
from shared.db.session import get_db
from shared.db.models import Chunk, Segment

from db.repositories.video import VideoRepository
from schemas.video import VideoResponse, VideoDetail

router = APIRouter()


@router.get("/", response_model=List[VideoResponse])
def list_videos(
    channel_id: int = None,
    skip: int = 0,
    limit: int = 100,
    repo: VideoRepository = Depends(get_video_repo),
):
    if channel_id:
        return repo.get_by_channel(channel_id, skip=skip, limit=limit)
    return repo.get_multi(skip=skip, limit=limit)


@router.get("/{video_id}", response_model=VideoDetail)
def get_video(
    video_id: str,
    repo: VideoRepository = Depends(get_video_repo),
    db: Session = Depends(get_db),
):
    video = repo.get(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    chunk_count = db.query(Chunk).filter(Chunk.video_id == video_id).count()
    segment_count = db.query(Segment).filter(Segment.video_id == video_id).count()

    return VideoDetail(
        **video.__dict__,
        chunk_count=chunk_count,
        segment_count=segment_count,
    )


@router.get("/pending/download", response_model=List[VideoResponse])
def get_pending_download(
    channel_id: int = None,
    repo: VideoRepository = Depends(get_video_repo),
):
    return repo.get_pending_download(channel_id)


@router.get("/pending/transcription", response_model=List[VideoResponse])
def get_pending_transcription(
    repo: VideoRepository = Depends(get_video_repo),
):
    return repo.get_pending_transcription()
