from sqlalchemy.orm import Session

from pydantic_settings import BaseSettings

from shared.db.repositories.settings import SettingsRepository

def populate_settings(
    *,
    db: Session,
    component: str,
    spec: dict,
    app_settings: BaseSettings
):
    repo = SettingsRepository(db)

    existing = repo.get_settings(component)
    if existing:
        return

    for section, keys in spec.items():
        for key, (value_type, value_getter, description) in keys.items():
            repo.add_setting(
                component=component,
                section=section,
                key=key,
                value=value_getter(app_settings),
                value_type=value_type,
                description=description,
            )

