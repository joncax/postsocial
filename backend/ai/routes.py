from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.database import get_db
from storage.models import Post, Media, AIDraft
from api.schemas import AIDraftResponse, AIDraftChoose
from ai.caption_generator import generate_captions
from pathlib import Path
from uuid import UUID

router = APIRouter(prefix="/api/ai", tags=["AI"])

@router.post("/generate/{post_id}", response_model=AIDraftResponse)
async def generate_caption(
    post_id: UUID,
    tone: str = "casual",
    db: AsyncSession = Depends(get_db)
):
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post nao encontrado")

    media_result = await db.execute(
        select(Media)
        .where(Media.post_id == post_id)
        .order_by(Media.order_index)
    )
    media_list = media_result.scalars().all()

    if not media_list:
        raise HTTPException(status_code=400, detail="Post nao tem imagens.")

    image_paths = [
        Path(m.processed_path) for m in media_list
        if m.processed_path and Path(m.processed_path).exists()
    ]

    if not image_paths:
        raise HTTPException(status_code=400, detail="Imagens ainda nao foram processadas.")

    try:
        result = await generate_captions(
            image_paths=image_paths,
            draft_caption=post.caption,
            tone=tone,
            location=post.location_name,
            is_carousel=post.type == "carousel"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar captions: {str(e)}")

    existing_draft = await db.execute(select(AIDraft).where(AIDraft.post_id == post_id))
    existing = existing_draft.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    draft = AIDraft(
        post_id=post_id,
        caption_v1=result.get("caption_v1"),
        caption_v2=result.get("caption_v2"),
        caption_v3=result.get("caption_v3"),
        hashtags_v1=result.get("hashtags_v1", []),
        hashtags_v2=result.get("hashtags_v2", []),
        hashtags_v3=result.get("hashtags_v3", []),
        tone_requested=tone
    )
    db.add(draft)
    await db.flush()
    await db.refresh(draft)
    return draft

@router.get("/draft/{post_id}", response_model=AIDraftResponse)
async def get_draft(post_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AIDraft).where(AIDraft.post_id == post_id))
    draft = result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Nenhum draft encontrado.")
    return draft

@router.post("/draft/{post_id}/choose", response_model=AIDraftResponse)
async def choose_caption(
    post_id: UUID,
    data: AIDraftChoose,
    db: AsyncSession = Depends(get_db)
):
    draft_result = await db.execute(select(AIDraft).where(AIDraft.post_id == post_id))
    draft = draft_result.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft nao encontrado")

    captions  = {1: draft.caption_v1,  2: draft.caption_v2,  3: draft.caption_v3}
    hashtags  = {1: draft.hashtags_v1, 2: draft.hashtags_v2, 3: draft.hashtags_v3}

    chosen_caption  = data.chosen_caption  or captions[data.chosen_version]
    chosen_hashtags = data.chosen_hashtags or hashtags[data.chosen_version]

    draft.chosen_version  = data.chosen_version
    draft.chosen_caption  = chosen_caption
    draft.chosen_hashtags = chosen_hashtags

    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if post:
        post.caption  = chosen_caption
        post.hashtags = chosen_hashtags

    await db.flush()
    await db.refresh(draft)
    return draft
