from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.database import get_db
from storage.models import Post
from publisher.instagram import publish_to_instagram
from uuid import UUID

router = APIRouter(prefix="/api/publisher", tags=["Publisher"])

@router.post("/test/{post_id}")
async def test_publish(post_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Testa a publicação de um post (modo mock se não houver API key).
    Útil para validar o fluxo completo sem publicar realmente.
    """
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post nao encontrado")

    try:
        platform_post_id = await publish_to_instagram(db, post)
        return {
            "success": True,
            "post_id": str(post_id),
            "platform_post_id": platform_post_id,
            "mode": "mock" if not __import__('config.settings', fromlist=['settings']).settings.UPLOAD_POST_API_KEY else "real"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def publisher_status():
    """Estado do publisher — confirma se está em modo mock ou real."""
    from config.settings import settings
    return {
        "instagram": {
            "configured": bool(settings.UPLOAD_POST_API_KEY),
            "mode": "real" if settings.UPLOAD_POST_API_KEY else "mock"
        },
        "ai": {
            "configured": bool(settings.ANTHROPIC_API_KEY),
            "mode": "real" if settings.ANTHROPIC_API_KEY else "mock"
        }
    }
