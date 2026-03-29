"""
Application configuration — reads from .env file.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "FinSight AI"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./finsight.db"
    GROQ_API_KEY: str = ""
    NEWS_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ENV_PATH),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()