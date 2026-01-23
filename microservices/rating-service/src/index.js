require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginLandingPageLocalDefault } = require('@apollo/server/plugin/landingPage/default');
const logger = require('./config/logger');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3003;

logger.info('=' .repeat(60));
logger.info('RATING SERVICE STARTING');
logger.info('=' .repeat(60));
logger.info(`Service: rating-service (GraphQL)`);
logger.info(`Port: ${PORT}`);
logger.info(`JWT_SECRET: ${process.env.JWT_SECRET ? 'LOADED' : 'MISSING'}`);
logger.info(`MongoDB: ${process.env.MONGODB_URI ? 'LOADED' : 'MISSING'}`);
logger.info(`Lobby Service URL: ${process.env.LOBBY_SERVICE_URL || 'NOT SET'}`);
logger.info(`Log Level: ${process.env.LOG_LEVEL || 'info'}`);

// Middleware
app.use(cors());
app.use(express.json());

// Pino HTTP logger middleware
app.use(pinoHttp({
  logger,
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  customSuccessMessage: function (req, res) {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: function (req, res, err) {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'timeTaken'
  }
}));

const connectDB = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection error');
    process.exit(1);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    service: 'rating-service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
  
  logger.debug('Health check requested', health);
  res.status(200).json(health);
});

// Initialize Apollo Server
const startServer = async () => {
  await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true, // Enable GraphQL introspection
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: true
      }),
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(requestContext) {
              logger.error({
                operation: requestContext.operationName,
                errors: requestContext.errors.map(err => ({
                  message: err.message,
                  path: err.path,
                  extensions: err.extensions
                }))
              }, 'GraphQL Error');
            }
          };
        }
      }
    ],
    formatError: (error) => {
      logger.error({
        message: error.message,
        path: error.path,
        locations: error.locations,
        extensions: error.extensions
      }, 'GraphQL Format Error');
      
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
          ...(process.env.NODE_ENV === 'development' && { stack: error.extensions?.stack })
        }
      };
    }
  });

  await server.start();
  logger.info('Apollo Server started successfully');

  // GraphQL endpoint with authentication context
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        let user = null;
        try {
          user = authenticate({ req });
          logger.debug({ userId: user.sub }, 'User authenticated for GraphQL request');
        } catch (err) {
          logger.debug('No authentication provided or invalid token');
        }
        
        return { req, user };
      }
    })
  );

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('=' .repeat(60));
    logger.info('RATING SERVICE STARTED SUCCESSFULLY');
    logger.info('=' .repeat(60));
    logger.info(`Server: http://localhost:${PORT}`);
    logger.info(`GraphQL Playground: http://localhost:${PORT}/graphql`);
    logger.info(`Health Check: http://localhost:${PORT}/health`);
    logger.info('=' .repeat(60));
  });
};

process.on('SIGTERM', async () => {
  logger.info('shutting down...');
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('shutting down...');
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
  process.exit(0);
});

startServer().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});