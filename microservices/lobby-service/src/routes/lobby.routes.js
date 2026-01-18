const router = require('express').Router();
const lobbyController = require('../controllers/lobby.controller');
const { auth } = require('../middleware/auth');

/**
 * POST /lobbies
 * Create a new lobby (authenticated users only)
 */
router.post('/', auth, lobbyController.createLobby);

/**
 * GET /lobbies
 * Get all lobbies (with optional sport filter via query param)
 */
router.get('/', lobbyController.getLobbies);

/**
 * GET /lobbies/:id
 * Get a specific lobby by ID
 */
router.get('/:id', lobbyController.getLobbyById);

/**
 * PUT /lobbies/:id
 * Update lobby (owner only)
 */
router.put('/:id', auth, lobbyController.updateLobby);

/**
 * POST /lobbies/:id/join
 * Join a lobby
 */
router.post('/:id/join', auth, lobbyController.joinLobby);

/**
 * POST /lobbies/:id/leave
 * Leave a lobby
 */
router.post('/:id/leave', auth, lobbyController.leaveLobby);

/**
 * DELETE /lobbies/:id/players/:playerId
 * Kick a player from lobby (owner only)
 */
router.delete('/:id/players/:playerId', auth, lobbyController.kickPlayer);

/**
 * PUT /lobbies/:id/finish
 * Mark lobby as finished (owner only)
 */
router.put('/:id/finish', auth, lobbyController.finishLobby);

/**
 * DELETE /lobbies/:id
 * Delete/Cancel a lobby (owner only)
 */
router.delete('/:id', auth, lobbyController.deleteLobby);

module.exports = router;