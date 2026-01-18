const axios = require('axios');
const logger = require('../config/logger');

const LOBBY_SERVICE_URL = process.env.LOBBY_SERVICE_URL || 'http://lobby-service:3002';

class LobbyService {
  /**
   * Get lobby by ID from lobby-service
   */
  async getLobbyById(lobbyId) {
    try {
      const response = await axios.get(`${LOBBY_SERVICE_URL}/lobbies/${lobbyId}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error('Lobby not found');
      }
      logger.error(`Error fetching lobby ${lobbyId}: ${error.message}`);
      throw new Error('Failed to fetch lobby information');
    }
  }

  /**
   * Check if user was in a finished lobby within 72 hours
   */
  async canUserRateInLobby(userId, lobbyId) {
    try {
      const lobby = await this.getLobbyById(lobbyId);
      
      // Check if lobby is finished
      if (lobby.status !== 'FINISHED') {
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
        return {
          canRate: false,
          reason: 'Rating period expired (72 hours after match ended)'
        };
      }

      // Check if user was in the lobby
      const wasInLobby = lobby.players.some(p => p.userId.toString() === userId);
      
      if (!wasInLobby) {
        return {
          canRate: false,
          reason: 'You were not in this match'
        };
      }

      return {
        canRate: true,
        lobby
      };
    } catch (error) {
      logger.error(`Error checking rating eligibility: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all players from a lobby except the specified user
   */
  async getLobbyPlayers(lobbyId, excludeUserId) {
    const lobby = await this.getLobbyById(lobbyId);
    return lobby.players.filter(p => p.userId.toString() !== excludeUserId);
  }
}

module.exports = new LobbyService();