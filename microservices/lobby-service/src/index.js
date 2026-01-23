require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const lobbyRoutes = require('./routes/lobby.routes');
const rabbitmq = require('./config/rabbitmq');
const swaggerSpec = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3002;

logger.info('=== LOBBY SERVICE STARTING ===');
logger.info(`PORT: ${PORT}`);
logger.info(`JWT_SECRET: ${process.env.JWT_SECRET ? 'LOADED' : 'MISSING'}`);
logger.info(`MONGODB_URI: ${process.env.MONGODB_URI ? 'LOADED' : 'MISSING'}`);
logger.info(`RABBITMQ_URL: ${process.env.RABBITMQ_URL ? 'LOADED' : 'MISSING'}`);

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
  }
}));

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const connectRabbitMQ = async () => {
  try {
    await rabbitmq.connect();
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
    // sem exit
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
  res.status(200).json({ 
    status: 'ok', 
    service: 'lobby-service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Lobby Service API Documentation'
}));

logger.info('Swagger documentation available at /api-docs');

// Routes
app.use('/lobbies', lobbyRoutes);

// Error handling
app.use(errorHandler);

// Start server
Promise.all([connectDB(), connectRabbitMQ()]).then(() => {
  app.listen(PORT, () => {
    logger.info(`Lobby Service listening on port ${PORT}`);
    logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  });
});