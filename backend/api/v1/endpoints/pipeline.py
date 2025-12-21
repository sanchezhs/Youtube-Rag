import asyncio
import json

from datetime import datetime, timezone

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session
from sqlalchemy import delete

from shared.db.session import get_db
from shared.db.models import Channel, Video, Chunk, PipelineTask, TaskStatus
from schemas.pipeline import (
    PaginatedTasksResponse,
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
@router.get("/tasks", response_model=PaginatedTasksResponse)
def list_tasks(
    status: Optional[TaskStatus] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    """List pipeline tasks with pagination."""
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100
    
    query = db.query(PipelineTask).order_by(PipelineTask.created_at.desc())
    
    if status:
        query = query.filter(PipelineTask.status == status)
    
    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    offset = (page - 1) * page_size
    tasks = query.offset(offset).limit(page_size).all()
    
    return PaginatedTasksResponse(
        items=[PipelineTaskResponse.model_validate(t) for t in tasks],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

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

@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: UUID, db: Session = Depends(get_db)):
    task = db.get(PipelineTask, task_id)

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()


# -------------------------------------------------------------------------
# SSE Notifications
# -------------------------------------------------------------------------
@router.get("/events")
async def task_events(db: Session = Depends(get_db)):
    """
    Server-Sent Events endpoint for real-time task notifications.
    Streams task status changes (completed/failed) to connected clients.
    """
    
    async def event_generator():
        # Track task states we've seen
        seen_task_states: dict[str, str] = {}
        
        # Initial load - mark all current completed/failed tasks as seen
        initial_tasks = db.query(PipelineTask).filter(
            PipelineTask.status.in_([TaskStatus.COMPLETED, TaskStatus.FAILED])
        ).all()
        
        for task in initial_tasks:
            seen_task_states[str(task.id)] = task.status.value
        
        # Send initial connection event
        yield f"event: connected\ndata: {json.dumps({'message': 'Connected to notifications'})}\n\n"
        
        while True:
            try:
                # Refresh the session to get latest data
                db.expire_all()
                
                # Query for completed and failed tasks
                tasks = db.query(PipelineTask).filter(
                    PipelineTask.status.in_([TaskStatus.COMPLETED, TaskStatus.FAILED])
                ).order_by(PipelineTask.completed_at.desc()).limit(20).all()
                
                for task in tasks:
                    task_id = str(task.id)
                    current_status = task.status.value
                    
                    # Check if this is a new status we haven't seen
                    if task_id not in seen_task_states or seen_task_states[task_id] != current_status:
                        seen_task_states[task_id] = current_status
                        
                        # Only send notification if task was recently completed (within last 60 seconds)
                        # This prevents flooding when first connecting
                        if task.completed_at:
                            time_diff = (datetime.now(timezone.utc) - task.completed_at).total_seconds()
                            if time_diff < 60:
                                event_data = {
                                    "type": "task_update",
                                    "task": {
                                        "id": task_id,
                                        "task_type": task.task_type,
                                        "status": current_status,
                                        "progress": task.progress,
                                        "error_message": task.error_message,
                                        "result": task.result,
                                        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                                    }
                                }
                                yield f"event: task_update\ndata: {json.dumps(event_data)}\n\n"
                
                # Send heartbeat every 30 seconds to keep connection alive
                yield f"event: heartbeat\ndata: {json.dumps({'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                # Wait before next check
                await asyncio.sleep(5)
                
            except Exception as e:
                # Send error event
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                await asyncio.sleep(5)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        }
    )
