from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.database import get_db
from storage.models import Error, Post
from api.schemas import ErrorResponse, ErrorResolve
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

router = APIRouter(prefix="/api/errors", tags=["Errors"])

@router.get("/", response_model=List[ErrorResponse])
async def list_errors(
    status: Optional[str] = "open",
    db: AsyncSession = Depends(get_db)
):
    query = select(Error).order_by(Error.occurred_at.desc())
    if status:
        query = query.where(Error.status == status)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{error_id}", response_model=ErrorResponse)
async def get_error(error_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Error).where(Error.id == error_id))
    error = result.scalar_one_or_none()
    if not error:
        raise HTTPException(status_code=404, detail="Erro não encontrado")
    return error

@router.patch("/{error_id}/resolve")
async def resolve_error(
    error_id: UUID,
    data: ErrorResolve,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Error).where(Error.id == error_id))
    error = result.scalar_one_or_none()
    if not error:
        raise HTTPException(status_code=404, detail="Erro não encontrado")

    error.status = "resolved"
    error.resolved_at = datetime.now(timezone.utc)
    error.resolved_by = "user"
    error.resolution_note = data.resolution_note

    # Accão no post associado
    if error.post_id:
        post_result = await db.execute(select(Post).where(Post.id == error.post_id))
        post = post_result.scalar_one_or_none()
        if post:
            if data.action == "reschedule" and data.scheduled_at:
                post.status = "scheduled"
                post.scheduled_at = data.scheduled_at
            elif data.action == "cancel":
                post.status = "cancelled"
            elif data.action == "fix":
                post.status = "pending_review"

    await db.flush()
    return {"message": "Erro resolvido com sucesso"}
