const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * verifiesJWT token and attaches user info to request
 */
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('No authorization header provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      logger.warn('Malformed authorization header');
      return res.status(401).json({ error: 'Malformed token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { sub: userId, email: userEmail, displayName: userDisplayName, role: userRole }
    
    logger.info(`User authenticated: ${decoded.sub} (${decoded.displayName})`);
    next();
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { auth };