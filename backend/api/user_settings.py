from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from storage.database import get_db
from storage.models import User
from auth.dependencies import get_current_user
from pydantic import BaseModel
from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from storage.database import Base
import uuid

router = APIRouter(prefix="/api/settings", tags=["Settings"])

ALLOWED_KEYS = {
    "upload_post_api_key",
    "anthropic_api_key",
    "alert_email"
}

class UserSetting(Base):
    __tablename__ = "user_settings"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    key        = Column(String(100), nullable=False)
    value      = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class SettingValue(BaseModel):
    value: str

@router.get("/{key}")
async def get_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if key not in ALLOWED_KEYS:
        raise HTTPException(status_code=400, detail="Chave inválida")

    result = await db.execute(
        select(UserSetting).where(
            UserSetting.user_id == current_user.id,
            UserSetting.key == key
        )
    )
    setting = result.scalar_one_or_none()

    if setting and setting.value:
        # Mascarar API keys
        if key in ("upload_post_api_key", "anthropic_api_key"):
            masked = setting.value[:6] + "..." + setting.value[-4:] if len(setting.value) > 10 else "***"
            return {"key": key, "value": masked, "configured": True}
        return {"key": key, "value": setting.value, "configured": True}

    return {"key": key, "value": "", "configured": False}

@router.post("/{key}")
async def save_setting(
    key: str,
    data: SettingValue,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if key not in ALLOWED_KEYS:
        raise HTTPException(status_code=400, detail="Chave inválida")

    result = await db.execute(
        select(UserSetting).where(
            UserSetting.user_id == current_user.id,
            UserSetting.key == key
        )
    )
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = data.value
    else:
        setting = UserSetting(
            user_id=current_user.id,
            key=key,
            value=data.value
        )
        db.add(setting)

    await db.flush()
    return {"message": "Configuração guardada com sucesso"}
