import json
import logging
from aio_pika import IncomingMessage
from datetime import datetime
from .models import FriendRequestEvent, LobbyJoinEvent, NotificationDB
from .database import mongodb

logger = logging.getLogger(__name__)


async def process_friend_request(message: IncomingMessage):
    """
    Gets friend request event from User Service and creates a notification for the recipient user.
    """
    async with message.process():
        try:
            # Parse and validate event data
            data = json.loads(message.body.decode())
            event = FriendRequestEvent(**data)
            
            # Create notification document
            notification = NotificationDB(
                userId=event.toUserId,
                type="friend_request",
                fromUserId=event.fromUserId,
                message=f"You have a new friend request",
                createdAt=datetime.fromisoformat(event.createdAt.replace('Z', '+00:00'))
            )
            
            # Save to MongoDB
            result = await mongodb.db.notifications.insert_one(
                notification.model_dump(by_alias=True, exclude={"id"})
            )
            
            logger.info(
                f"✓ Friend request notification created: "
                f"{event.fromUserId} → {event.toUserId} (ID: {result.inserted_id})"
            )
            
        except Exception as e:
            logger.error(f"✗ Error processing friend request: {e}", exc_info=True)
            # Message will be requeued automatically due to exception in process() context


async def process_lobby_join(message: IncomingMessage):
    """
    Gets lobby join event from Lobby Service and creates a notification for the lobby owner.
    """
    async with message.process():
        try:
            # Parse and validate event data
            data = json.loads(message.body.decode())
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
                f"Player {event.playerId} → Owner {event.ownerId} in {event.lobbyName} "
                f"(ID: {result.inserted_id})"
            )
            
        except Exception as e:
            logger.error(f"✗ Error processing lobby join: {e}", exc_info=True)
