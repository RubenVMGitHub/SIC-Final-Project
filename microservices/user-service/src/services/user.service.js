const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const logger = require('../config/logger');
const rabbitmq = require('../config/rabbitmq');

class UserService {
  /**
   * Get user profile by ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId)
      .select('-passwordHash')
      .populate('friends', 'displayName email favouriteSport');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  /**
   * Update user profile
   */
  async updateUser(userId, updateData) {
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
      throw new Error('User not found');
    }
    
    logger.info(`User updated: ${userId}`);
    return user;
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(fromUserId, toUserId) {
    // Check if users exist
    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId),
      User.findById(toUserId)
    ]);

    if (!fromUser || !toUser) {
      throw new Error('User not found');
    }

    if (fromUserId === toUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if already friends
    if (fromUser.friends.includes(toUserId)) {
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
        throw new Error('Friend request already pending');
      }
      // Delete old rejected request and create new one
      await FriendRequest.deleteOne({ _id: existingRequest._id });
    }

    const friendRequest = await FriendRequest.create({
      from: fromUserId,
      to: toUserId,
      status: 'pending'
    });

    await rabbitmq.publishFriendRequest(fromUserId, toUserId);

    logger.info(`Friend request sent from ${fromUserId} to ${toUserId}`);
    return friendRequest;
  }

  /**
   * Get pending friend requests for a user
   */
  async getFriendRequests(userId) {
    const requests = await FriendRequest.find({
      to: userId,
      status: 'pending'
    })
      .populate('from', 'displayName email favouriteSport')
      .sort({ createdAt: -1 });

    return requests;
  }

  /**
   * Respond to friend request (accept/reject)
   */
  async respondToFriendRequest(requestId, userId, action) {
    if (!['accept', 'reject'].includes(action)) {
      throw new Error('Invalid action. Must be "accept" or "reject"');
    }

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      throw new Error('Friend request not found');
    }

    // verifies that the request is for this user
    if (friendRequest.to.toString() !== userId) {
      throw new Error('Unauthorized to respond to this request');
    }

    if (friendRequest.status !== 'pending') {
      throw new Error('Friend request already processed');
    }

    if (action === 'accept') {
      // populates both friends lists
      await Promise.all([
        User.findByIdAndUpdate(friendRequest.from, {
          $addToSet: { friends: friendRequest.to }
        }),
        User.findByIdAndUpdate(friendRequest.to, {
          $addToSet: { friends: friendRequest.from }
        })
      ]);

      friendRequest.status = 'accepted';
      logger.info(`Friend request accepted: ${requestId}`);
    } else {
      friendRequest.status = 'rejected';
      logger.info(`Friend request rejected: ${requestId}`);
    }

    await friendRequest.save();
    return friendRequest;
  }

  /**
   * Remove friend
   */
  async removeFriend(userId, friendId) {
    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId)
    ]);

    if (!user || !friend) {
      throw new Error('User not found');
    }

    if (!user.friends.includes(friendId)) {
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

    logger.info(`Friend removed: ${userId} and ${friendId}`);
    return { message: 'Friend removed successfully' };
  }
}

module.exports = new UserService();