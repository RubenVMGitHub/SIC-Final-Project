"""
RabbitMQ message consumers for processing events
"""
import json
import logging
from aio_pika import IncomingMessage
from datetime import datetime

from .models import FriendRequestEvent, LobbyJoinEvent, NotificationDB
from .database import mongodb

logger = logging.getLogger(__name__)


async def process_friend_request(message: IncomingMessage):
    """
    Process friend request event from User Service and create notification.
    
    Event structure:
    {
        "type": "friend.request.sent",
        "fromUserId": "...",
        "toUserId": "...",
        "createdAt": "2026-01-22T15:00:00Z"
    }
    """
    async with message.process():
        try:
            # Parse and validate event data
            data = json.loads(message.body.decode())
            logger.debug(f"📨 Received friend request event: {data}")
            
            event = FriendRequestEvent(**data)
            
            # Create notification document
            notification = NotificationDB(
                userId=event.toUserId,
                type="friend_request",
                fromUserId=event.fromUserId,
                message="You have a new friend request",
                createdAt=datetime.fromisoformat(event.createdAt.replace('Z', '+00:00'))
            )
            
            # Save to MongoDB
            result = await mongodb.db.notifications.insert_one(
                notification.model_dump(by_alias=True, exclude={"id"})
            )
            
            logger.info(
                f"Friend request notification created: "
                f"from={event.fromUserId} → to={event.toUserId} "
                f"(notif_id={result.inserted_id})",
                extra={
                    "event_type": "friend_request",
                    "from_user": event.fromUserId,
                    "to_user": event.toUserId,
                    "notification_id": str(result.inserted_id)
                }
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in friend request message: {e}")
            # Message will be requeued
            
        except Exception as e:
            logger.error(
                f"Error processing friend request: {e}",
                exc_info=True,
                extra={"event_data": data if 'data' in locals() else None}
            )
            # Message will be requeued due to exception in process() context


async def process_lobby_join(message: IncomingMessage):
    """
    Process lobby join event from Lobby Service and create notification.
    
    Event structure:
    {
        "type": "lobby.user.joined",
        "lobbyId": "...",
        "ownerId": "...",
        "playerId": "...",
        "lobbyName": "Football @ Central Park",
        "createdAt": "2026-01-22T15:02:00Z"
    }
    """
    async with message.process():
        try:
            # Parse and validate event data
            data = json.loads(message.body.decode())
            logger.debug(f"📨 Received lobby join event: {data}")
            
            event = LobbyJoinEvent(**data)
            
            # Create notification for lobby owner
            notification = NotificationDB(
                userId=event.ownerId,
                type="lobby_join",
                fromUserId=event.playerId,
                lobbyId=event.lobbyId,
                lobbyName=event.lobbyName,
                message=f"A player joined your lobby: {event.lobbyName}",
                createdAt=datetime.fromisoformat(event.createdAt.replace('Z', '+00:00'))
            )
            
            # Save to MongoDB
            result = await mongodb.db.notifications.insert_one(
                notification.model_dump(by_alias=True, exclude={"id"})
            )
            
            logger.info(
                f"Lobby join notification created: "
                f"player={event.playerId} → owner={event.ownerId} "
                f"lobby={event.lobbyName} (notif_id={result.inserted_id})",
                extra={
                    "event_type": "lobby_join",
                    "player_id": event.playerId,
                    "owner_id": event.ownerId,
                    "lobby_id": event.lobbyId,
                    "lobby_name": event.lobbyName,
                    "notification_id": str(result.inserted_id)
                }
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in lobby join message: {e}")
            
        except Exception as e:
            logger.error(
                f"Error processing lobby join: {e}",
                exc_info=True,
                extra={"event_data": data if 'data' in locals() else None}
            )