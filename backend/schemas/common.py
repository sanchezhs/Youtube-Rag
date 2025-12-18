from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int


class StatusResponse(BaseModel):
    status: str
    message: str


class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str
