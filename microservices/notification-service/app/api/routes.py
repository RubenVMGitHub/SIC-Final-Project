from fastapi import APIRouter, HTTPException, Path, Header
from typing import Optional
from datetime import datetime
from bson import ObjectId
from jose import JWTError, jwt
from ..models import (FriendRequestNotification, LobbyJoinNotification, NotificationsListResponse, HealthResponse, MarkReadResponse)
from ..database import mongodb
from ..rabbitmq import rabbitmq
from ..config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def verify_token(authorization: Optional[str] = Header(None)) -> str:
    """Verify JWT token and extract user ID"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")
    
    try:
        token = authorization.split(" ")[1] if " " in authorization else authorization
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return user_id
    except JWTError as e:
        logger.error(f"JWT verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check endpoint",
    description="Check the health status of the Notification Service and its dependencies"
)
async def health_check():
    mongo_healthy = await mongodb.is_healthy()
    rabbitmq_healthy = await rabbitmq.is_healthy()
    
    status = "ok" if (mongo_healthy and rabbitmq_healthy) else "degraded"
    
    return HealthResponse(
        status=status,
        service=settings.SERVICE_NAME,
        rabbitmq=rabbitmq_healthy,
        mongo=mongo_healthy
    )

@router.get(
    "/notifications/me",
    response_model=NotificationsListResponse,
    tags=["Notifications"],
    summary="Get my notifications",
    description="Fetch all unread notifications for the authenticated user (limit 50)"
)
async def get_my_notifications(
    authorization: Optional[str] = Header(None)
):
    # Gets unread notifications for the authenticated user.
    
    user_id = verify_token(authorization)
    
    try:
        cursor = mongodb.db.notifications.find(
            {"userId": user_id, "isRead": False}
        ).sort("createdAt", -1).limit(50)
        
        notifications = []
        async for doc in cursor:
            # Formato based on the type of notif
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
        
        logger.info(f"Retrieved {total} notifications for user {user_id}")
        
        return NotificationsListResponse(
            notifications=notifications,
            total=total,
            unreadCount=unread_count
        )
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=MarkReadResponse,
    tags=["Notifications"],
    summary="Mark notification as read",
    description="Mark a specific notification as read (requires authentication)"
)
async def mark_notification_read(
    notification_id: str = Path(..., description="Notification ID to mark as read"),
    authorization: Optional[str] = Header(None)
):
    
    # Mark a notification as read.
    """"
    Raises:
    401: If authentication fails
    400: If notification_id format is invalid
    403: If trying to mark another user's notification
    404: If notification not found
    """
    authenticated_user_id = verify_token(authorization)
    
    try:
        # Validate notification_id format
        if not ObjectId.is_valid(notification_id):
            raise HTTPException(status_code=400, detail="Invalid notification ID format")
        
        # Get notification to verify ownership
        notification = await mongodb.db.notifications.find_one(
            {"_id": ObjectId(notification_id)}
        )
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Verify user owns this notification
        if notification["userId"] != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Cannot modify other users' notifications")
        
        # Update notification
        result = await mongodb.db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"isRead": True}}
        )
        
        if result.modified_count == 0:
            logger.warning(f"Notification {notification_id} was already read")
        
        logger.info(f"Marked notification {notification_id} as read for user {authenticated_user_id}")
        
        return MarkReadResponse(
            message="Notification marked as read successfully",
            notificationId=notification_id,
            isRead=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update notification")