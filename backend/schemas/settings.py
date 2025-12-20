from typing import Optional, Any
from pydantic import BaseModel, Field


class SettingResponse(BaseModel):
    component: str
    section: str
    key: str
    value: Any
    value_type: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class SettingCreate(BaseModel):
    component: str
    section: str
    key: str
    value: Any
    value_type: str = Field(pattern="^(int|float|bool|string)$")
    description: Optional[str] = None


class SettingUpdate(BaseModel):
    value: Optional[Any] = None
    value_type: Optional[str] = Field(
        default=None,
        pattern="^(int|float|bool|string)$",
    )
    description: Optional[str] = None

