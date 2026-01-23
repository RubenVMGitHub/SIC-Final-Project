import aio_pika
from aio_pika import Connection, Channel, Queue
from typing import Optional, Callable
import logging
import asyncio
from .config import settings

logger = logging.getLogger(__name__)


class RabbitMQ:
    """RabbitMQ connection and queue manager"""
    
    connection: Optional[Connection] = None
    channel: Optional[Channel] = None
    friend_queue: Optional[Queue] = None
    lobby_queue: Optional[Queue] = None
    is_connected: bool = False

    async def connect(self):
        """Establishes connection to RabbitMQ with retry logic"""
        retry_count = 0
        max_retries = 10

        while retry_count < max_retries:
            try:
                logger.info(f"Connecting to RabbitMQ (attempt {retry_count + 1}/{max_retries})...")
                
                # auto-reconnects
                self.connection = await aio_pika.connect_robust(
                    settings.RABBITMQ_URL,
                    timeout=10,
                )
                
                # Channel with QoS settings
                self.channel = await self.connection.channel()
                await self.channel.set_qos(prefetch_count=settings.RABBITMQ_PREFETCH_COUNT)
                
                # Declare durable queues
                self.friend_queue = await self.channel.declare_queue(
                    settings.RABBITMQ_FRIEND_QUEUE,
                    durable=True,
                )
                
                self.lobby_queue = await self.channel.declare_queue(
                    settings.RABBITMQ_LOBBY_QUEUE,
                    durable=True,
                )
                
                self.is_connected = True
                logger.info("✓ RabbitMQ connected successfully")
                logger.info(f"  - Friend queue: {settings.RABBITMQ_FRIEND_QUEUE}")
                logger.info(f"  - Lobby queue: {settings.RABBITMQ_LOBBY_QUEUE}")
                return
                
            except Exception as e:
                retry_count += 1
                logger.error(f"✗ RabbitMQ connection failed: {e}")
                
                if retry_count >= max_retries:
                    logger.error("Max retries reached. Service cannot start without RabbitMQ.")
                    raise
                
                logger.info(f"Retrying in {settings.RABBITMQ_RECONNECT_DELAY} seconds...")
                await asyncio.sleep(settings.RABBITMQ_RECONNECT_DELAY)

    async def start_consuming(
        self,
        friend_callback: Callable,
        lobby_callback: Callable
    ):
        """Start consuming messages from both queues"""
        if not self.is_connected:
            raise RuntimeError("RabbitMQ not connected")

        logger.info("Starting message consumption...")
        
        # Start consuming friend requests
        await self.friend_queue.consume(friend_callback)
        logger.info(f"✓ Consuming from {settings.RABBITMQ_FRIEND_QUEUE}")
        
        # Start consuming lobby events
        await self.lobby_queue.consume(lobby_callback)
        logger.info(f"✓ Consuming from {settings.RABBITMQ_LOBBY_QUEUE}")

    async def close(self):
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            self.is_connected = False
            logger.info("RabbitMQ connection closed")

    async def is_healthy(self) -> bool:
        """Check if RabbitMQ connection is healthy"""
        try:
            return self.is_connected and not self.connection.is_closed
        except Exception:
            return False

rabbitmq = RabbitMQ()