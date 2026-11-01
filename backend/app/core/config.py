from pathlib import Path
from typing import List, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(_BACKEND_DIR / ".env"),
            ".env",
            "backend/.env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "EduPulse SMS Backend"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database & PgBouncer
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/sms_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_STATEMENT_CACHE_SIZE: int = 0  # Required for PgBouncer transaction pooling

    # Redis & ARQ
    REDIS_URL: str = "redis://localhost:6380/0"
    CACHE_DEFAULT_TTL: int = 300

    # Security & Cryptography
    JWT_SECRET: str = "super-secret-dev-jwt-key-edupulse-sms-2026-production-ready"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_TOKEN_REMEMBER_DAYS: int = 30

    # Field-Level Encryption (AES-256-GCM 32-byte key in hex or raw)
    # Default 32-byte key: SHA256 of secret
    FIELD_ENCRYPTION_KEY: str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    BLIND_INDEX_SALT: str = "edupulse-blind-index-salt-2026"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 25

    # Multi-Tier Rate Limiting
    RATE_LIMIT_LOGIN_PER_MIN: int = 5
    RATE_LIMIT_LOGIN_PER_15MIN: int = 5
    RATE_LIMIT_AUTH_PER_MIN: int = 120
    RATE_LIMIT_BULK_PER_MIN: int = 30
    RATE_LIMIT_GENERAL_PER_MIN: int = 120

    # Jules Bug Automation
    JULES_API_KEY: Optional[str] = None
    JULES_REPO: str = "vaseemdane/sms"
    JULES_BRANCH: str = "main"
    JULES_API_URL: str = "https://jules.googleapis.com/v1alpha/sessions"


    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.APP_ENV == "production":
            if self.DEBUG:
                raise ValueError("DEBUG mode must be disabled in production.")
            if "dev-jwt-key" in self.JWT_SECRET or len(self.JWT_SECRET) < 32:
                raise ValueError("A secure, random JWT_SECRET is required in production.")
            if "0123456789abcdef" in self.FIELD_ENCRYPTION_KEY:
                raise ValueError("A unique FIELD_ENCRYPTION_KEY is required in production.")
        return self


settings = Settings()
