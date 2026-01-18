const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extract and verify JWT token from context
 */
const authenticate = (context) => {
  const authHeader = context.req.headers.authorization;
  
  if (!authHeader) {
    logger.warn('No authorization header provided');
    throw new Error('Authentication required');
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    logger.warn('Malformed authorization header');
    throw new Error('Malformed token');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.info(`User authenticated: ${decoded.sub}`);
    return decoded; // { sub: userId, email: userEmail, role: userRole }
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    throw new Error('Invalid token');
  }
};

module.exports = { authenticate };