const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const logger = require('../config/logger');
const rabbitmq = require('../config/rabbitmq');

class UserService {
  /**
   * Get user profile by ID
   */
  async getUserById(userId) {
    logger.debug({ userId }, 'Fetching user by ID');
    
    const user = await User.findById(userId)
      .select('-passwordHash')
      .populate('friends', 'displayName email favouriteSport');
    
    if (!user) {
      logger.warn({ userId }, 'User not found');
      throw new Error('User not found');
    }
    
    logger.debug({ userId }, 'User fetched successfully');
    return user;
  }

  /**
   * Update user profile
   */
  async updateUser(userId, updateData) {
    logger.debug({ userId, updates: Object.keys(updateData) }, 'Updating user profile');
    
    // Don't allow updating certain fields
    const allowedUpdates = ['displayName', 'favouriteSport'];
    const updates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    if (!user) {
      logger.warn({ userId }, 'User not found for update');
      throw new Error('User not found');
    }
    
    logger.info({ userId, updates: Object.keys(updates) }, 'User profile updated');
    return user;
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(fromUserId, toUserId) {
    logger.info({ fromUserId, toUserId }, 'Processing friend request');
    
    // Check if users exist
    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId),
      User.findById(toUserId)
    ]);

    if (!fromUser || !toUser) {
      logger.warn({ fromUserId, toUserId, fromExists: !!fromUser, toExists: !!toUser }, 'User not found');
      throw new Error('User not found');
    }

    if (fromUserId === toUserId) {
      logger.warn({ userId: fromUserId }, 'User attempted to send friend request to themselves');
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if already friends
    if (fromUser.friends.includes(toUserId)) {
      logger.warn({ fromUserId, toUserId }, 'Users are already friends');
      throw new Error('Already friends');
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: toUserId },
        { from: toUserId, to: fromUserId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        logger.warn({ fromUserId, toUserId, requestId: existingRequest._id }, 'Friend request already pending');
        throw new Error('Friend request already pending');
      }
      // Delete old rejected request and create new one
      await FriendRequest.deleteOne({ _id: existingRequest._id });
      logger.debug({ oldRequestId: existingRequest._id }, 'Deleted old friend request');
    }

    const friendRequest = await FriendRequest.create({
      from: fromUserId,
      to: toUserId,
      status: 'pending'
    });

    // Publish to RabbitMQ
    await rabbitmq.publishFriendRequest(fromUserId, toUserId);

    logger.info({
      requestId: friendRequest._id,
      fromUserId,
      toUserId
    }, 'Friend request sent successfully');
    
    return friendRequest;
  }

  /**
   * Get pending friend requests for a user
   */
  async getFriendRequests(userId) {
    logger.debug({ userId }, 'Fetching friend requests');
    
    const requests = await FriendRequest.find({
      to: userId,
      status: 'pending'
    })
      .populate('from', 'displayName email favouriteSport')
      .sort({ createdAt: -1 });

    logger.debug({ userId, count: requests.length }, 'Friend requests fetched');
    return requests;
  }

  /**
   * Respond to friend request (accept/reject) by userId
   */
  async respondToFriendRequest(toUserId, fromUserId, action) {
    logger.info({ toUserId, fromUserId, action }, 'Processing friend request response');
    
    if (!['accept', 'reject'].includes(action)) {
      logger.warn({ action }, 'Invalid action provided');
      throw new Error('Invalid action. Must be "accept" or "reject"');
    }

    const friendRequest = await FriendRequest.findOne({
      from: fromUserId,
      to: toUserId,
      status: 'pending'
    });

    if (!friendRequest) {
      logger.warn({ toUserId, fromUserId }, 'Friend request not found');
      throw new Error('Friend request not found');
    }

    if (action === 'accept') {
      // Populate both friends lists
      await Promise.all([
        User.findByIdAndUpdate(friendRequest.from, {
          $addToSet: { friends: friendRequest.to }
        }),
        User.findByIdAndUpdate(friendRequest.to, {
          $addToSet: { friends: friendRequest.from }
        })
      ]);

      friendRequest.status = 'accepted';
      logger.info({
        requestId: friendRequest._id,
        fromUserId,
        toUserId
      }, 'Friend request accepted');
    } else {
      friendRequest.status = 'rejected';
      logger.info({
        requestId: friendRequest._id,
        fromUserId,
        toUserId
      }, 'Friend request rejected');
    }

    await friendRequest.save();
    return friendRequest;
  }

  /**
   * Remove friend
   */
  async removeFriend(userId, friendId) {
    logger.info({ userId, friendId }, 'Removing friend');
    
    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId)
    ]);

    if (!user || !friend) {
      logger.warn({ userId, friendId, userExists: !!user, friendExists: !!friend }, 'User not found');
      throw new Error('User not found');
    }

    if (!user.friends.includes(friendId)) {
      logger.warn({ userId, friendId }, 'Users are not friends');
      throw new Error('Not friends');
    }

    // Remove from both users' friends lists
    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $pull: { friends: friendId }
      }),
      User.findByIdAndUpdate(friendId, {
        $pull: { friends: userId }
      })
    ]);

    logger.info({ userId, friendId }, 'Friend removed successfully');
    return { message: 'Friend removed successfully' };
  }
}

module.exports = new UserService();