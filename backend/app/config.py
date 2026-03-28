"""
Application configuration — reads from .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "FinSight AI"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./finsight.db"
    GROQ_API_KEY: str = ""
    NEWS_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()