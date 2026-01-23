"""
Handles application lifecycle, routing, and event consumption.
"""
import asyncio
import signal
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import logging

from .config import settings
from .database import mongodb
from .rabbitmq import rabbitmq
from .consumers import process_friend_request, process_lobby_join
from .api.routes import router
from .logger import setup_logging

# Initialize structured logging
logger = setup_logging()
app_logger = logging.getLogger(__name__)

shutdown_event = asyncio.Event()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown procedures.
    """
    app_logger.info("=" * 60)
    app_logger.info("NOTIFICATION SERVICE STARTING")
    app_logger.info("=" * 60)
    app_logger.info(f"Service: {settings.SERVICE_NAME}")
    app_logger.info(f"Port: {settings.PORT}")
    app_logger.info(f"MongoDB: {settings.MONGODB_URI.split('@')[-1]}")  # Hide credentials
    app_logger.info(f"RabbitMQ: {settings.RABBITMQ_URL.split('@')[-1]}")  # Hide credentials
    app_logger.info(f"Log Level: {settings.LOG_LEVEL.upper()}")
    
    try:
        # Connect to MongoDB
        app_logger.info("Connecting to MongoDB...")
        await mongodb.connect()
        
        # Connect to RabbitMQ
        app_logger.info("Connecting to RabbitMQ...")
        await rabbitmq.connect()
        
        # Start consuming messages
        app_logger.info("Starting message consumers...")
        await rabbitmq.start_consuming(
            friend_callback=process_friend_request,
            lobby_callback=process_lobby_join
        )
        
        app_logger.info("=" * 60)
        app_logger.info("NOTIFICATION SERVICE STARTED SUCCESSFULLY")
        app_logger.info(f"API Documentation: http://localhost:{settings.PORT}/api-docs")
        app_logger.info(f"ReDoc: http://localhost:{settings.PORT}/redoc")
        app_logger.info("=" * 60)
        
    except Exception as e:
        app_logger.error("=" * 60)
        app_logger.error("STARTUP FAILED")
        app_logger.error("=" * 60)
        app_logger.error(f"Error: {e}", exc_info=True)
        raise
    
    # Wait for shutdown
    yield
    
    app_logger.info("=" * 60)
    app_logger.info("NOTIFICATION SERVICE SHUTTING DOWN")
    app_logger.info("=" * 60)
    
    await rabbitmq.close()
    await mongodb.close()
    
    app_logger.info("Shutdown complete")
    app_logger.info("=" * 60)


app = FastAPI(
    title="Notification Service API",
    description="""
## Sports Matchmaking Platform - Notification Service

Real-time notification service for the Sports Matchmaking Platform.

### Features
* **Friend Request Notifications** - Get notified when someone sends you a friend request
* **Lobby Join Notifications** - Lobby owners receive notifications when players join their lobbies
* **Real-time Processing** - Events processed via RabbitMQ message queue
* **Persistent Storage** - Notifications stored in MongoDB

### Authentication
All endpoints (except `/health`) require JWT authentication via Bearer token.

Include the token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

### Event Sources
- **Friend Requests**: Published by User Service
- **Lobby Joins**: Published by Lobby Service
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api-docs",
    redoc_url="/redoc",
    contact={
        "name": "API Support",
        "email": "support@sportsplatform.com"
    },
    license_info={
        "name": "ISC",
        "url": "https://opensource.org/licenses/ISC"
    },
    servers=[
        {
            "url": f"http://localhost:{settings.PORT}",
            "description": "Development server"
        },
        {
            "url": "http://localhost:3000",
            "description": "API Gateway"
        }
    ],
    openapi_tags=[
        {
            "name": "Health",
            "description": "Health check and service status endpoints"
        },
        {
            "name": "Notifications",
            "description": "Notification management operations"
        }
    ]
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing"""
    start_time = time.time()
    
    # Log request
    app_logger.info(
        f"→ {request.method} {request.url.path}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "query_params": str(request.query_params),
            "client_host": request.client.host if request.client else None
        }
    )
    
    # Process request
    try:
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = round((time.time() - start_time) * 1000, 2)
        
        # Log response
        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        app_logger.log(
            log_level,
            f"← {request.method} {request.url.path} - {response.status_code} - {duration_ms}ms",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms
            }
        )
        
        return response
        
    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        app_logger.error(
            f"← {request.method} {request.url.path} - ERROR - {duration_ms}ms - {str(e)}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "duration_ms": duration_ms,
                "error": str(e)
            },
            exc_info=True
        )
        raise


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions"""
    app_logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__
        },
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


def handle_shutdown(signum, frame):
    """Handle shutdown signals"""
    app_logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_event.set()


signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=False
    )