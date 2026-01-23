const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lobby Service API',
      version: '1.0.0',
      description: 'API for managing sports lobbies - creating, joining, and organizing sports activities',
      contact: {
        name: 'API Support',
        email: ''
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3002',
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
          description: 'Enter JWT token obtained from authentication service'
        }
      },
      schemas: {
        Lobby: {
          type: 'object',
          required: ['sport', 'location', 'time', 'maxPlayers', 'ownerId'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated MongoDB ObjectId',
              example: '507f1f77bcf86cd799439011'
            },
            sport: {
              type: 'string',
              enum: ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'],
              description: 'Type of sport activity',
              example: 'Football'
            },
            location: {
              type: 'string',
              description: 'Location where the activity will take place',
              example: 'Central Park, Field 3'
            },
            time: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled date and time for the activity',
              example: '2026-01-25T18:00:00Z'
            },
            maxPlayers: {
              type: 'integer',
              minimum: 2,
              maximum: 50,
              description: 'Maximum number of players allowed',
              example: 10
            },
            players: {
              type: 'array',
              description: 'List of players who joined the lobby',
              items: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    description: 'User ID of the player',
                    example: '507f1f77bcf86cd799439012'
                  },
                  displayName: {
                    type: 'string',
                    description: 'Display name of the player',
                    example: 'John Doe'
                  }
                }
              }
            },
            ownerId: {
              type: 'string',
              description: 'User ID of the lobby creator',
              example: '507f1f77bcf86cd799439013'
            },
            status: {
              type: 'string',
              enum: ['OPEN', 'FULL', 'FINISHED', 'CANCELLED'],
              description: 'Current status of the lobby',
              example: 'OPEN'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Optional description or additional details about the activity',
              example: 'Friendly football match, all skill levels welcome!'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the lobby was created'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the lobby was last updated'
            }
          }
        },
        LobbyInput: {
          type: 'object',
          required: ['sport', 'location', 'time', 'maxPlayers'],
          properties: {
            sport: {
              type: 'string',
              enum: ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'],
              example: 'Football'
            },
            location: {
              type: 'string',
              example: 'Central Park, Field 3'
            },
            time: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-25T18:00:00Z'
            },
            maxPlayers: {
              type: 'integer',
              minimum: 2,
              maximum: 50,
              example: 10
            },
            description: {
              type: 'string',
              maxLength: 500,
              example: 'Friendly football match, all skill levels welcome!'
            }
          }
        },
        LobbyUpdate: {
          type: 'object',
          properties: {
            sport: {
              type: 'string',
              enum: ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling']
            },
            location: {
              type: 'string'
            },
            time: {
              type: 'string',
              format: 'date-time'
            },
            maxPlayers: {
              type: 'integer',
              minimum: 2,
              maximum: 50
            },
            description: {
              type: 'string',
              maxLength: 500
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Lobby not found'
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
              example: 'lobby-service'
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
        name: 'Lobbies',
        description: 'Lobby management operations'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/index.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;