const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { auth, isAdmin } = require('../middleware/auth');

/**
 * POST /users
 * Register a new user
 */
router.post('/', userController.register);
// #swagger.tags = ['Users']
// #swagger.description = 'Register a new user'
/* #swagger.parameters['body'] = {
  in: 'body',
  description: 'User registration data',
  required: true,
  schema: { 
    email: 'user@example.com',
    password: 'password123',
    displayName: 'John Doe',
    favouriteSport: 'Football'
  }
} */

/**
 * POST /users/login
 * Login user
 */
router.post('/login', userController.login);
// #swagger.tags = ['Users']
// #swagger.description = 'Login with email and password'

/**
 * GET /users/me
 * Get current user profile (authenticated user only)
 */
router.get('/me', auth, userController.me);
// #swagger.tags = ['Users']
// #swagger.description = 'Get current authenticated user profile'
// #swagger.security = [{ "bearerAuth": [] }]

/**
 * PATCH /users/me
 * Update current user profile (authenticated user only)
 */
router.patch('/me', auth, userController.updateMe);
// #swagger.tags = ['Users']
// #swagger.description = 'Update current user profile'
// #swagger.security = [{ "bearerAuth": [] }]

/**
 * PATCH /users/:id
 * Update user by ID (admin or own profile)
 */
router.patch('/:id', auth, userController.updateUserById);
// #swagger.tags = ['Users']
// #swagger.description = 'Update user profile by ID (admin or own profile only)'
// #swagger.security = [{ "bearerAuth": [] }]

/**
 * POST /users/friend-requests
 * Send a friend request
 */
router.post('/friend-requests', auth, userController.sendFriendRequest);
// #swagger.tags = ['Friends']
// #swagger.description = 'Send a friend request to another user'
// #swagger.security = [{ "bearerAuth": [] }]

/**
 * GET /users/friend-requests
 * Get pending friend requests
 */
router.get('/friend-requests', auth, userController.getFriendRequests);
// #swagger.tags = ['Friends']
// #swagger.description = 'Get all pending friend requests for the current user'
// #swagger.security = [{ "bearerAuth": [] }]

/**
 * POST /users/friend-requests/:userId/resolve
 * Accept or reject a friend request
 */
router.post('/friend-requests/:userId/resolve', auth, userController.respondToFriendRequest);
// #swagger.tags = ['Friends']
// #swagger.description = 'Respond to a friend request (accept/reject)'
// #swagger.security = [{ "bearerAuth": [] }]

/**
 * DELETE /users/friends/:friendId
 * Remove a friend
 */
router.delete('/friends/:friendId', auth, userController.removeFriend);
// #swagger.tags = ['Friends']
// #swagger.description = 'Remove a friend from your friends list'
// #swagger.security = [{ "bearerAuth": [] }]

module.exports = router;