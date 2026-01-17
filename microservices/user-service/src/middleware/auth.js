const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * autentica o user via JWT
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
    req.user = decoded; // { sub: userId, email: userEmail }
    
    logger.info(`User authenticated: ${decoded.sub}`);
    next();
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * checka se o user tem role de admin
 */
const isAdmin = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.sub);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      logger.warn(`Access denied for non-admin user: ${user._id}`);
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    
    next();
  } catch (err) {
    logger.error(`Admin check error: ${err.message}`);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { auth, isAdmin };