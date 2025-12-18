from fastapi import APIRouter

from api.v1.endpoints import channels, videos, chats, pipeline

api_router = APIRouter()

api_router.include_router(channels.router, prefix="/channels", tags=["channels"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(chats.router, prefix="/chat", tags=["chat"])
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])
