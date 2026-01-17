const Lobby = require('../models/Lobby');
const logger = require('../config/logger');

class LobbyService {
  /**
   * Create a new lobby
   */
  async createLobby(ownerId, lobbyData) {
    const { sport, location, time, maxPlayers, description } = lobbyData;

    // Validate sport
    const validSports = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'];
    if (!validSports.includes(sport)) {
      throw new Error(`Invalid sport. Must be one of: ${validSports.join(', ')}`);
    }

    const lobby = await Lobby.create({
      sport,
      location,
      time,
      maxPlayers,
      description,
      ownerId,
      players: [],
      status: 'OPEN'
    });

    logger.info(`Lobby created: ${lobby._id} by user ${ownerId}`);
    return lobby;
  }

  /**
   * Get all lobbies with optional filters
   */
  async getLobbies(filters = {}) {
    const query = {};
    
    if (filters.sport) {
      query.sport = filters.sport;
    }
    
    if (filters.status) {
      query.status = filters.status;
    } else {
      // By default, only show OPEN and FULL lobbies
      query.status = { $in: ['OPEN', 'FULL'] };
    }

    const lobbies = await Lobby.find(query)
      .sort({ createdAt: -1 })
      .select('-__v');

    return lobbies;
  }

  /**
   * Get lobby by ID
   */
  async getLobbyById(lobbyId) {
    const lobby = await Lobby.findById(lobbyId).select('-__v');
    
    if (!lobby) {
      throw new Error('Lobby not found');
    }
    
    return lobby;
  }

  /**
   * Update lobby (owner only)
   */
  async updateLobby(lobbyId, userId, updates) {
    const lobby = await Lobby.findById(lobbyId);
    
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Check if user is the owner
    if (lobby.ownerId.toString() !== userId) {
      throw new Error('Only the lobby owner can edit this lobby');
    }

    // Don't allow updating certain fields
    const allowedUpdates = ['sport', 'location', 'time', 'maxPlayers', 'description'];
    const updateFields = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateFields[key] = updates[key];
      }
    });

    // Validate sport if being updated
    if (updateFields.sport) {
      const validSports = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'];
      if (!validSports.includes(updateFields.sport)) {
        throw new Error(`Invalid sport. Must be one of: ${validSports.join(', ')}`);
      }
    }

    const updatedLobby = await Lobby.findByIdAndUpdate(
      lobbyId,
      updateFields,
      { new: true, runValidators: true }
    ).select('-__v');

    logger.info(`Lobby updated: ${lobbyId} by user ${userId}`);
    return updatedLobby;
  }

  /**
   * Join a lobby
   */
  async joinLobby(lobbyId, userId, displayName) {
    const lobby = await Lobby.findById(lobbyId);
    
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status === 'FINISHED') {
      throw new Error('Cannot join a finished lobby');
    }

    if (lobby.status === 'CANCELLED') {
      throw new Error('Cannot join a cancelled lobby');
    }

    if (lobby.status === 'FULL') {
      throw new Error('Lobby is full');
    }

    // Check if user already in lobby
    if (lobby.players.some(p => p.userId.toString() === userId)) {
      throw new Error('You are already in this lobby');
    }

    // Add player
    lobby.players.push({ userId, displayName });

    // Update status if full
    if (lobby.players.length >= lobby.maxPlayers) {
      lobby.status = 'FULL';
    }

    await lobby.save();
    logger.info(`User ${userId} joined lobby ${lobbyId}`);
    
    return lobby;
  }

  /**
   * Leave a lobby
   */
  async leaveLobby(lobbyId, userId) {
    const lobby = await Lobby.findById(lobbyId);
    
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status === 'FINISHED') {
      throw new Error('Cannot leave a finished lobby');
    }

    // Check if user is in lobby
    const playerIndex = lobby.players.findIndex(p => p.userId.toString() === userId);
    
    if (playerIndex === -1) {
      throw new Error('You are not in this lobby');
    }

    // Check if user is owner
    if (lobby.ownerId.toString() === userId) {
      throw new Error('Lobby owner cannot leave. Delete the lobby instead.');
    }

    // Remove player
    lobby.players.splice(playerIndex, 1);

    // Update status if was full
    if (lobby.status === 'FULL') {
      lobby.status = 'OPEN';
    }

    await lobby.save();
    logger.info(`User ${userId} left lobby ${lobbyId}`);
    
    return lobby;
  }

  /**
   * Kick player from lobby (owner only)
   */
  async kickPlayer(lobbyId, ownerId, playerUserId) {
    const lobby = await Lobby.findById(lobbyId);
    
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Check if user is the owner
    if (lobby.ownerId.toString() !== ownerId) {
      throw new Error('Only the lobby owner can kick players');
    }

    // Check if player is in lobby
    const playerIndex = lobby.players.findIndex(p => p.userId.toString() === playerUserId);
    
    if (playerIndex === -1) {
      throw new Error('Player not found in this lobby');
    }

    // Can't kick yourself (owner)
    if (playerUserId === ownerId) {
      throw new Error('You cannot kick yourself');
    }

    // Remove player
    const kickedPlayer = lobby.players[playerIndex];
    lobby.players.splice(playerIndex, 1);

    // Update status if was full
    if (lobby.status === 'FULL') {
      lobby.status = 'OPEN';
    }

    await lobby.save();
    logger.info(`User ${playerUserId} kicked from lobby ${lobbyId} by owner ${ownerId}`);
    
    return { lobby, kickedPlayer };
  }

  /**
   * Finish a lobby (owner only)
   */
  async finishLobby(lobbyId, userId) {
    const lobby = await Lobby.findById(lobbyId);
    
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Check if user is the owner
    if (lobby.ownerId.toString() !== userId) {
      throw new Error('Only the lobby owner can finish this lobby');
    }

    if (lobby.status === 'FINISHED') {
      throw new Error('Lobby is already finished');
    }

    if (lobby.status === 'CANCELLED') {
      throw new Error('Cannot finish a cancelled lobby');
    }

    lobby.status = 'FINISHED';
    await lobby.save();
    
    logger.info(`Lobby finished: ${lobbyId} by user ${userId}`);
    return lobby;
  }

  /**
   * Delete/Cancel a lobby (owner only)
   */
  async deleteLobby(lobbyId, userId) {
    const lobby = await Lobby.findById(lobbyId);
    
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Check if user is the owner
    if (lobby.ownerId.toString() !== userId) {
      throw new Error('Only the lobby owner can delete this lobby');
    }

    if (lobby.status === 'FINISHED') {
      // Actually delete finished lobbies
      await Lobby.findByIdAndDelete(lobbyId);
    } else {
      // Cancel ongoing lobbies
      lobby.status = 'CANCELLED';
      await lobby.save();
    }
    
    logger.info(`Lobby deleted/cancelled: ${lobbyId} by user ${userId}`);
    return { message: 'Lobby deleted successfully' };
  }
}

module.exports = new LobbyService();