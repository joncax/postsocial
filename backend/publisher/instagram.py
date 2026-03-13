import httpx
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from storage.models import Post, Media
from config.settings import settings

logger = logging.getLogger(__name__)

UPLOAD_POST_URL = "https://api.upload-post.com/api"

async def publish_to_instagram(db: AsyncSession, post: Post) -> str:
    """
    Publica um post (foto ou carrossel) no Instagram via Upload-Post API.
    Devolve o ID do post no Instagram.
    """

    # Modo mock — sem API key
    if not settings.UPLOAD_POST_API_KEY:
        logger.warning("[Publisher] Modo mock activo — sem UPLOAD_POST_API_KEY")
        return f"mock_post_{post.id}"

    # Buscar imagens do post
    media_result = await db.execute(
        select(Media)
        .where(Media.post_id == post.id)
        .order_by(Media.order_index)
    )
    media_list = media_result.scalars().all()

    if not media_list:
        raise ValueError("Post não tem imagens para publicar")

    # Construir caption com hashtags
    caption = build_caption(post.caption, post.hashtags)

    # Publicar consoante o tipo
    if post.type == "carousel":
        return await publish_carousel(media_list, caption, post.location_name)
    else:
        return await publish_photo(media_list[0], caption, post.location_name)

async def publish_photo(media: Media, caption: str, location: str | None) -> str:
    """Publica uma foto simples."""
    image_path = Path(media.processed_path or media.file_path)

    if not image_path.exists():
        raise FileNotFoundError(f"Imagem não encontrada: {image_path}")

    async with httpx.AsyncClient(timeout=60) as client:
        with open(image_path, "rb") as f:
            files = {"file": (image_path.name, f, "image/jpeg")}
            data = {
                "platforms": "instagram",
                "caption": caption,
            }
            if location:
                data["location"] = location

            response = await client.post(
                f"{UPLOAD_POST_URL}/upload",
                headers={"Authorization": f"Apikey {settings.UPLOAD_POST_API_KEY}"},
                data=data,
                files=files
            )

    return handle_response(response)

async def publish_carousel(media_list: list, caption: str, location: str | None) -> str:
    """Publica um carrossel de fotos."""
    async with httpx.AsyncClient(timeout=120) as client:
        files = []
        open_files = []

        try:
            for media in media_list:
                image_path = Path(media.processed_path or media.file_path)
                if not image_path.exists():
                    raise FileNotFoundError(f"Imagem não encontrada: {image_path}")
                f = open(image_path, "rb")
                open_files.append(f)
                files.append(("photos[]", (image_path.name, f, "image/jpeg")))

            data = {
                "platforms": "instagram",
                "caption": caption,
            }
            if location:
                data["location"] = location

            response = await client.post(
                f"{UPLOAD_POST_URL}/upload_photos",
                headers={"Authorization": f"Apikey {settings.UPLOAD_POST_API_KEY}"},
                data=data,
                files=files
            )

        finally:
            for f in open_files:
                f.close()

    return handle_response(response)

async def publish_story_to_instagram(db: AsyncSession, story: Post) -> str:
    """Publica uma story no Instagram."""

    if not settings.UPLOAD_POST_API_KEY:
        logger.warning("[Publisher] Modo mock — story não publicada")
        return f"mock_story_{story.id}"

    # Buscar imagem da story
    media_result = await db.execute(
        select(Media)
        .where(Media.post_id == story.parent_post_id)
        .order_by(Media.order_index)
    )
    media = media_result.scalars().first()

    if not media or not media.story_path:
        raise ValueError("Story não tem imagem processada")

    story_path = Path(media.story_path)
    if not story_path.exists():
        raise FileNotFoundError(f"Imagem de story não encontrada: {story_path}")

    async with httpx.AsyncClient(timeout=60) as client:
        with open(story_path, "rb") as f:
            response = await client.post(
                f"{UPLOAD_POST_URL}/upload",
                headers={"Authorization": f"Apikey {settings.UPLOAD_POST_API_KEY}"},
                data={
                    "platforms": "instagram",
                    "caption": "",
                    "story": "true"
                },
                files={"file": (story_path.name, f, "image/jpeg")}
            )

    return handle_response(response)

def handle_response(response: httpx.Response) -> str:
    """Processa a resposta da Upload-Post API."""

    if response.status_code == 429:
        raise Exception("Rate limit atingido — demasiados pedidos")

    if response.status_code == 401:
        raise Exception("API key inválida ou expirada")

    if response.status_code == 403:
        raise Exception("Sem permissão para publicar nesta conta")

    if response.status_code not in (200, 201):
        raise Exception(f"Erro da API ({response.status_code}): {response.text}")

    data = response.json()

    # Extrair ID do post
    post_id = (
        data.get("id") or
        data.get("post_id") or
        data.get("job_id") or
        str(data)
    )

    logger.info(f"[Publisher] Publicado com sucesso — ID: {post_id}")
    return str(post_id)

def build_caption(caption: str | None, hashtags: list | None) -> str:
    """Constrói a caption final com hashtags."""
    parts = []

    if caption:
        parts.append(caption)

    if hashtags:
        hashtag_str = " ".join(f"#{tag}" for tag in hashtags)
        parts.append(hashtag_str)

    return "\n\n".join(parts) if parts else ""
