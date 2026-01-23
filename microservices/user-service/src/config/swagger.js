const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Service API',
      version: '1.0.0',
      description: `
## Sports Matchmaking Platform - User Service

User authentication, profile management, and friend system.

### Features
* **User Registration & Authentication** - Secure user registration and JWT-based login
* **Profile Management** - Create and update user profiles with favorite sports
* **Friend System** - Send, accept/reject friend requests and manage friendships
* **Role-Based Access** - User and admin role support
* **Event Publishing** - RabbitMQ integration for friend request notifications

### Authentication
Most endpoints require JWT authentication via Bearer token.

Include the token in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`
      `,
      contact: {
        name: 'API Support',
        email: ''
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3000',
        description: 'API Gateway'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com'
            },
            displayName: {
              type: 'string',
              description: 'User display name',
              example: 'John Doe'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
              example: 'user'
            },
            favouriteSport: {
              type: 'string',
              enum: ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'],
              nullable: true,
              description: 'User\'s favorite sport',
              example: 'Football'
            },
            friends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  displayName: { type: 'string' },
                  email: { type: 'string' },
                  favouriteSport: { type: 'string' }
                }
              },
              description: 'List of user\'s friends'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'displayName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'securePassword123'
            },
            displayName: {
              type: 'string',
              minLength: 2,
              example: 'John Doe'
            },
            favouriteSport: {
              type: 'string',
              enum: ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'],
              example: 'Football'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              example: 'securePassword123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT authentication token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              example: 'Jane Doe'
            },
            favouriteSport: {
              type: 'string',
              enum: ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'],
              nullable: true,
              example: 'Basketball'
            }
          }
        },
        FriendRequest: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            from: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                displayName: { type: 'string' },
                email: { type: 'string' },
                favouriteSport: { type: 'string' }
              }
            },
            to: {
              type: 'string',
              example: '507f1f77bcf86cd799439013'
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected'],
              example: 'pending'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        SendFriendRequest: {
          type: 'object',
          required: ['toUserId'],
          properties: {
            toUserId: {
              type: 'string',
              description: 'User ID to send friend request to',
              example: '507f1f77bcf86cd799439012'
            }
          }
        },
        RespondFriendRequest: {
          type: 'object',
          required: ['action'],
          properties: {
            action: {
              type: 'string',
              enum: ['accept', 'reject'],
              description: 'Action to take on friend request',
              example: 'accept'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok'
            },
            service: {
              type: 'string',
              example: 'user-service'
            },
            database: {
              type: 'string',
              enum: ['connected', 'disconnected'],
              example: 'connected'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Authentication',
        description: 'User registration and login'
      },
      {
        name: 'Profile',
        description: 'User profile management'
      },
      {
        name: 'Friends',
        description: 'Friend request and friendship management'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/index.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;