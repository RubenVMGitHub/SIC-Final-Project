# Real-World Sports Matchmaking Platform

Taking inspiration from the well-known gaming platform FACEIT, this is a microservices-based API designed to connect sports enthusiasts, facilitate the organization of sports activities, and provide a player rating system. Users can create profiles, manage friendships, organize sports lobbies, join activities, and rate fellow players based on their performance and behavior.

---

## 📑 Table of Contents

- [Summary](#-summary)
- [Architecture](#️-architecture)
- [Prerequisites](#-prerequisites)
- [Running the Application](#-running-the-application)
  - [Option 1: Docker Compose (Recommended for Development)](#option-1-docker-compose-recommended-for-development)
  - [Option 2: Docker Swarm (High Availability Deployment)](#option-2-docker-swarm-high-availability-deployment)
- [Stopping and Removing the Application](#-stopping-and-removing-the-application)
  - [Docker Compose](#docker-compose)
  - [Docker Swarm](#docker-swarm)
- [API Documentation](#-api-documentation)
- [Test Accounts](#-test-accounts)
- [Quick Reference - Common Commands](#-quick-reference---common-commands)
  - [Docker Compose](#docker-compose-1)
  - [Docker Swarm](#docker-swarm-1)
  - [Testing](#testing)
  - [Troubleshooting](#troubleshooting)
- [Supported Sports](#️-supported-sports)
- [Sequence Diagrams](#️-sequence-diagrams)
- [Project Contributors](#-project-contributors)

---

## 📋 Summary

This platform enables sports enthusiasts to:

- **Create and manage user profiles** with authentication and authorization
- **Build a social network** through friend requests and friendships
- **Organize sports activities** by creating and joining lobbies
- **Rate other players** after completing matches
- **Receive real-time notifications** for friend requests and lobby activities

The platform is built with a microservices architecture, ensuring scalability, maintainability, and high availability.

---

## 🏗️ Architecture

The platform consists of **5 core microservices** and **1 API Gateway**:

| Service | Port | Technology Stack | Description |
|---------|------|-----------------|-------------|
| **API Gateway** | 3000 | Nginx | Routes requests to appropriate microservices with load balancing |
| **User Service** | 3001 | Node.js, Express, MongoDB | User authentication, profiles, and friend management |
| **Lobby Service** | 3002 | Node.js, Express, MongoDB | Sports lobby creation, joining, and management |
| **Rating Service** | 3003 | Node.js, Express, GraphQL, MongoDB | Player rating system with GraphQL API |
| **Notification Service** | 3004 | Python, FastAPI, MongoDB | Real-time notifications via RabbitMQ |
| **Seed Service** | - | Node.js | Automatic database population with test data |

### Additional Infrastructure

- **MongoDB** (x4 instances) - Database for each service (ports: 27017-27020)
- **RabbitMQ** - Message broker for event-driven communication (port: 5672, management: 15672)
- **Docker Swarm** - Orchestration for high availability deployment

### Architecture Diagram

<p align="center">
  <img src="/assets/overallArchitecture.png" alt="" />
</p>

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

- **Docker** 20.10+ ([Download](https://www.docker.com/get-started))
- **Docker Compose** 2.0+ (included with Docker Desktop)
- **Docker Swarm** (initialized for swarm deployment)
- **Node.js** 18+ (optional, for local development)
- **Python** 3.11+ (optional, for local development)

### System Requirements

- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: Minimum 10GB free space
- **OS**: Linux, macOS, or Windows with WSL2

---

## 🚀 Running the Application

### Option 1: Docker Compose (Recommended for Development)

Docker Compose provides a simple way to run all services locally with automatic seeding.

#### Step 1: Start All Services

```bash
# Navigate to the microservices directory
cd microservices/docker

# Start all services in detached mode
docker compose up --build -d
```

#### Step 2: Verify Services are Running

```bash
# Check all containers are running
docker compose ps

# Expected output: All services should show "Up" status
```

#### Step 3: Run Database Seeding (IMPORTANT)

**⚠️ Due to service startup timing, you must restart the seed service twice to ensure all data is populated correctly.**

```bash
# First seed attempt
docker compose restart seed

# Wait 10 seconds for services to stabilize
sleep 10

# Second seed attempt (ensures ratings are created)
docker compose restart seed

# Monitor seeding progress
docker compose logs -f seed
```

#### Step 4: Access the Platform

Once seeding is complete, you can access:

- **API Gateway**: http://localhost:3000
- **User Service Swagger**: http://localhost:3001/api-docs
- **Lobby Service Swagger**: http://localhost:3002/api-docs
- **Notification Service Docs**: http://localhost:3004/api-docs
- **Rating GraphQL Playground**: http://localhost:3003/graphql
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

---

### Option 2: Docker Swarm (High Availability Deployment)

Docker Swarm enables deployment with high availability, load balancing, and service replication.

#### Step 1: Initialize Docker Swarm

```bash
# Initialize swarm mode (if not already done)
docker swarm init
```

#### Step 2: Build Service Images

```bash
# Navigate to the microservices directory
cd microservices/docker

# Build all service images
docker build -t user-service:1.0 ../user-service
docker build -t lobby-service:1.0 ../lobby-service
docker build -t rating-service:1.0 ../rating-service
docker build -t notification-service:1.0 ../notification-service
docker build -t api-gateway:1.0 ../api-gateway
docker build -t seed-service:1.0 ../seed
```

#### Step 3: Deploy the Stack

```bash
# Deploy all services to the swarm
docker stack deploy -c docker-compose-swarm.yml sports-stack
```

#### Step 4: Monitor Deployment

```bash
# Check service status
docker stack services sports-stack

# Wait until all services show correct replica count (e.g., 2/2, 1/1)
watch -n 2 'docker stack services sports-stack'
```

#### ⚠️ Known Issues in Swarm Mode

- **Notification Service**: Currently experiencing stability issues in Docker Swarm. The service may restart unexpectedly. This is a known issue being investigated. The service works correctly in Docker Compose mode.

#### Step 6: Scale Services (Optional)

```bash
# Scale API Gateway to 3 replicas
docker service scale sports-stack_api-gateway=3

# Scale User Service to 2 replicas
docker service scale sports-stack_user-service=2

# Verify scaling
docker stack services sports-stack
```

---

## 🛑 Stopping and Removing the Application

### Docker Compose

**Stop services (data preserved):**
```bash
docker compose stop
```

**Stop and remove containers (data preserved):**
```bash
docker compose down
```

**Stop, remove containers AND delete all data:**
```bash
docker compose down -v
```

**Remove specific service:**
```bash
docker compose stop user-service
docker compose rm user-service
```

---

### Docker Swarm

**Remove entire stack:**
```bash
docker stack rm sports-stack
```

**Verify removal:**
```bash
docker stack ls
docker service ls
```

**Leave swarm mode (if needed):**
```bash
docker swarm leave --force
```

**Remove all images (cleanup):**
```bash
docker rmi user-service:1.0 lobby-service:1.0 rating-service:1.0 notification-service:1.0 api-gateway:1.0 seed-service:1.0
```

---

## 📚 API Documentation

### Quick Reference - Core Endpoints

| Service | Method | Endpoint | Description | Auth Required |
|---------|--------|----------|-------------|---------------|
| **User** | POST | `/users` | Register new user | ❌ |
| **User** | POST | `/users/login` | User login | ❌ |
| **User** | GET | `/users/me` | Get current user profile | ✅ |
| **User** | POST | `/users/friend-requests` | Send friend request | ✅ |
| **User** | GET | `/users/friend-requests` | List pending friend requests | ✅ |
| **Lobby** | POST | `/lobbies` | Create new lobby | ✅ |
| **Lobby** | GET | `/lobbies` | List all lobbies | ❌ |
| **Lobby** | POST | `/lobbies/:id/join` | Join a lobby | ✅ |
| **Lobby** | PATCH | `/lobbies/:id` | Update lobby status | ✅ |
| **Rating** | POST | `/graphql` | Submit rating (GraphQL mutation) | ✅ |
| **Rating** | POST | `/graphql` | Get user statistics (GraphQL query) | ✅ |
| **Notification** | GET | `/notifications/me` | Get user notifications | ✅ |
| **Notification** | PATCH | `/notifications/:id/read` | Mark notification as read | ✅ |

### Complete API Documentation

**📖 Interactive Documentation:**
- **User Service Swagger**: http://localhost:3001/api-docs
- **Lobby Service Swagger**: http://localhost:3002/api-docs
- **Notification Service Docs**: http://localhost:3004/api-docs
- **Rating GraphQL Playground**: http://localhost:3003/graphql

**📮 Postman Collection:**
- **Full API Documentation**: [Postman Documentation](https://documenter.getpostman.com/view/43210142/2sBXVkBV5Z#real-world-sports-matchmaking-platform-api-documentation)

### Authentication

All endpoints (except registration and login) require JWT authentication.

**Include token in requests:**
```
Authorization: Bearer <your_jwt_token>
```

**Example - Get Authentication Token:**
```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@test.com","password":"Test123!"}'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 👤 Test Accounts

The database is automatically seeded with test users on first startup.

### Main Test Users

| Email | Password | Display Name | Favourite Sport |
|-------|----------|--------------|-----------------|
| `john.doe@test.com` | `Test123!` | John Doe | Football |
| `jane.smith@test.com` | `Test123!` | Jane Smith | Basketball |

### Additional Test Users

**All passwords are `Test123!`**

- `mike.wilson@test.com` - Mike Wilson (Tennis)
- `sarah.jones@test.com` - Sarah Jones (Football)
- `alex.brown@test.com` - Alex Brown (Volleyball)
- `emma.davis@test.com` - Emma Davis (Swimming)
- `chris.taylor@test.com` - Chris Taylor (Basketball)
- `lisa.anderson@test.com` - Lisa Anderson (Running)

### Pre-Seeded Data

After seeding, the database contains:

- ✅ **8 Users** with established friendships
- ✅ **6 Lobbies** (5 active, 1 finished)
- ✅ **Multiple Ratings** for the finished lobby
- ✅ **Friend Requests** between users
- ✅ **Notifications** for various events

---

## ⚡ Quick Reference - Common Commands

### Docker Compose

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all services |
| `docker compose ps` | List running services |
| `docker compose logs -f [service]` | Follow service logs |
| `docker compose restart [service]` | Restart specific service |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove all data |
| `docker compose build [service]` | Rebuild service image |

### Docker Swarm

| Command | Description |
|---------|-------------|
| `docker swarm init` | Initialize swarm mode |
| `docker stack deploy -c docker-compose-swarm.yml sports-stack` | Deploy stack |
| `docker stack services sports-stack` | List all services |
| `docker stack ps sports-stack` | List all tasks/containers |
| `docker service scale sports-stack_api-gateway=3` | Scale service |
| `docker service logs -f sports-stack_[service]` | Follow service logs |
| `docker service update --force sports-stack_[service]` | Restart service |
| `docker stack rm sports-stack` | Remove entire stack |

### Testing

| Command | Description |
|---------|-------------|
| `docker compose restart seed` | Re-run database seeding |
| `curl http://localhost:3000/health` | Check API Gateway health |
| `docker compose logs -f seed` | Monitor seeding progress |
| `docker stats` | View resource usage |

### Troubleshooting

| Command | Description |
|---------|-------------|
| `docker compose logs -f` | View all service logs |
| `docker system prune -a` | Clean up Docker system |
| `docker volume prune` | Remove unused volumes |
| `docker network ls` | List Docker networks |

---

## 🗂️ Supported Sports

The platform supports the following sports:

- **Football** ⚽
- **Basketball** 🏀
- **Tennis** 🎾
- **Volleyball** 🏐
- **Badminton** 🏸
- **Swimming** 🏊
- **Running** 🏃
- **Cycling** 🚴

---

## 🗂️ Sequence Diagrams

### User Flow Sequence Diagram - Joining a Lobby and Rating a User

<p align="center">
  <img src="/assets/joiningLobby_ratingUser_userFlow_sequenceDiagram.png" alt="" />
</p>

### User Flow Sequence Diagram - Sending a Friend Request

<p align="center">
  <img src="/assets/POST_friendRequest_sequenceDiagram.png" alt="" />
</p>

---

## 👥 Project Contributors

### Development Team

**Mário Dias**

- GitHub: [@mariodias](https://github.com/1MarioDias)
- Role: Backend Developer

**Ruben Martos**

- GitHub: [@rubenmartos](https://github.com/RubenVMGitHub)
- Role: Backend Developer

**Aitor Conrado**

- Role: Backend Developer