from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from shared.db.session import get_db
from shared.db.models import Channel, Video, Chunk, PipelineTask, TaskStatus
from schemas.pipeline import (
    TaskRequest,
    PipelineStatsResponse,
    PipelineTaskResponse,
)

router = APIRouter()


# -------------------------------------------------------------------------
# Stats
# -------------------------------------------------------------------------
@router.get("/stats", response_model=PipelineStatsResponse)
def get_pipeline_stats(db: Session = Depends(get_db)):
    """Get pipeline statistics."""
    return PipelineStatsResponse(
        total_channels=db.query(Channel).count(),
        total_videos=db.query(Video).count(),
        videos_downloaded=db.query(Video).filter(Video.downloaded.is_(True)).count(),
        videos_transcribed=db.query(Video).filter(Video.transcribed.is_(True)).count(),
        total_chunks=db.query(Chunk).count(),
        chunks_embedded=db.query(Chunk).filter(Chunk.embedding.isnot(None)).count(),
    )


# -------------------------------------------------------------------------
# Task Management
# -------------------------------------------------------------------------
@router.get("/tasks", response_model=list[PipelineTaskResponse])
def list_tasks(
    status: Optional[TaskStatus] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List pipeline tasks."""
    query = db.query(PipelineTask).order_by(PipelineTask.created_at.desc())
    
    if status:
        query = query.filter(PipelineTask.status == status)
    
    tasks = query.limit(limit).all()
    return [PipelineTaskResponse.model_validate(t) for t in tasks]


@router.get("/tasks/{task_id}", response_model=PipelineTaskResponse)
def get_task(task_id: UUID, db: Session = Depends(get_db)):
    """Get task by ID."""
    task = db.get(PipelineTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return PipelineTaskResponse.model_validate(task)


@router.post("/tasks")
def create_task(task_request: TaskRequest, db: Session = Depends(get_db)):
    if task_request.task_type == "embed_question":
        raise ValueError(f"Task type {task_request.task_type} can only be used internally")

    if task_request.task_type == "pipeline" and not task_request.channel_url:
        raise ValueError(f"Task type {task_request.task_type} must defined channel_url")

    if task_request.task_type == "embed_question" and not task_request.question_to_embed:
        raise ValueError(f"Task type {task_request.task_type} must defined question_to_embed")


    task = PipelineTask(
        task_type=task_request.task_type,
        status=TaskStatus.PENDING,
        request=task_request.model_dump(),
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "task_id": str(task.id),
        "status": task.status,
    }

