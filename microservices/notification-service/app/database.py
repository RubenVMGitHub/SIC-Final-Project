from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging
from .config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    
    client: Optional[AsyncIOMotorClient] = None
    db = None

    async def connect(self):
        """Establish connection to MongoDB and create indexes"""
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                maxPoolSize=50,
            )
            self.db = self.client[settings.MONGODB_DB_NAME]
            
            # Test connection
            await self.client.admin.command('ping')
            logger.info("✓ MongoDB connected successfully")
            
            # Create indexes for better query performance
            await self._create_indexes()
            
        except Exception as e:
            logger.error(f"✗ MongoDB connection failed: {e}")
            raise

    async def _create_indexes(self):
        """Create database indexes for optimal queries"""
        try:
            notifications = self.db.notifications
            
            # Compound index for user queries sorted by date
            await notifications.create_index([("userId", 1), ("createdAt", -1)])
            
            # Compound index for unread notifications
            await notifications.create_index([("userId", 1), ("isRead", 1)])
            
            logger.info("✓ Database indexes created")
        except Exception as e:
            logger.warning(f"Index creation warning: {e}")

    async def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    async def is_healthy(self) -> bool:
        try:
            if not self.client:
                return False
            await self.client.admin.command('ping')
            return True
        except Exception:
            return False

mongodb = MongoDB()