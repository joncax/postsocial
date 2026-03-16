from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast
from sqlalchemy.dialects.postgresql import VARCHAR
from storage.database import get_db
from storage.models import Post, Queue, Platform
from api.schemas import PostCreate, PostUpdate, PostResponse
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/api/posts", tags=["Posts"])

@router.get("/", response_model=List[PostResponse])
async def list_posts(
    queue_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Post).order_by(Post.scheduled_at.asc())
    if queue_id:
        query = query.where(Post.queue_id == queue_id)
    if status:
        query = query.where(Post.status == status)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    return post

@router.post("/", response_model=PostResponse, status_code=201)
async def create_post(data: PostCreate, db: AsyncSession = Depends(get_db)):
    # Verificar se a fila existe
    queue_result = await db.execute(select(Queue).where(Queue.id == data.queue_id))
    queue = queue_result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Fila não encontrada")

    post = Post(
        **data.model_dump(),
        platform_id=queue.platform_id,
        status="draft"
    )
    db.add(post)
    await db.flush()
    await db.refresh(post)
    return post

@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(post_id: UUID, data: PostUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(post, field, value)

    await db.flush()
    await db.refresh(post)
    return post

@router.patch("/{post_id}/approve")
async def approve_post(post_id: UUID, db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone

    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post nao encontrado")
    if post.status != "pending_review":
        raise HTTPException(status_code=400, detail="Post nao esta em revisao")

    # Calcular próximo slot disponível na fila
    queue_result = await db.execute(select(Queue).where(Queue.id == post.queue_id))
    queue = queue_result.scalar_one_or_none()

    if queue and queue.rules:
        from datetime import datetime, timedelta, timezone
        rules = queue.rules
        publish_times = rules.get('publish_times', ['18:00'])
        allowed_days = rules.get('allowed_days', [1,2,3,4,5])
        min_interval = rules.get('min_interval_hours', 24)

        # Buscar último post agendado nesta fila
        last_result = await db.execute(
            select(Post)
            .where(Post.queue_id == queue.id)
            .where(Post.status.in_(['scheduled', 'published']))
            .where(Post.id != post.id)
            .order_by(Post.scheduled_at.desc())
        )
        last_post = last_result.scalars().first()

        # Começar a partir do último post ou agora
        start = last_post.scheduled_at if last_post and last_post.scheduled_at else datetime.now(timezone.utc)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)

        # Encontrar próximo slot
        current = start.replace(minute=0, second=0, microsecond=0)
        found = None
        for _ in range(24 * 60):  # max 60 dias
            current += timedelta(hours=1)
            if current.isoweekday() not in allowed_days:
                continue
            current_time = current.strftime('%H:%M')
            if current_time in publish_times:
                found = current
                break

        if found:
            post.scheduled_at = found

    post.status = "scheduled"
    await db.flush()
    return {"message": "Post aprovado e agendado"}

@router.patch("/{post_id}/cancel")
async def cancel_post(post_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    post.status = "cancelled"
    await db.flush()
    return {"message": "Post cancelado"}

@router.delete("/{post_id}", status_code=204)
async def delete_post(post_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    await db.delete(post)
