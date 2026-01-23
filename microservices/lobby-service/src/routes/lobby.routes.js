const router = require('express').Router();
const lobbyController = require('../controllers/lobby.controller');
const { auth } = require('../middleware/auth');

/**
 * @swagger
 * /lobbies:
 *   post:
 *     summary: Create a new lobby
 *     description: Create a new sports lobby (requires authentication)
 *     tags: [Lobbies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LobbyInput'
 *     responses:
 *       201:
 *         description: Lobby created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lobby'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', auth, lobbyController.createLobby);

/**
 * @swagger
 * /lobbies:
 *   get:
 *     summary: Get all lobbies
 *     description: Retrieve all lobbies with optional filters
 *     tags: [Lobbies]
 *     parameters:
 *       - in: query
 *         name: sport
 *         schema:
 *           type: string
 *           enum: [Football, Basketball, Tennis, Volleyball, Badminton, Swimming, Running, Cycling]
 *         description: Filter lobbies by sport type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, FULL, FINISHED, CANCELLED]
 *         description: Filter lobbies by status (default shows OPEN and FULL)
 *     responses:
 *       200:
 *         description: List of lobbies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lobby'
 *       400:
 *         description: Invalid filter parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', lobbyController.getLobbies);

/**
 * @swagger
 * /lobbies/{id}:
 *   get:
 *     summary: Get lobby by ID
 *     description: Retrieve a specific lobby by its ID
 *     tags: [Lobbies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lobby ID (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Lobby details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lobby'
 *       400:
 *         description: Invalid lobby ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lobby not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', lobbyController.getLobbyById);

/**
 * @swagger
 * /lobbies/{id}:
 *   patch:
 *     summary: Update lobby
 *     description: Update lobby details (owner only)
 *     tags: [Lobbies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lobby ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LobbyUpdate'
 *     responses:
 *       200:
 *         description: Lobby updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lobby'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Only owner can update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lobby not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id', auth, lobbyController.updateLobby);

/**
 * @swagger
 * /lobbies/{id}/join:
 *   post:
 *     summary: Join a lobby
 *     description: Join an existing lobby as a player
 *     tags: [Lobbies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lobby ID
 *     responses:
 *       200:
 *         description: Successfully joined lobby
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lobby'
 *       400:
 *         description: Cannot join lobby (full, already joined, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lobby not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/join', auth, lobbyController.joinLobby);

/**
 * @swagger
 * /lobbies/{id}/leave:
 *   post:
 *     summary: Leave a lobby
 *     description: Leave a lobby you have joined
 *     tags: [Lobbies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lobby ID
 *     responses:
 *       200:
 *         description: Successfully left lobby
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lobby'
 *       400:
 *         description: Cannot leave lobby (not in lobby, owner cannot leave, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lobby not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/leave', auth, lobbyController.leaveLobby);

/**
 * @swagger
 * /lobbies/{id}/players/{playerId}:
 *   delete:
 *     summary: Kick a player from lobby
 *     description: Remove a player from the lobby (owner only)
 *     tags: [Lobbies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lobby ID
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Player User ID to kick
 *     responses:
 *       200:
 *         description: Player kicked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Player John Doe kicked successfully"
 *                 lobby:
 *                   $ref: '#/components/schemas/Lobby'
 *       400:
 *         description: Invalid request (cannot kick yourself, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Only owner can kick players
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lobby or player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id/players/:playerId', auth, lobbyController.kickPlayer);

/**
 * @swagger
 * /lobbies/{id}/finish:
 *   patch:
 *     summary: Finish a lobby
 *     description: Mark a lobby as finished (owner only)
 *     tags: [Lobbies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lobby ID
 *     responses:
 *       200:
 *         description: Lobby finished successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lobby'
 *       400:
 *         description: Cannot finish lobby (already finished, cancelled, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Only owner can finish lobby
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lobby not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/finish', auth, lobbyController.finishLobby);

/**
 * @swagger
 * /lobbies/{id}:
 *   delete:
 *     summary: Delete/Cancel a lobby
 *     description: Delete a finished lobby or cancel an ongoing lobby (owner only)
 *     tags: [Lobbies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lobby ID
 *     responses:
 *       200:
 *         description: Lobby deleted/cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lobby deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Only owner can delete lobby
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lobby not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', auth, lobbyController.deleteLobby);

module.exports = router;