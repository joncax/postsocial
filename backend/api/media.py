from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.database import get_db
from storage.models import Post, Media
from api.schemas import MediaResponse
from media.processor import (
    validate_image, process_image,
    UPLOAD_DIR, ALLOWED_FORMATS
)
from pathlib import Path
from typing import List, Optional
from uuid import UUID
import uuid
import shutil

router = APIRouter(prefix="/api/media", tags=["Media"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/jpg"}

@router.post("/upload/{post_id}", response_model=List[MediaResponse])
async def upload_media(
    post_id: UUID,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    # Verificar se o post existe
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")

    # Verificar número de ficheiros para carrossel
    if post.type == "carousel" and len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="Carrossel suporta no máximo 10 imagens"
        )
    if post.type == "carousel" and len(files) < 2:
        raise HTTPException(
            status_code=400,
            detail="Carrossel precisa de pelo menos 2 imagens"
        )

    uploaded_media = []

    for index, file in enumerate(files):
        # Validar tipo MIME
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Ficheiro '{file.filename}' tem formato inválido. Use JPG ou PNG."
            )

        # Guardar ficheiro temporariamente
        temp_filename = f"{uuid.uuid4()}_{file.filename}"
        temp_path = UPLOAD_DIR / temp_filename

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Validar imagem
        validation = validate_image(temp_path)
        if not validation["valid"]:
            temp_path.unlink()  # apagar ficheiro temporário
            raise HTTPException(
                status_code=400,
                detail=f"Imagem '{file.filename}' inválida: {', '.join(validation['errors'])}"
            )

        # Processar imagem
        try:
            processed = process_image(temp_path, str(post_id), index)
        except Exception as e:
            temp_path.unlink()
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao processar imagem '{file.filename}': {str(e)}"
            )

        # Guardar na base de dados
        media = Media(
            post_id=post_id,
            file_path=str(temp_path),
            file_name=file.filename,
            file_size=validation["file_size"],
            mime_type=file.content_type,
            width=processed["width"],
            height=processed["height"],
            processed_path=processed["processed_path"],
            story_path=processed["story_path"],
            order_index=index,
            is_processed=True
        )
        db.add(media)
        await db.flush()
        await db.refresh(media)
        uploaded_media.append(media)

    # Actualizar status do post
    post.status = "pending_review"
    await db.flush()

    return uploaded_media

@router.get("/{post_id}", response_model=List[MediaResponse])
async def list_media(post_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Media)
        .where(Media.post_id == post_id)
        .order_by(Media.order_index)
    )
    return result.scalars().all()

@router.delete("/{media_id}", status_code=204)
async def delete_media(media_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Media).where(Media.id == media_id))
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media não encontrado")

    # Apagar ficheiros físicos
    for path in [media.file_path, media.processed_path, media.story_path]:
        if path and Path(path).exists():
            Path(path).unlink()

    await db.delete(media)

@router.patch("/{post_id}/reorder")
async def reorder_media(
    post_id: UUID,
    media_ids: List[UUID],
    db: AsyncSession = Depends(get_db)
):
    """Reordena as imagens de um carrossel."""
    for index, media_id in enumerate(media_ids):
        result = await db.execute(
            select(Media).where(Media.id == media_id, Media.post_id == post_id)
        )
        media = result.scalar_one_or_none()
        if media:
            media.order_index = index

    await db.flush()
    return {"message": "Ordem actualizada com sucesso"}
