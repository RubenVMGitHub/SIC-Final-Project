from fastapi import APIRouter, HTTPException, Path, Header, status
from fastapi.responses import JSONResponse
from typing import Optional, Annotated
from datetime import datetime
from bson import ObjectId
from jose import JWTError, jwt
import logging

from ..models import (
    FriendRequestNotification,
    LobbyJoinNotification,
    NotificationsListResponse,
    HealthResponse,
    MarkReadResponse
)
from ..database import mongodb
from ..rabbitmq import rabbitmq
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def verify_token(authorization: Optional[str] = Header(None)) -> str:
    """Verify JWT token and extract user ID"""
    if not authorization:
        logger.warning("Authentication failed: No token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )
    
    try:
        token = authorization.split(" ")[1] if " " in authorization else authorization
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        
        if not user_id:
            logger.warning("Authentication failed: Invalid token (no sub claim)")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        logger.debug(f"User authenticated: {user_id}")
        return user_id
        
    except JWTError as e:
        logger.error(f"JWT verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check endpoint",
    description="""
    Check the health status of the Notification Service and its dependencies.
    
    Returns:
    - Service status (ok/degraded)
    - MongoDB connection status
    - RabbitMQ connection status
    - Current timestamp
    
    This endpoint does not require authentication.
    """,
    responses={
        200: {
            "description": "Service is healthy or degraded",
            "content": {
                "application/json": {
                    "examples": {
                        "healthy": {
                            "summary": "All systems operational",
                            "value": {
                                "status": "ok",
                                "service": "notification-service",
                                "rabbitmq": True,
                                "mongo": True,
                                "timestamp": "2026-01-23T10:00:00Z"
                            }
                        },
                        "degraded": {
                            "summary": "Some systems down",
                            "value": {
                                "status": "degraded",
                                "service": "notification-service",
                                "rabbitmq": False,
                                "mongo": True,
                                "timestamp": "2026-01-23T10:00:00Z"
                            }
                        }
                    }
                }
            }
        }
    }
)
async def health_check():
    """Health check endpoint"""
    logger.debug("Health check requested")
    
    mongo_healthy = await mongodb.is_healthy()
    rabbitmq_healthy = await rabbitmq.is_healthy()
    
    status_code = "ok" if (mongo_healthy and rabbitmq_healthy) else "degraded"
    
    if status_code == "degraded":
        logger.warning(
            f"Service degraded - MongoDB: {mongo_healthy}, RabbitMQ: {rabbitmq_healthy}"
        )
    
    return HealthResponse(
        status=status_code,
        service=settings.SERVICE_NAME,
        rabbitmq=rabbitmq_healthy,
        mongo=mongo_healthy
    )


@router.get(
    "/notifications/me",
    response_model=NotificationsListResponse,
    tags=["Notifications"],
    summary="Get my notifications",
    description="""
    Fetch all unread notifications for the authenticated user.
    
    **Authentication Required**: Yes (JWT Bearer token)
    
    Returns:
    - List of unread notifications (max 50)
    - Total count of returned notifications
    - Count of all unread notifications
    
    Notification types:
    - `friend_request`: Someone sent you a friend request
    - `lobby_join`: A player joined your lobby
    
    Notifications are sorted by creation date (newest first).
    """,
    responses={
        200: {
            "description": "List of notifications retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "notifications": [
                            {
                                "_id": "507f1f77bcf86cd799439011",
                                "type": "friend_request",
                                "fromUserId": "507f1f77bcf86cd799439013",
                                "message": "You have a new friend request",
                                "isRead": False,
                                "createdAt": "2026-01-22T15:00:00Z"
                            },
                            {
                                "_id": "507f1f77bcf86cd799439012",
                                "type": "lobby_join",
                                "playerId": "507f1f77bcf86cd799439014",
                                "lobbyId": "507f1f77bcf86cd799439015",
                                "lobbyName": "Football @ Central Park",
                                "message": "A player joined your lobby: Football @ Central Park",
                                "isRead": False,
                                "createdAt": "2026-01-22T15:02:00Z"
                            }
                        ],
                        "total": 2,
                        "unreadCount": 2
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - Invalid or missing token",
            "content": {
                "application/json": {
                    "example": {"detail": "No token provided"}
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to fetch notifications"}
                }
            }
        }
    }
)
async def get_my_notifications(
    authorization: Annotated[Optional[str], Header()] = None
):
    """Get unread notifications for the authenticated user"""
    user_id = verify_token(authorization)
    
    logger.info(f"Fetching notifications for user: {user_id}")
    
    try:
        cursor = mongodb.db.notifications.find(
            {"userId": user_id, "isRead": False}
        ).sort("createdAt", -1).limit(50)
        
        notifications = []
        async for doc in cursor:
            # Format based on notification type
            if doc["type"] == "friend_request":
                notifications.append(FriendRequestNotification(
                    _id=str(doc["_id"]),
                    type=doc["type"],
                    fromUserId=doc["fromUserId"],
                    message=doc["message"],
                    isRead=doc["isRead"],
                    createdAt=doc["createdAt"]
                ))
            elif doc["type"] == "lobby_join":
                notifications.append(LobbyJoinNotification(
                    _id=str(doc["_id"]),
                    type=doc["type"],
                    playerId=doc["fromUserId"],
                    lobbyId=doc.get("lobbyId", ""),
                    lobbyName=doc.get("lobbyName", ""),
                    message=doc["message"],
                    isRead=doc["isRead"],
                    createdAt=doc["createdAt"]
                ))
        
        total = len(notifications)
        unread_count = await mongodb.db.notifications.count_documents(
            {"userId": user_id, "isRead": False}
        )
        
        logger.info(
            f"Retrieved {total} notifications for user {user_id} "
            f"(unread: {unread_count})"
        )
        
        return NotificationsListResponse(
            notifications=notifications,
            total=total,
            unreadCount=unread_count
        )
        
    except Exception as e:
        logger.error(
            f"Error fetching notifications for user {user_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notifications"
        )


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=MarkReadResponse,
    tags=["Notifications"],
    summary="Mark notification as read",
    description="""
    Mark a specific notification as read.
    
    **Authentication Required**: Yes (JWT Bearer token)
    
    Only the owner of the notification can mark it as read.
    Once marked as read, the notification will no longer appear in the unread list.
    
    **Path Parameters**:
    - `notification_id`: MongoDB ObjectId of the notification
    
    **Authorization**:
    - User must own the notification (verified via JWT token)
    """,
    responses={
        200: {
            "description": "Notification marked as read successfully",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Notification marked as read successfully",
                        "notificationId": "507f1f77bcf86cd799439011",
                        "isRead": True
                    }
                }
            }
        },
        400: {
            "description": "Invalid notification ID format",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid notification ID format"}
                }
            }
        },
        401: {
            "description": "Unauthorized - Invalid or missing token",
            "content": {
                "application/json": {
                    "example": {"detail": "No token provided"}
                }
            }
        },
        403: {
            "description": "Forbidden - Cannot modify other users' notifications",
            "content": {
                "application/json": {
                    "example": {"detail": "Cannot modify other users' notifications"}
                }
            }
        },
        404: {
            "description": "Notification not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Notification not found"}
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to update notification"}
                }
            }
        }
    }
)
async def mark_notification_read(
    notification_id: Annotated[str, Path(description="Notification ID (MongoDB ObjectId)")],
    authorization: Annotated[Optional[str], Header()] = None
):
    """Mark a notification as read"""
    authenticated_user_id = verify_token(authorization)
    
    logger.info(
        f"Marking notification as read: {notification_id} by user {authenticated_user_id}"
    )
    
    try:
        # Validate notification_id format
        if not ObjectId.is_valid(notification_id):
            logger.warning(f"Invalid notification ID format: {notification_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid notification ID format"
            )
        
        # Get notification to verify ownership
        notification = await mongodb.db.notifications.find_one(
            {"_id": ObjectId(notification_id)}
        )
        
        if not notification:
            logger.warning(f"Notification not found: {notification_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        # Verify user owns this notification
        if notification["userId"] != authenticated_user_id:
            logger.warning(
                f"Unauthorized attempt to mark notification {notification_id} "
                f"by user {authenticated_user_id} (owner: {notification['userId']})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify other users' notifications"
            )
        
        # Update notification
        result = await mongodb.db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"isRead": True}}
        )
        
        if result.modified_count == 0:
            logger.debug(f"Notification {notification_id} was already read")
        else:
            logger.info(
                f"Notification {notification_id} marked as read "
                f"for user {authenticated_user_id}"
            )
        
        return MarkReadResponse(
            message="Notification marked as read successfully",
            notificationId=notification_id,
            isRead=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error marking notification {notification_id} as read: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification"
        )