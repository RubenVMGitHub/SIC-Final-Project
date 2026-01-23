from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    SERVICE_NAME: str = "notification-service"
    PORT: int = 3004
    LOG_LEVEL: str = "info"
    
    MONGODB_URI: str = "mongodb://root:root@mongo-notifications:27017/notifications-db?authSource=admin"
    MONGODB_DB_NAME: str = "notifications-db"
    
    RABBITMQ_URL: str = "amqp://guest:guest@rabbitmq:5672/"
    RABBITMQ_FRIEND_QUEUE: str = "friend.requests"
    RABBITMQ_LOBBY_QUEUE: str = "lobby.events"
    RABBITMQ_PREFETCH_COUNT: int = 10
    RABBITMQ_RECONNECT_DELAY: int = 5
    
    JWT_SECRET: str = "your_jwt_secret_here_change_this_in_production"
    
    HEALTH_CHECK_TIMEOUT: int = 5
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()