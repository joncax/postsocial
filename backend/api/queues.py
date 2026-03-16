from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.database import get_db
from storage.models import Queue, Platform, User
from api.schemas import QueueCreate, QueueUpdate, QueueResponse
from auth.dependencies import get_current_user
from typing import List
from uuid import UUID

router = APIRouter(prefix="/api/queues", tags=["Queues"])

@router.get("/", response_model=List[QueueResponse])
async def list_queues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Queue)
        .where(Queue.user_id == current_user.id)
        .order_by(Queue.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{queue_id}", response_model=QueueResponse)
async def get_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Queue).where(Queue.id == queue_id, Queue.user_id == current_user.id)
    )
    queue = result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Fila nao encontrada")
    return queue

@router.post("/", response_model=QueueResponse, status_code=201)
async def create_queue(
    data: QueueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    platform = await db.execute(select(Platform).where(Platform.id == data.platform_id))
    if not platform.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Plataforma nao encontrada")

    queue = Queue(**data.model_dump(), user_id=current_user.id)
    db.add(queue)
    await db.flush()
    await db.refresh(queue)
    return queue

@router.patch("/{queue_id}", response_model=QueueResponse)
async def update_queue(
    queue_id: UUID,
    data: QueueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Queue).where(Queue.id == queue_id, Queue.user_id == current_user.id)
    )
    queue = result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Fila nao encontrada")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(queue, field, value)

    await db.flush()
    await db.refresh(queue)
    return queue

@router.patch("/{queue_id}/pause")
async def pause_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Queue).where(Queue.id == queue_id, Queue.user_id == current_user.id)
    )
    queue = result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Fila nao encontrada")
    queue.is_active = False
    await db.flush()
    return {"message": "Fila pausada com sucesso"}

@router.patch("/{queue_id}/resume")
async def resume_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Queue).where(Queue.id == queue_id, Queue.user_id == current_user.id)
    )
    queue = result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Fila nao encontrada")
    queue.is_active = True
    await db.flush()
    return {"message": "Fila reactivada com sucesso"}

@router.delete("/{queue_id}", status_code=204)
async def delete_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Queue).where(Queue.id == queue_id, Queue.user_id == current_user.id)
    )
    queue = result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Fila nao encontrada")
    await db.delete(queue)
