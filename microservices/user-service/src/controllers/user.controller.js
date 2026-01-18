const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userService = require('../services/user.service');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res, next) => {
  try {
    const { email, password, displayName, favouriteSport } = req.body;
    
    logger.info(`Registration attempt for email: ${email}`);
    
    // Validate required fields
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and displayName are required' });
    }

    // Validate favouriteSport if provided
    const validSports = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'];
    if (favouriteSport && !validSports.includes(favouriteSport)) {
      return res.status(400).json({ 
        error: `Invalid favouriteSport. Must be one of: ${validSports.join(', ')}` 
      });
    }
    
    const existing = await User.findOne({ email });
    if (existing) {
      logger.warn(`Registration failed: Email already exists - ${email}`);
      return res.status(409).json({ error: 'Email already used' });
    }
    
    const passwordHash = await argon2.hash(password);
    const user = await User.create({ 
      email, 
      passwordHash, 
      displayName,
      favouriteSport: favouriteSport || null
    });
    
    logger.info(`User registered successfully: ${user._id} - ${email}`);
    
    res.status(201).json({ 
      id: user._id, 
      email: user.email, 
      displayName: user.displayName,
      role: user.role,
      favouriteSport: user.favouriteSport
    });
  } catch (err) {
    logger.error(`Registration error: ${err.message}`, err);
    
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    logger.info(`Login attempt for email: ${email}`);
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login failed: User not found - ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      logger.warn(`Login failed: Invalid password - ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: user._id, email: user.email, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );

    logger.info(`User logged in successfully: ${user._id} - ${email}`);
    
    // Return only the token
    res.json({ token });
  } catch (err) {
    logger.error(`Login error: ${err.message}`, err);
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const user = await userService.getUserById(userId);
    
    logger.info(`User profile retrieved: ${userId}`);
    res.json(user);
  } catch (err) {
    logger.error(`Get user profile error: ${err.message}`, err);
    
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const updates = req.body;
    
    // Validate favouriteSport if being updated
    const validSports = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'];
    if (updates.favouriteSport && updates.favouriteSport !== null && !validSports.includes(updates.favouriteSport)) {
      return res.status(400).json({ 
        error: `Invalid favouriteSport. Must be one of: ${validSports.join(', ')}` 
      });
    }
    
    const user = await userService.updateUser(userId, updates);
    
    logger.info(`User profile updated: ${userId}`);
    res.json(user);
  } catch (err) {
    logger.error(`Update user profile error: ${err.message}`, err);
    
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.updateUserById = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const requestingUserId = req.user.sub;
    const updates = req.body;
    
    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    // Validate favouriteSport if being updated
    const validSports = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'];
    if (updates.favouriteSport && updates.favouriteSport !== null && !validSports.includes(updates.favouriteSport)) {
      return res.status(400).json({ 
        error: `Invalid favouriteSport. Must be one of: ${validSports.join(', ')}` 
      });
    }
    
    // Check if user is admin or updating their own profile
    const requestingUser = await User.findById(requestingUserId);
    
    if (!requestingUser) {
      return res.status(404).json({ error: 'Requesting user not found' });
    }
    
    if (requestingUser.role !== 'admin' && requestingUserId !== targetUserId) {
      logger.warn(`Unauthorized update attempt by ${requestingUserId} on ${targetUserId}`);
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    const user = await userService.updateUser(targetUserId, updates);
    
    logger.info(`User profile updated: ${targetUserId} by ${requestingUserId}`);
    res.json(user);
  } catch (err) {
    logger.error(`Update user error: ${err.message}`, err);
    
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    next(err);
  }
};

exports.sendFriendRequest = async (req, res, next) => {
  try {
    const fromUserId = req.user.sub;
    const { toUserId } = req.body;
    
    if (!toUserId) {
      return res.status(400).json({ error: 'toUserId is required' });
    }
    
    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ error: 'Invalid toUserId format' });
    }
    
    const friendRequest = await userService.sendFriendRequest(fromUserId, toUserId);
    
    res.status(201).json(friendRequest);
  } catch (err) {
    logger.error(`Send friend request error: ${err.message}`, err);
    
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message.includes('Cannot') || err.message.includes('Already') || err.message.includes('pending')) {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.getFriendRequests = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const requests = await userService.getFriendRequests(userId);
    
    res.json(requests);
  } catch (err) {
    logger.error(`Get friend requests error: ${err.message}`, err);
    next(err);
  }
};

exports.respondToFriendRequest = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { requestId } = req.params;
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action (accept/reject) is required' });
    }
    
    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }
    
    const result = await userService.respondToFriendRequest(requestId, userId, action);
    
    res.json(result);
  } catch (err) {
    logger.error(`Respond to friend request error: ${err.message}`, err);
    
    if (err.message === 'Friend request not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ error: err.message });
    }
    
    if (err.message.includes('Invalid') || err.message.includes('already processed')) {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.removeFriend = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { friendId } = req.params;
    
    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ error: 'Invalid friend ID format' });
    }
    
    const result = await userService.removeFriend(userId, friendId);
    
    res.json(result);
  } catch (err) {
    logger.error(`Remove friend error: ${err.message}`, err);
    
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message === 'Not friends') {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};