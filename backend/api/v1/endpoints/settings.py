from typing import Dict
from fastapi import APIRouter, Depends, HTTPException

from schemas.settings import (
    SettingResponse,
    SettingCreate,
    SettingUpdate,
)
from shared.db.repositories.settings import SettingsRepository
from api.deps import get_settings_repo

router = APIRouter()

@router.get(
    "/{component}",
    response_model=Dict[str, object],
)
def get_settings(
    component: str,
    repo: SettingsRepository = Depends(get_settings_repo),
):
    return repo.get_settings(component)

@router.post("/", response_model=SettingResponse)
def create_setting(
    data: SettingCreate,
    repo: SettingsRepository = Depends(get_settings_repo),
):
    try:
        return repo.add_setting(**data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put(
    "/{component}/{section}/{key}",
    response_model=SettingResponse,
)
def update_setting(
    component: str,
    section: str,
    key: str,
    data: SettingUpdate,
    repo: SettingsRepository = Depends(get_settings_repo),
):
    try:
        return repo.update_setting(
            component=component,
            section=section,
            key=key,
            **data.model_dump(exclude_unset=True),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{component}/{section}/{key}")
def delete_setting(
    component: str,
    section: str,
    key: str,
    repo: SettingsRepository = Depends(get_settings_repo),
):
    deleted = repo.delete_setting(
        component=component,
        section=section,
        key=key,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Setting not found")

    return {"status": "deleted"}

