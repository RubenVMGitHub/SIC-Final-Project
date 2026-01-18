require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const logger = require('./config/logger');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3003;

logger.info('=== RATING SERVICE STARTING ===');
logger.info(`PORT: ${PORT}`);
logger.info(`JWT_SECRET: ${process.env.JWT_SECRET ? 'LOADED' : 'MISSING'}`);
logger.info(`MONGODB_URI: ${process.env.MONGODB_URI ? 'LOADED' : 'MISSING'}`);
logger.info(`LOBBY_SERVICE_URL: ${process.env.LOBBY_SERVICE_URL || 'NOT SET'}`);

// Middleware
app.use(cors());
app.use(express.json());

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✓ MongoDB connected successfully');
  } catch (error) {
    logger.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'rating-service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Initialize Apollo Server
const startServer = async () => {
  await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (error) => {
      logger.error('GraphQL Error:', {
        message: error.message,
        path: error.path,
        extensions: error.extensions
      });
      return error;
    }
  });

  await server.start();

  // GraphQL endpoint with authentication context
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Try to authenticate, but don't fail if no token
        // Some queries might be public
        let user = null;
        try {
          user = authenticate({ req });
        } catch (err) {
          // Authentication will be checked in resolvers if needed
          logger.debug('No authentication provided or invalid token');
        }
        
        return { req, user };
      }
    })
  );

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`✓ Rating Service (GraphQL) running on port ${PORT}`);
    logger.info(`✓ GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});