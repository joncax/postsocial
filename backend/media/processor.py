from PIL import Image
import os
from pathlib import Path

# Pastas
UPLOAD_DIR    = Path("media/uploads")
PROCESSED_DIR = Path("media/processed")
STORIES_DIR   = Path("media/stories")

# Limites Instagram
MAX_FILE_SIZE   = 8 * 1024 * 1024  # 8 MB
MIN_WIDTH       = 320
MAX_WIDTH       = 1440
ALLOWED_FORMATS = {"JPEG", "PNG", "JPG"}

# Rácio story (9:16)
STORY_WIDTH  = 1080
STORY_HEIGHT = 1920

def validate_image(file_path: Path) -> dict:
    """Valida se a imagem cumpre os requisitos do Instagram."""
    errors = []

    # Tamanho do ficheiro
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE:
        errors.append(f"Ficheiro demasiado grande: {file_size / 1024 / 1024:.1f}MB (máx 8MB)")

    # Formato e dimensões
    try:
        with Image.open(file_path) as img:
            if img.format not in ALLOWED_FORMATS:
                errors.append(f"Formato não suportado: {img.format}. Use JPG ou PNG.")

            width, height = img.size
            if width < MIN_WIDTH:
                errors.append(f"Imagem demasiado pequena: {width}px (mín {MIN_WIDTH}px)")
            if width > MAX_WIDTH:
                # Não é erro — vai ser redimensionada
                pass

            # Verificar rácio
            ratio = width / height
            if ratio < 0.8 or ratio > 1.91:
                errors.append(f"Rácio inválido: {ratio:.2f} (aceite: 0.8 a 1.91)")

    except Exception as e:
        errors.append(f"Erro ao ler imagem: {str(e)}")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "file_size": file_size
    }

def process_image(file_path: Path, post_id: str, order_index: int = 0) -> dict:
    """Processa a imagem para publicação no Instagram."""
    with Image.open(file_path) as img:
        # Converter para RGB se necessário (ex: PNG com transparência)
        if img.mode in ("RGBA", "P", "LA"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        width, height = img.size

        # Redimensionar se necessário
        if width > MAX_WIDTH:
            ratio = MAX_WIDTH / width
            new_height = int(height * ratio)
            img = img.resize((MAX_WIDTH, new_height), Image.LANCZOS)
            width, height = img.size

        # Guardar imagem processada
        processed_filename = f"{post_id}_{order_index}_processed.jpg"
        processed_path = PROCESSED_DIR / processed_filename
        img.save(processed_path, "JPEG", quality=92, optimize=True)

        # Criar versão para story (9:16 com blur)
        story_path = create_story_image(img, post_id, order_index)

        return {
            "processed_path": str(processed_path),
            "story_path": str(story_path),
            "width": width,
            "height": height,
            "file_size": os.path.getsize(processed_path)
        }

def create_story_image(img: Image.Image, post_id: str, order_index: int) -> Path:
    """Cria versão 9:16 com fundo desfocado para story."""
    from PIL import ImageFilter

    # Canvas da story
    story = Image.new("RGB", (STORY_WIDTH, STORY_HEIGHT), (0, 0, 0))

    # Fundo — imagem redimensionada para cobrir o canvas e desfocada
    bg = img.copy()
    bg = bg.resize((STORY_WIDTH, STORY_HEIGHT), Image.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(radius=20))

    # Escurecer ligeiramente o fundo
    overlay = Image.new("RGB", (STORY_WIDTH, STORY_HEIGHT), (0, 0, 0))
    bg = Image.blend(bg, overlay, alpha=0.3)

    story.paste(bg)

    # Imagem original ao centro (com padding)
    padding = 80
    max_w = STORY_WIDTH - (padding * 2)
    max_h = STORY_HEIGHT - (padding * 2)

    img_ratio = img.width / img.height
    if img_ratio > max_w / max_h:
        new_w = max_w
        new_h = int(max_w / img_ratio)
    else:
        new_h = max_h
        new_w = int(max_h * img_ratio)

    img_resized = img.resize((new_w, new_h), Image.LANCZOS)

    # Centrar
    x = (STORY_WIDTH - new_w) // 2
    y = (STORY_HEIGHT - new_h) // 2
    story.paste(img_resized, (x, y))

    # Guardar
    story_filename = f"{post_id}_{order_index}_story.jpg"
    story_path = STORIES_DIR / story_filename
    story.save(story_path, "JPEG", quality=92, optimize=True)

    return story_path
