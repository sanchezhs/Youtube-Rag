from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from shared.db.models import Settings
from shared.db.repositories.base import BaseRepository


class SettingsRepository(BaseRepository[Settings]):
    def __init__(self, db: Session):
        super().__init__(Settings, db)
        
    def get_settings(self, component: str, section: str) -> dict:
        stmt = (
            select(Settings.key, Settings.value, Settings.value_type)
            .where(
                Settings.component == component,
                Settings.section == section,
            )
        )

        rows = self.db.execute(stmt).all()

        def cast(v: str, t: str):
            return {
                "int": int,
                "float": float,
                "bool": lambda x: x.lower() == "true",
                "string": str,
            }[t](v)

        return {key: cast(value, value_type) for key, value, value_type in rows}

    def add_setting(
        self,
        *,
        component: str,
        section: str,
        key: str,
        value: Any,
        value_type: str,
        description: Optional[str] = None,
    ) -> Settings:
        # Check if exists
        stmt = select(Settings).where(
            Settings.component == component,
            Settings.section == section,
            Settings.key == key,
        )
        existing = self.db.scalar(stmt)
        if existing:
            raise ValueError("Setting already exists")

        setting = Settings(
            component=component,
            section=section,
            key=key,
            value=str(value),
            value_type=value_type,
            description=description,
        )

        self.db.add(setting)
        self.db.commit()
        self.db.refresh(setting)
        return setting

    def update_setting(
        self,
        *,
        component: str,
        section: str,
        key: str,
        value: Optional[Any] = None,
        value_type: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Settings:
        stmt = select(Settings).where(
            Settings.component == component,
            Settings.section == section,
            Settings.key == key,
        )
        setting = self.db.scalar(stmt)

        if not setting:
            raise ValueError("Setting not found")

        if value is not None:
            setting.value = str(value)

        if value_type is not None:
            setting.value_type = value_type

        if description is not None:
            setting.description = description

        self.db.commit()
        self.db.refresh(setting)
        return setting

    def delete_setting(
        self,
        *,
        component: str,
        section: str,
        key: str,
    ) -> bool:
        stmt = select(Settings).where(
            Settings.component == component,
            Settings.section == section,
            Settings.key == key,
        )
        setting = self.db.scalar(stmt)

        if not setting:
            return False

        self.db.delete(setting)
        self.db.commit()
        return True

