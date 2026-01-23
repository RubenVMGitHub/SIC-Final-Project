require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/user.routes');
const rabbitmq = require('./config/rabbitmq');
const swaggerSpec = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3001;

logger.info('=' .repeat(60));
logger.info('USER SERVICE STARTING');
logger.info('=' .repeat(60));
logger.info(`Service: user-service`);
logger.info(`Port: ${PORT}`);
logger.info(`JWT_SECRET: ${process.env.JWT_SECRET ? 'LOADED' : 'MISSING'}`);
logger.info(`MongoDB: ${process.env.MONGODB_URI ? 'LOADED' : 'MISSING'}`);
logger.info(`RabbitMQ: ${process.env.RABBITMQ_URL ? 'LOADED' : 'MISSING'}`);
logger.info(`Log Level: ${process.env.LOG_LEVEL || 'info'}`);

// Middleware
app.use(cors());
app.use(express.json());

// Pino HTTP logger
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

const connectRabbitMQ = async () => {
  try {
    logger.info('Connecting to RabbitMQ...');
    await rabbitmq.connect();
  } catch (error) {
    logger.error({ err: error }, 'RabbitMQ connection error (non-fatal)');
  }
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the service including database connection
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    service: 'user-service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  logger.debug('Health check requested', health);
  res.status(200).json(health);
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'User Service API Documentation'
}));

logger.info('Swagger documentation available at /api-docs');

// Routes
app.use('/users', userRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('shutting down...');
  await mongoose.connection.close();
  await rabbitmq.close();
  logger.info('Connections closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('shutting down...');
  await mongoose.connection.close();
  await rabbitmq.close();
  logger.info('Connections closed');
  process.exit(0);
});

// Start server
Promise.all([connectDB(), connectRabbitMQ()]).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('=' .repeat(60));
    logger.info('USER SERVICE STARTED SUCCESSFULLY');
    logger.info('=' .repeat(60));
    logger.info(`Server: http://localhost:${PORT}`);
    logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
    logger.info(`Health Check: http://localhost:${PORT}/health`);
    logger.info('=' .repeat(60));
  });
}).catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});