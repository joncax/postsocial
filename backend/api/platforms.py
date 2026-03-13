from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.database import get_db
from storage.models import Platform, StoryTemplate
from api.schemas import PlatformResponse, StoryTemplateResponse
from typing import List

router = APIRouter(prefix="/api/platforms", tags=["Platforms"])

@router.get("/", response_model=List[PlatformResponse])
async def list_platforms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Platform).order_by(Platform.name))
    return result.scalars().all()

@router.get("/story-templates", response_model=List[StoryTemplateResponse])
async def list_story_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StoryTemplate)
        .where(StoryTemplate.is_active == True)
        .order_by(StoryTemplate.is_default.desc())
    )
    return result.scalars().all()
