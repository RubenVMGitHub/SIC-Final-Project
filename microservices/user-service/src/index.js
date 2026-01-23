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

const app = express();
const PORT = process.env.PORT || 3001;

logger.info('=== USER SERVICE STARTING ===');
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
    logger.info('✓ MongoDB connected successfully');
  } catch (error) {
    logger.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
};

const connectRabbitMQ = async () => {
  try {
    await rabbitmq.connect();
  } catch (error) {
    logger.error('✗ RabbitMQ connection error:', error);
    // sem exit
  }
};

// Swagger Documentation
let swaggerDocument;
try {
  swaggerDocument = require('./swagger-output.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  logger.info('Swagger documentation available at /api-docs');
} catch (err) {
  logger.warn('Swagger documentation not found. Run "npm run swagger" to generate it.');
}

// Health check endpoint
app.get('/health', (req, res) => {
  // #swagger.tags = ['Health']
  // #swagger.description = 'Health check endpoint'
  /* #swagger.responses[200] = {
    description: 'Service is healthy',
    schema: {
      status: 'ok',
      service: 'user-service',
      database: 'connected'
    }
  } */
  res.status(200).json({ 
    status: 'ok', 
    service: 'user-service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/users', userRoutes);

// Error handling
app.use(errorHandler);

// Start server
Promise.all([connectDB(), connectRabbitMQ()]).then(() => {
  app.listen(PORT, () => {
    logger.info(`✓ User Service listening on port ${PORT}`);
    logger.info(`✓ Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
});