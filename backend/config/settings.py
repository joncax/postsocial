from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_ENV: str = "staging"
    APP_SECRET_KEY: str = "change_this"

    # Base de dados
    DATABASE_URL: str

    # Upload-Post API
    UPLOAD_POST_API_KEY: Optional[str] = None

    # Claude AI — opcional, sem key usa modo mock
    ANTHROPIC_API_KEY: Optional[str] = None

    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    ALERT_EMAIL: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
