from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.database import get_db
from storage.models import User
from auth.security import decode_token

bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    user_id = decode_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilizador não encontrado"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desactivada"
        )

    return user

async def check_post_limit(
    db: AsyncSession,
    user: User
) -> None:
    """Verifica se o utilizador atingiu o limite de posts do plano."""
    from storage.models import Plan
    from datetime import date

    plan_result = await db.execute(select(Plan).where(Plan.id == user.plan_id))
    plan = plan_result.scalar_one_or_none()

    if not plan:
        return

    # Reset contador mensal se necessário
    if user.last_reset_date.month != date.today().month:
        user.posts_this_month = 0
        user.last_reset_date = date.today()
        await db.flush()

    # Verificar limite (None = ilimitado)
    if plan.max_posts_per_month is not None:
        if user.posts_this_month >= plan.max_posts_per_month:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Limite de {plan.max_posts_per_month} posts/mês atingido. Actualiza o teu plano."
            )
