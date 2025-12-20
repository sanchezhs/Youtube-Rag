from typing import List

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_channel_repo
from db.repositories.channel import ChannelRepository
from schemas.channel import (
    ChannelCreate,
    ChannelResponse,
    ChannelWithStats,
    ChannelUpdate,
)

router = APIRouter()


@router.get("/", response_model=List[ChannelResponse])
def list_channels(
    skip: int = 0,
    limit: int = 100,
    repo: ChannelRepository = Depends(get_channel_repo),
):
    return repo.get_multi(skip=skip, limit=limit)


@router.get("/{channel_id}", response_model=ChannelWithStats)
def get_channel(
    channel_id: int,
    repo: ChannelRepository = Depends(get_channel_repo),
):
    data = repo.get_with_stats(channel_id)
    if not data:
        raise HTTPException(status_code=404, detail="Channel not found")

    return ChannelWithStats(
        **data["channel"].__dict__,
        video_count=data["video_count"],
        downloaded_count=data["downloaded_count"],
        transcribed_count=data["transcribed_count"],
    )


@router.post("/", response_model=ChannelResponse, status_code=201)
def create_channel(
    channel_in: ChannelCreate,
    repo: ChannelRepository = Depends(get_channel_repo),
):
    existing = repo.get_by_url(channel_in.url)
    if existing:
        raise HTTPException(status_code=400, detail="Channel already exists")

    name = channel_in.url.split("@")[-1]
    return repo.create({"name": name, "url": channel_in.url})


@router.patch("/{channel_id}", response_model=ChannelResponse)
def update_channel(
    channel_id: int,
    channel_in: ChannelUpdate,
    repo: ChannelRepository = Depends(get_channel_repo),
):
    channel = repo.get(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    update_data = channel_in.model_dump(exclude_unset=True)
    return repo.update(channel, update_data)


@router.delete("/{channel_id}", status_code=204)
def delete_channel(
    channel_id: int,
    repo: ChannelRepository = Depends(get_channel_repo),
):
    if not repo.delete(channel_id):
        raise HTTPException(status_code=404, detail="Channel not found")
