"""
Application configuration — reads from .env file.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "FinSight AI"
    DEBUG: bool = True
    APPWRITE_ENDPOINT: str = "https://sgp.cloud.appwrite.io/v1"
    APPWRITE_PROJECT_ID: str = "69c80e85002b588face1"
    APPWRITE_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    NEWS_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    APPWRITE_DATABASE_ID: str = "finzen" # Based on your project name
    APPWRITE_COLLECTION_PORTFOLIOS: str = "portfolios"
    APPWRITE_COLLECTION_HOLDINGS: str = "holdings"
    APPWRITE_COLLECTION_USERS: str = "users"
    APPWRITE_COLLECTION_NEWS: str = "news_articles"
    APPWRITE_COLLECTION_RISK: str = "country_risk_scores"
    APPWRITE_COLLECTION_ACCURACY: str = "source_accuracy"

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ENV_PATH),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()