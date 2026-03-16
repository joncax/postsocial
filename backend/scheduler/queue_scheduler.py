from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, cast
from sqlalchemy.dialects.postgresql import VARCHAR
from storage.database import AsyncSessionLocal
from storage.models import Post, Queue, Error
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def check_and_publish():
    """
    Verifica a fila e publica posts agendados.
    Corre a cada minuto.
    """
    async with AsyncSessionLocal() as db:
        try:
            now = datetime.now(timezone.utc)

            # Buscar posts agendados para agora ou no passado
            result = await db.execute(
                select(Post)
                .join(Queue, Post.queue_id == Queue.id)
                .where(
                    and_(
                        cast(Post.status, VARCHAR) == "scheduled",
                        Post.scheduled_at <= now,
                        Queue.is_active == True
                    )
                )
                .order_by(Post.scheduled_at.asc())
            )
            posts = result.scalars().all()

            if not posts:
                return

            logger.info(f"[Scheduler] {len(posts)} post(s) para publicar")

            for post in posts:
                await publish_post(db, post)

        except Exception as e:
            logger.error(f"[Scheduler] Erro no ciclo de verificação: {e}")

async def publish_post(db: AsyncSession, post: Post):
    """Tenta publicar um post."""
    from publisher.instagram import publish_to_instagram
    from notifications.email import send_error_email

    try:
        logger.info(f"[Scheduler] A publicar post {post.id}")

        # Marcar como a publicar
        post.status = "publishing"
        await db.flush()

        # Publicar
        platform_post_id = await publish_to_instagram(db, post)

        # Sucesso
        post.status = "published"
        post.published_at = datetime.now(timezone.utc)
        post.platform_post_id = platform_post_id
        await db.commit()

        logger.info(f"[Scheduler] Post {post.id} publicado com sucesso")

        # Publicar story associada (se existir)
        await publish_story(db, post)

    except Exception as e:
        await db.rollback()
        logger.error(f"[Scheduler] Erro ao publicar post {post.id}: {e}")

        # Re-buscar o post após rollback
        result = await db.execute(select(Post).where(Post.id == post.id))
        post = result.scalar_one_or_none()
        if not post:
            return

        post.retry_count += 1

        if post.retry_count >= post.max_retries:
            # Máximo de tentativas atingido
            post.status = "error"

            # Registar erro
            error = Error(
                post_id=post.id,
                queue_id=post.queue_id,
                category=classify_error(str(e)),
                error_code=type(e).__name__,
                message=str(e),
                status="open"
            )
            db.add(error)

            # Pausar a fila
            queue_result = await db.execute(
                select(Queue).where(Queue.id == post.queue_id)
            )
            queue = queue_result.scalar_one_or_none()
            if queue:
                queue.is_active = False
                logger.warning(f"[Scheduler] Fila {queue.id} pausada devido a erro")

            await db.commit()

            # Enviar email de alerta
            try:
                await send_error_email(post, str(e))
            except Exception as email_err:
                logger.error(f"[Scheduler] Erro ao enviar email: {email_err}")

        else:
            # Ainda tem tentativas — reagendar
            post.status = "scheduled"
            await db.commit()
            logger.info(f"[Scheduler] Post {post.id} vai ser retentado ({post.retry_count}/{post.max_retries})")

async def publish_story(db: AsyncSession, post: Post):
    """Publica a story associada ao post, se existir."""
    from publisher.instagram import publish_story_to_instagram

    result = await db.execute(
        select(Post).where(
            and_(
                Post.parent_post_id == post.id,
                Post.type == "story",
                Post.status == "scheduled"
            )
        )
    )
    story = result.scalar_one_or_none()

    if not story:
        return

    try:
        logger.info(f"[Scheduler] A publicar story {story.id}")
        await publish_story_to_instagram(db, story)
        story.status = "published"
        story.published_at = datetime.now(timezone.utc)
        await db.commit()
        logger.info(f"[Scheduler] Story {story.id} publicada com sucesso")
    except Exception as e:
        logger.error(f"[Scheduler] Erro ao publicar story {story.id}: {e}")
        story.status = "error"
        await db.commit()

def classify_error(error_message: str) -> str:
    """Classifica o tipo de erro."""
    error_lower = error_message.lower()

    # Erros auto-recuperáveis
    if any(x in error_lower for x in ["timeout", "connection", "network", "rate limit", "429"]):
        return "auto_recoverable"

    # Erros críticos
    if any(x in error_lower for x in ["unauthorized", "forbidden", "invalid token", "401", "403"]):
        return "critical"

    # Por defeito — requer decisão do utilizador
    return "user_decision"

def start_scheduler():
    """Arranca o scheduler."""
    scheduler.add_job(
        check_and_publish,
        trigger=IntervalTrigger(minutes=1),
        id="queue_checker",
        name="Verificar fila de posts",
        replace_existing=True,
        max_instances=1  # Nunca corre duas vezes ao mesmo tempo
    )
    scheduler.start()
    logger.info("[Scheduler] Iniciado — a verificar a cada minuto")

def stop_scheduler():
    """Para o scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[Scheduler] Parado")
