from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from storage.database import get_db
from storage.models import Post, Queue
from api.schemas import PostResponse
from scheduler.queue_scheduler import scheduler, check_and_publish
from datetime import datetime, timezone
from typing import List
from uuid import UUID

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])

@router.get("/status")
async def scheduler_status():
    """Estado actual do scheduler."""
    jobs = scheduler.get_jobs()
    return {
        "running": scheduler.running,
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run": str(job.next_run_time)
            }
            for job in jobs
        ]
    }

@router.post("/run-now")
async def run_now():
    """Força uma verificação imediata da fila."""
    await check_and_publish()
    return {"message": "Verificacao da fila executada"}

@router.get("/pending", response_model=List[PostResponse])
async def pending_posts(db: AsyncSession = Depends(get_db)):
    """Lista posts agendados para as próximas 24 horas."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    in_24h = now + timedelta(hours=24)

    result = await db.execute(
        select(Post)
        .where(
            and_(
                Post.status == "scheduled",
                Post.scheduled_at >= now,
                Post.scheduled_at <= in_24h
            )
        )
        .order_by(Post.scheduled_at.asc())
    )
    return result.scalars().all()

@router.post("/calculate-schedule/{queue_id}")
async def calculate_schedule(
    queue_id: UUID,
    num_posts: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """
    Calcula os próximos horários disponíveis numa fila.
    Útil para mostrar ao utilizador quando os posts vão ser publicados.
    """
    queue_result = await db.execute(select(Queue).where(Queue.id == queue_id))
    queue = queue_result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Fila nao encontrada")

    slots = await get_next_slots(queue, num_posts, db)
    return {"queue_id": queue_id, "slots": slots}

async def get_next_slots(queue: Queue, num_slots: int, db: AsyncSession) -> list:
    """Calcula os próximos horários livres numa fila."""
    from datetime import timedelta
    import pytz

    rules = queue.rules
    allowed_days    = rules.get("allowed_days", [1,2,3,4,5])
    publish_times   = rules.get("publish_times", ["18:00"])
    min_interval_h  = rules.get("min_interval_hours", 24)

    # Último post agendado nesta fila
    last_post = await db.execute(
        select(Post)
        .where(
            and_(
                Post.queue_id == queue.id,
                Post.status.in_(["scheduled", "published"])
            )
        )
        .order_by(Post.scheduled_at.desc())
    )
    last = last_post.scalars().first()

    # Começar a partir do último post ou agora
    start = last.scheduled_at if last and last.scheduled_at else datetime.now(timezone.utc)
    start = start.replace(tzinfo=timezone.utc)

    slots = []
    current = start
    attempts = 0
    max_attempts = num_slots * 60  # evitar loop infinito

    while len(slots) < num_slots and attempts < max_attempts:
        attempts += 1
        current += timedelta(hours=1)

        # Verificar dia da semana (1=Segunda, 7=Domingo)
        if current.isoweekday() not in allowed_days:
            continue

        # Verificar hora
        current_time = current.strftime("%H:%M")
        if current_time not in publish_times:
            continue

        # Verificar intervalo mínimo
        if slots:
            diff = (current - slots[-1]).total_seconds() / 3600
            if diff < min_interval_h:
                continue

        slots.append(current)

    return [str(s) for s in slots]
