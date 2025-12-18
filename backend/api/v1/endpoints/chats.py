from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from shared.db.session import get_db
from shared.db.repositories.chat import ChatSessionRepository
from shared.db.models import PipelineTask, TaskStatus

from services.rag import RAGService
from schemas.chat import (
    ChatSessionResponse,
    ChatSessionDetail,
    ChatMessageResponse,
    AskRequest,
    AskResponse,
)


router = APIRouter()


@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_sessions(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    repo = ChatSessionRepository(db)
    sessions = repo.get_multi(skip=skip, limit=limit)

    result = []
    for session in sessions:
        messages = repo.get_messages(session.id, limit=1)
        result.append(
            ChatSessionResponse(
                **session.__dict__,
                message_count=len(repo.get_messages(session.id, limit=1000)),
            )
        )
    return result


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
):
    repo = ChatSessionRepository(db)
    session = repo.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = repo.get_messages(session_id)

    return ChatSessionDetail(
        **session.__dict__,
        messages=[ChatMessageResponse(**m.__dict__) for m in messages],
        message_count=len(messages),
    )


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: UUID,
    db: Session = Depends(get_db),
):
    repo = ChatSessionRepository(db)
    if not repo.delete(session_id):
        raise HTTPException(status_code=404, detail="Session not found")


@router.post("/ask", response_model=AskResponse)
def ask(
    request: AskRequest,
    db: Session = Depends(get_db),
):
    rag_service = RAGService(db)

    task = PipelineTask(
        task_type="embed_question",
        status=TaskStatus.PENDING,
        request={"question_to_embed": request.question},
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return rag_service.ask(
        question=request.question,
        task_id=task.id,
        session_id=request.session_id,
        top_k=5
    )

