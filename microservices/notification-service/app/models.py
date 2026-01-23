from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Literal, Union
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


# RabbitMQ event models

class FriendRequestEvent(BaseModel):
    """Event received when a friend request is sent"""
    type: Literal["friend.request.sent"]
    fromUserId: str
    toUserId: str
    createdAt: str


class LobbyJoinEvent(BaseModel):
    """Event received when a user joins a lobby"""
    type: Literal["lobby.user.joined"]
    lobbyId: str
    ownerId: str
    playerId: str
    lobbyName: str
    createdAt: str


# MongoDB document models

class NotificationDB(BaseModel):
    """MongoDB notification document schema"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    userId: str
    type: Literal["friend_request", "lobby_join"]
    fromUserId: str
    lobbyId: Optional[str] = None
    lobbyName: Optional[str] = None
    message: str
    isRead: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)


# API response models

class FriendRequestNotification(BaseModel):
    """Friend request notification response"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(alias="_id")
    type: Literal["friend_request"]
    fromUserId: str
    message: str
    isRead: bool
    createdAt: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "type": "friend_request",
                "fromUserId": "507f1f77bcf86cd799439013",
                "message": "You have a new friend request",
                "isRead": False,
                "createdAt": "2026-01-22T15:00:00Z"
            }
        }
    )


class LobbyJoinNotification(BaseModel):
    """Lobby join notification response"""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(alias="_id")
    type: Literal["lobby_join"]
    playerId: str
    lobbyId: str
    lobbyName: str
    message: str
    isRead: bool
    createdAt: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "_id": "507f1f77bcf86cd799439012",
                "type": "lobby_join",
                "playerId": "507f1f77bcf86cd799439014",
                "lobbyId": "507f1f77bcf86cd799439015",
                "lobbyName": "Football @ Central Park",
                "message": "A player joined your lobby: Football @ Central Park",
                "isRead": False,
                "createdAt": "2026-01-22T15:02:00Z"
            }
        }
    )


# joint type for notifications listing
NotificationResponse = Union[FriendRequestNotification, LobbyJoinNotification]


class NotificationsListResponse(BaseModel):
    """Response containing list of notifications"""
    notifications: list[NotificationResponse]
    total: int
    unreadCount: int


class MarkReadResponse(BaseModel):
    """Response for marking notification as read"""
    message: str
    notificationId: str
    isRead: bool


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    rabbitmq: bool
    mongo: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)