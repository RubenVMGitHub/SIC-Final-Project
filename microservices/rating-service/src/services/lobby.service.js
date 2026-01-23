const axios = require('axios');
const logger = require('../config/logger');

const LOBBY_SERVICE_URL = process.env.LOBBY_SERVICE_URL || 'http://lobby-service:3002';

class LobbyService {
  /**
   * Get lobby by ID from lobby-service
   */
  async getLobbyById(lobbyId) {
    logger.debug({ lobbyId, serviceUrl: LOBBY_SERVICE_URL }, 'Fetching lobby from lobby-service');

    try {
      const response = await axios.get(`${LOBBY_SERVICE_URL}/lobbies/${lobbyId}`, {
        timeout: 5000
      });
      
      logger.debug({ lobbyId, status: response.data.status }, 'Lobby fetched successfully');
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logger.warn({ lobbyId }, 'Lobby not found');
        throw new Error('Lobby not found');
      }
      
      logger.error({
        lobbyId,
        error: error.message,
        code: error.code,
        response: error.response?.data
      }, 'Error fetching lobby from lobby-service');
      
      throw new Error('Failed to fetch lobby information');
    }
  }

  /**
   * Check if user was in a finished lobby within 72 hours
   */
  async canUserRateInLobby(userId, lobbyId) {
    logger.debug({ userId, lobbyId }, 'Checking user rating eligibility');

    try {
      const lobby = await this.getLobbyById(lobbyId);
      
      // Check if lobby is finished
      if (lobby.status !== 'FINISHED') {
        logger.debug({
          userId,
          lobbyId,
          currentStatus: lobby.status
        }, 'Lobby is not finished');
        
        return {
          canRate: false,
          reason: 'Lobby is not finished yet'
        };
      }

      // Check if finished within 72 hours
      const lobbyFinishTime = new Date(lobby.updatedAt);
      const now = new Date();
      const hoursDiff = (now - lobbyFinishTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 72) {
        logger.debug({
          userId,
          lobbyId,
          hoursSinceFinish: hoursDiff.toFixed(2)
        }, 'Rating period expired');
        
        return {
          canRate: false,
          reason: 'Rating period expired (72 hours after match ended)'
        };
      }

      // Check if user was in the lobby
      const wasInLobby = lobby.players.some(p => p.userId.toString() === userId);
      
      if (!wasInLobby) {
        logger.warn({ userId, lobbyId }, 'User was not in the lobby');
        return {
          canRate: false,
          reason: 'You were not in this match'
        };
      }

      logger.debug({
        userId,
        lobbyId,
        hoursSinceFinish: hoursDiff.toFixed(2)
      }, 'User is eligible to rate');

      return {
        canRate: true,
        lobby
      };
    } catch (error) {
      logger.error({
        userId,
        lobbyId,
        error: error.message
      }, 'Error checking rating eligibility');
      throw error;
    }
  }

  /**
   * Get all players from a lobby except the specified user
   */
  async getLobbyPlayers(lobbyId, excludeUserId) {
    logger.debug({ lobbyId, excludeUserId }, 'Fetching lobby players');

    const lobby = await this.getLobbyById(lobbyId);
    const players = lobby.players.filter(p => p.userId.toString() !== excludeUserId);
    
    logger.debug({
      lobbyId,
      totalPlayers: lobby.players.length,
      filteredPlayers: players.length
    }, 'Lobby players fetched');
    
    return players;
  }
}

module.exports = new LobbyService();