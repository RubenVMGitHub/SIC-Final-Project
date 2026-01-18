const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'User Service API',
    description: 'User authentication, profile management, and friend system',
    version: '1.0.0'
  },
  host: 'localhost:3001',
  schemes: ['http'],
  tags: [
    {
      name: 'Users',
      description: 'User authentication and management endpoints'
    },
    {
      name: 'Friends',
      description: 'Friend request and friendship management'
    }
  ],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Enter your bearer token in the format: Bearer {token}'
    }
  },
  definitions: {
    User: {
      id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      displayName: 'John Doe',
      role: 'user',
      favouriteSport: 'Football',
      friends: [],
      createdAt: '2026-01-14T10:00:00.000Z',
      updatedAt: '2026-01-14T10:00:00.000Z'
    },
    RegisterRequest: {
      $email: 'user@example.com',
      $password: 'securePassword123',
      $displayName: 'John Doe',
      favouriteSport: 'Football'
    },
    UpdateUserRequest: {
      displayName: 'Jane Doe',
      favouriteSport: 'Basketball'
    },
    FriendRequest: {
      _id: '507f1f77bcf86cd799439011',
      from: '507f1f77bcf86cd799439012',
      to: '507f1f77bcf86cd799439013',
      status: 'pending',
      createdAt: '2026-01-14T10:00:00.000Z'
    },
    SendFriendRequest: {
      $toUserId: '507f1f77bcf86cd799439012'
    },
    RespondFriendRequest: {
      $action: 'accept'
    }
  }
};

const outputFile = './src/swagger-output.json';
const endpointsFiles = ['./src/index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log('Swagger documentation generated successfully');
});