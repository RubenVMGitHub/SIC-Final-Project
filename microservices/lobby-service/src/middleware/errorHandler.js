const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error caught by error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  if (res.headersSent) return next(err);
  
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
}

module.exports = errorHandler;