from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    if post.status != "pending_review":
        raise HTTPException(status_code=400, detail="Post não está em revisão")
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
