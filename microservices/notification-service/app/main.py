"""
Handles application lifecycle, routing, and event consumption.
"""
import asyncio
import logging
import signal
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import mongodb
from .rabbitmq import rabbitmq
from .consumers import process_friend_request, process_lobby_join
from .api.routes import router

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

shutdown_event = asyncio.Event()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown procedures.
    """
    logger.info("=" * 50)
    logger.info("NOTIFICATION SERVICE STARTING")
    logger.info("=" * 50)
    logger.info(f"Service: {settings.SERVICE_NAME}")
    logger.info(f"Port: {settings.PORT}")
    logger.info(f"MongoDB URI: {settings.MONGODB_URI}")
    logger.info(f"RabbitMQ URL: {settings.RABBITMQ_URL}")
    logger.info(f"Log Level: {settings.LOG_LEVEL}")
    
    try:
        # Connect to MongoDB
        logger.info("Connecting to MongoDB...")
        await mongodb.connect()
        
        # Connect to RabbitMQ
        logger.info("Connecting to RabbitMQ...")
        await rabbitmq.connect()
        
        # Start consuming messages
        logger.info("Starting message consumers...")
        await rabbitmq.start_consuming(
            friend_callback=process_friend_request,
            lobby_callback=process_lobby_join
        )
        
        logger.info("=" * 50)
        logger.info("✓ NOTIFICATION SERVICE STARTED SUCCESSFULLY")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error("=" * 50)
        logger.error("✗ STARTUP FAILED")
        logger.error("=" * 50)
        logger.error(f"Error: {e}", exc_info=True)
        raise
    
    # wait for shutdown
    yield
    
    logger.info("=" * 50)
    logger.info("NOTIFICATION SERVICE SHUTTING DOWN")
    logger.info("=" * 50)
    
    await rabbitmq.close()
    await mongodb.close()
    
    logger.info("✓ Shutdown complete")
    logger.info("=" * 50)


# FastAPI application
app = FastAPI(
    title="Notification Service",
    description="Real-time notification service for Sports Matchmaking Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api-docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(router)


def handle_shutdown(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_event.set()


signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower()
    )