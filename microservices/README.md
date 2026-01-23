# SIC Final Project - Sports Lobby & Rating System

A microservices-based application for organizing sports activities, managing friendships, and rating players.

## 🏗️ Architecture

This project consists of 5 microservices:

- **User Service** (Port 3001) - User authentication, profiles, and friend management
- **Lobby Service** (Port 3002) - Sports lobby creation and management
- **Rating Service** (Port 3003) - Player rating system (GraphQL)
- **Notification Service** (Port 3004) - Real-time notifications (Socket.IO)
- **API Gateway** (Port 3000) - Routes requests to appropriate services

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### Running the Application

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SIC-Final-Project
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Seed the database** (automatic on first run)
   The seed container will automatically populate the database with test data.

4. **Access the services**
   - API Gateway: http://localhost:3000
   - User Service Swagger: http://localhost:3001/api-docs
   - GraphQL Playground: http://localhost:3003/graphql

### Stopping the Application

```bash
docker-compose down
```

To remove all data:
```bash
docker-compose down -v
```

## 👤 Test Accounts

### Main Test User (Recommended for Testing)
- **Email:** `john.doe@test.com`
- **Password:** `Test123!`
- **Display Name:** John Doe
- **Favourite Sport:** Football

### Secondary Test User
- **Email:** `jane.smith@test.com`
- **Password:** `Test123!`
- **Display Name:** Jane Smith
- **Favourite Sport:** Basketball

### Additional Users
All passwords are `Test123!`:
- `mike.wilson@test.com` - Mike Wilson (Tennis)
- `sarah.jones@test.com` - Sarah Jones (Football)
- `alex.brown@test.com` - Alex Brown (Volleyball)
- `emma.davis@test.com` - Emma Davis (Swimming)
- `chris.taylor@test.com` - Chris Taylor (Basketball)
- `lisa.anderson@test.com` - Lisa Anderson (Running)

## 📚 API Documentation

### User Service (REST)

**Base URL:** `http://localhost:3000/users` (via Gateway) or `http://localhost:3001/users` (direct)

#### Authentication

**Register**
```bash
POST /users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe",
  "favouriteSport": "Football"
}
```

**Login**
```bash
POST /users/login
Content-Type: application/json

{
  "email": "john.doe@test.com",
  "password": "Test123!"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Profile Management

**Get My Profile**
```bash
GET /users/me
Authorization: Bearer {token}
```

**Update My Profile**
```bash
PATCH /users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "displayName": "New Name",
  "favouriteSport": "Basketball"
}
```

**Update User by ID**
```bash
PATCH /users/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "displayName": "Updated Name"
}
```

#### Friend Management

**Send Friend Request**
```bash
POST /users/friend-requests
Authorization: Bearer {token}
Content-Type: application/json

{
  "toUserId": "507f1f77bcf86cd799439011"
}
```

**Get Pending Friend Requests**
```bash
GET /users/friend-requests
Authorization: Bearer {token}
```

**Accept/Reject Friend Request**
```bash
POST /users/friend-requests/{userId}/resolve
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "accept"  // or "reject"
}
```

**Remove Friend**
```bash
DELETE /users/friends/{friendId}
Authorization: Bearer {token}
```

### Lobby Service (REST)

**Base URL:** `http://localhost:3000/lobbies` (via Gateway) or `http://localhost:3002/lobbies` (direct)

#### Lobby Management

**Create Lobby**
```bash
POST /lobbies
Authorization: Bearer {token}
Content-Type: application/json

{
  "sport": "Football",
  "location": "Central Park",
  "time": "2026-01-25T18:00:00Z",
  "maxPlayers": 10,
  "description": "Friendly match"
}
```

**Get All Lobbies**
```bash
GET /lobbies?sport=Football&status=OPEN
```

**Get Lobby by ID**
```bash
GET /lobbies/{lobbyId}
```

**Update Lobby**
```bash
PATCH /lobbies/{lobbyId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "location": "New Location",
  "maxPlayers": 12
}
```

**Join Lobby**
```bash
POST /lobbies/{lobbyId}/join
Authorization: Bearer {token}
```

**Leave Lobby**
```bash
POST /lobbies/{lobbyId}/leave
Authorization: Bearer {token}
```

**Kick Player** (Owner only)
```bash
DELETE /lobbies/{lobbyId}/players/{playerId}
Authorization: Bearer {token}
```

**Finish Lobby** (Owner only)
```bash
PATCH /lobbies/{lobbyId}/finish
Authorization: Bearer {token}
```

**Delete Lobby** (Owner only)
```bash
DELETE /lobbies/{lobbyId}
Authorization: Bearer {token}
```

### Rating Service (GraphQL)

**Base URL:** `http://localhost:3000/graphql` (via Gateway) or `http://localhost:3003/graphql` (direct)

#### Rating Types & Categories

**LIKE Categories:**
- `Friendly`
- `Communicative`
- `Sporty`
- `Fair`

**DISLIKE Categories:**
- `Toxic`
- `Aggressive`
- `Sloppy`
- `Unfair`

## 🧪 Testing Workflow

### 1. Authentication Flow

```bash
# Login as John Doe
TOKEN=$(curl -s -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@test.com","password":"Test123!"}' \
  | jq -r '.token')

# Get profile
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Create and Join Lobby

```bash
# Create lobby
LOBBY_ID=$(curl -s -X POST http://localhost:3000/lobbies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sport":"Football",
    "location":"Test Stadium",
    "time":"2026-01-30T18:00:00Z",
    "maxPlayers":10,
    "description":"Test match"
  }' | jq -r '._id')

# Login as Jane
TOKEN2=$(curl -s -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane.smith@test.com","password":"Test123!"}' \
  | jq -r '.token')

# Jane joins lobby
curl -X POST http://localhost:3000/lobbies/$LOBBY_ID/join \
  -H "Authorization: Bearer $TOKEN2"
```

### 3. Finish Lobby and Rate Players

```bash
# Finish lobby (as owner)
curl -X PATCH http://localhost:3000/lobbies/$LOBBY_ID/finish \
  -H "Authorization: Bearer $TOKEN"

# Get Jane's user ID
JANE_ID=$(curl -s http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN2" | jq -r '.id')

# Submit rating
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { submitRating(input: { toUserId: \\\"$JANE_ID\\\", lobbyId: \\\"$LOBBY_ID\\\", type: LIKE, category: Friendly }) { _id type category } }\"
  }"
```

### 4. Friend Management

```bash
# Get Jane's ID
JANE_ID=$(curl -s -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane.smith@test.com","password":"Test123!"}' \
  | jq -r '.token' | jwt decode - | jq -r '.sub')

# Send friend request to Jane
curl -X POST http://localhost:3000/users/friend-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"toUserId\":\"$JANE_ID\"}"

# Jane accepts (get John's ID from token)
JOHN_ID=$(echo $TOKEN | jwt decode - | jq -r '.sub')

curl -X POST http://localhost:3000/users/friend-requests/$JOHN_ID/resolve \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"action":"accept"}'
```

## 🗂️ Valid Sports

The following sports are supported:
- Football
- Basketball
- Tennis
- Volleyball
- Badminton
- Swimming
- Running
- Cycling

## 📝 Notes

- All passwords for seeded users are `Test123!`
- JWT tokens expire after 24 hours
- The seed script runs automatically on first startup
- GraphQL playground is available at `http://localhost:3003/graphql`
- Swagger documentation for User Service: `http://localhost:3001/api-docs`

## 🐛 Troubleshooting

**Services not starting:**
```bash
docker-compose logs -f
```

**Clear all data and restart:**
```bash
docker-compose down -v
docker-compose up -d
```

**Re-seed database:**
```bash
docker-compose restart seed
docker-compose logs -f seed
```

## 👨‍🏫 Quick Test Scenario:

1. Login as John Doe (`john.doe@test.com` / `Test123!`)
2. View profile and friends list
3. Browse available lobbies
4. Create a new lobby
5. Login as Jane Smith (`jane.smith@test.com` / `Test123!`)
6. Join John's lobby
7. Return to John, finish the lobby
8. Both users can now rate each other
9. Check rating statistics

## 📝 API Documentation

[POSTMAN](https://documenter.getpostman.com/view/43210142/2sBXVkBV5Z)