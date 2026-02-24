"""
SecureVault OS - Configuration Module
Centralizes all application configuration including security settings,
database paths, JWT parameters, and encryption defaults.
"""

import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", os.urandom(32).hex())
    DEBUG = False
    TESTING = False

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'securevault.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", os.urandom(32).hex())
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Redis
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # File Storage
    ENCRYPTED_STORAGE_DIR = os.path.join(BASE_DIR, "encrypted_storage")
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB max upload

    # Security
    MAX_FAILED_LOGINS = 5
    ACCOUNT_LOCK_DURATION = 900  # 15 minutes in seconds
    OTP_EXPIRY = 300  # 5 minutes
    SECURE_DELETE_PASSES = 3

    # Scheduler
    CLEANUP_INTERVAL_MINUTES = 5


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
