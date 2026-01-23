const lobbyService = require('../services/lobby.service');
const logger = require('../config/logger');

exports.createLobby = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const lobbyData = req.body;

    // Validate required fields
    const { sport, location, time, maxPlayers } = lobbyData;
    
    if (!sport || !location || !time || !maxPlayers) {
      return res.status(400).json({ 
        error: 'sport, location, time, and maxPlayers are required' 
      });
    }

    const lobby = await lobbyService.createLobby(userId, lobbyData);
    
    res.status(201).json(lobby);
  } catch (err) {
    logger.error(`Create lobby error: ${err.message}`, err);
    
    if (err.message.includes('Invalid sport')) {
      return res.status(400).json({ error: err.message });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.getLobbies = async (req, res, next) => {
  try {
    const { sport, status } = req.query;
    
    // Validate sport if provided
    if (sport) {
      const validSports = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'];
      if (!validSports.includes(sport)) {
        return res.status(400).json({ 
          error: `Invalid sport filter. Must be one of: ${validSports.join(', ')}` 
        });
      }
    }

    const lobbies = await lobbyService.getLobbies({ sport, status });
    
    res.json(lobbies);
  } catch (err) {
    logger.error(`Get lobbies error: ${err.message}`, err);
    next(err);
  }
};

exports.getLobbyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }

    const lobby = await lobbyService.getLobbyById(id);
    
    res.json(lobby);
  } catch (err) {
    logger.error(`Get lobby error: ${err.message}`, err);
    
    if (err.message === 'Lobby not found') {
      return res.status(404).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.updateLobby = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    const updates = req.body;

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const lobby = await lobbyService.updateLobby(id, userId, updates);
    
    res.json(lobby);
  } catch (err) {
    logger.error(`Update lobby error: ${err.message}`, err);
    
    if (err.message === 'Lobby not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message.includes('Only the lobby owner')) {
      return res.status(403).json({ error: err.message });
    }
    
    if (err.message.includes('Invalid sport')) {
      return res.status(400).json({ error: err.message });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.joinLobby = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    const displayName = req.user.displayName;

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }

    if (!displayName) {
      return res.status(400).json({ error: 'Display name not found in token' });
    }

    const lobby = await lobbyService.joinLobby(id, userId, displayName);
    
    res.json(lobby);
  } catch (err) {
    logger.error(`Join lobby error: ${err.message}`, err);
    
    if (err.message === 'Lobby not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message.includes('Cannot join') || err.message.includes('full') || err.message.includes('already')) {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.leaveLobby = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }

    const lobby = await lobbyService.leaveLobby(id, userId);
    
    res.json(lobby);
  } catch (err) {
    logger.error(`Leave lobby error: ${err.message}`, err);
    
    if (err.message === 'Lobby not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message.includes('Cannot leave') || err.message.includes('not in') || err.message.includes('owner')) {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.kickPlayer = async (req, res, next) => {
  try {
    const { id, playerId } = req.params;
    const userId = req.user.sub;

    // Validate ObjectId formats
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID format' });
    }

    const result = await lobbyService.kickPlayer(id, userId, playerId);
    
    res.json({ 
      message: `Player ${result.kickedPlayer.displayName} kicked successfully`,
      lobby: result.lobby 
    });
  } catch (err) {
    logger.error(`Kick player error: ${err.message}`, err);
    
    if (err.message === 'Lobby not found' || err.message.includes('Player not found')) {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message.includes('Only the lobby owner')) {
      return res.status(403).json({ error: err.message });
    }
    
    if (err.message.includes('cannot kick')) {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.finishLobby = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }

    const lobby = await lobbyService.finishLobby(id, userId);
    
    res.json(lobby);
  } catch (err) {
    logger.error(`Finish lobby error: ${err.message}`, err);
    
    if (err.message === 'Lobby not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message.includes('Only the lobby owner')) {
      return res.status(403).json({ error: err.message });
    }
    
    if (err.message.includes('already finished') || err.message.includes('Cannot finish')) {
      return res.status(400).json({ error: err.message });
    }
    
    next(err);
  }
};

exports.deleteLobby = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lobby ID format' });
    }

    const result = await lobbyService.deleteLobby(id, userId);
    
    res.json(result);
  } catch (err) {
    logger.error(`Delete lobby error: ${err.message}`, err);
    
    if (err.message === 'Lobby not found') {
      return res.status(404).json({ error: err.message });
    }
    
    if (err.message.includes('Only the lobby owner')) {
      return res.status(403).json({ error: err.message });
    }
    
    next(err);
  }
};