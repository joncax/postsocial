import json
import re
import base64
from pathlib import Path
from config.settings import settings

def encode_image(image_path: Path) -> str:
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")

def mock_captions(draft_caption: str | None, location: str | None, is_carousel: bool) -> dict:
    """Devolve captions de exemplo quando não há API key."""
    location_text = f" em {location}" if location else ""
    carousel_text = " Desliza para ver mais! 👉" if is_carousel else ""
    base = draft_caption or f"Um momento especial{location_text}.{carousel_text}"

    return {
        "caption_v1": f"{base} ✨ Que dia incrível!",
        "caption_v2": f"{base} Uma experiência verdadeiramente memorável.",
        "caption_v3": f"{base} 🔥 O que achas? Comenta abaixo! 👇",
        "hashtags_v1": ["photography", "lifestyle", "instagood", "picoftheday", "photooftheday"],
        "hashtags_v2": ["photography", "elegance", "quality", "professional", "style"],
        "hashtags_v3": ["viral", "trending", "follow", "like", "explore", "fyp", "reels"]
    }

async def generate_captions(
    image_paths: list[Path],
    draft_caption: str | None = None,
    tone: str = "casual",
    location: str | None = None,
    is_carousel: bool = False
) -> dict:
    """
    Gera 3 variações de caption.
    - Com API key: usa o Claude
    - Sem API key: devolve mock para desenvolvimento
    """

    # Modo mock — sem API key
    if not settings.ANTHROPIC_API_KEY:
        print("[AI] Modo mock activo — sem ANTHROPIC_API_KEY")
        return mock_captions(draft_caption, location, is_carousel)

    # Modo real — com API key
    import anthropic
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    TONES = {
        "casual":       "Descontraído, amigável, próximo do público. Usa emojis com moderação.",
        "professional": "Profissional, elegante, sofisticado. Sem emojis excessivos.",
        "engagement":   "Focado em maximizar engagement. Usa call-to-action, perguntas ao público, emojis estratégicos."
    }

    context_parts = []
    if draft_caption:
        context_parts.append(f"Rascunho do utilizador: '{draft_caption}'")
    if location:
        context_parts.append(f"Localização: {location}")
    if is_carousel:
        context_parts.append(f"Carrossel com {len(image_paths)} imagens.")
    context = "\n".join(context_parts)

    content = []
    for i, image_path in enumerate(image_paths[:4]):
        if not Path(image_path).exists():
            continue
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": encode_image(Path(image_path))
            }
        })
        if is_carousel:
            content.append({"type": "text", "text": f"[Imagem {i+1} do carrossel]"})

    prompt = f"""Analisa {'estas imagens' if len(image_paths) > 1 else 'esta imagem'} e gera 3 variações de caption para Instagram.

{context}

Variação 1 — Tom: {TONES['casual']}
Variação 2 — Tom: {TONES['professional']}
Variação 3 — Tom: {TONES['engagement']}

Regras:
- Máximo 2200 caracteres
- Português de Portugal
- 5-10 hashtags por variação (sem o símbolo #)
{f'- Melhora o rascunho fornecido para cada variação.' if draft_caption else ''}

Responde APENAS em JSON:
{{
    "caption_v1": "...",
    "caption_v2": "...",
    "caption_v3": "...",
    "hashtags_v1": ["..."],
    "hashtags_v2": ["..."],
    "hashtags_v3": ["..."]
}}"""

    content.append({"type": "text", "text": prompt})

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": content}]
    )

    response_text = response.content[0].text
    response_text = re.sub(r'```json\s*', '', response_text)
    response_text = re.sub(r'```\s*', '', response_text)
    response_text = response_text.strip()

    return json.loads(response_text)
