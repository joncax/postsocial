from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.database import get_db
from storage.models import User, Plan
from api.schemas import UserRegister, UserLogin, TokenResponse, UserResponse, PlanResponse
from auth.security import hash_password, verify_password, create_access_token
from auth.dependencies import get_current_user
from typing import List

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Verificar se email já existe
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registado"
        )

    # Buscar plano free
    plan_result = await db.execute(select(Plan).where(Plan.name == "free"))
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=500, detail="Plano free não encontrado")

    # Criar utilizador
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        plan_id=plan.id
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou password incorrectos"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desactivada"
        )

    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/plans", response_model=List[PlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Plan)
        .where(Plan.is_active == True)
        .order_by(Plan.price_monthly.asc())
    )
    return result.scalars().all()

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

@router.patch("/profile")
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    await db.flush()
    return {"message": "Perfil actualizado"}

@router.patch("/password")
async def update_password(
    data: PasswordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password actual incorrecta"
        )
    current_user.password_hash = hash_password(data.new_password)
    await db.flush()
    return {"message": "Password alterada com sucesso"}
