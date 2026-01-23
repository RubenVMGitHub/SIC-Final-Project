const Rating = require('../models/Rating');
const lobbyService = require('./lobby.service');
const logger = require('../config/logger');

class RatingService {
  /**
   * Submit a rating
   */
  async submitRating(fromUserId, ratingData) {
    const { toUserId, lobbyId, type, category } = ratingData;

    logger.debug({
      fromUserId,
      toUserId,
      lobbyId,
      type,
      category
    }, 'Validating rating submission');

    // Validate that user is not rating themselves
    if (fromUserId === toUserId) {
      logger.warn({ fromUserId, toUserId }, 'User attempted to rate themselves');
      throw new Error('You cannot rate yourself');
    }

    // Check if user can rate in this lobby
    const eligibility = await lobbyService.canUserRateInLobby(fromUserId, lobbyId);
    
    if (!eligibility.canRate) {
      logger.warn({
        fromUserId,
        lobbyId,
        reason: eligibility.reason
      }, 'User not eligible to rate in lobby');
      throw new Error(eligibility.reason);
    }

    // Check if rated user was in the lobby
    const lobbyPlayers = await lobbyService.getLobbyPlayers(lobbyId, fromUserId);
    const targetUserInLobby = lobbyPlayers.some(p => p.userId.toString() === toUserId);
    
    if (!targetUserInLobby) {
      logger.warn({
        fromUserId,
        toUserId,
        lobbyId
      }, 'Target user was not in the lobby');
      throw new Error('Target user was not in this match');
    }

    // Validate type and category combination
    const likeCategories = ['Friendly', 'Communicative', 'Sporty', 'Fair'];
    const dislikeCategories = ['Toxic', 'Aggressive', 'Sloppy', 'Unfair'];

    if (type === 'LIKE' && !likeCategories.includes(category)) {
      logger.warn({
        type,
        category,
        validCategories: likeCategories
      }, 'Invalid category for LIKE rating');
      throw new Error(`Invalid category for LIKE. Must be one of: ${likeCategories.join(', ')}`);
    }

    if (type === 'DISLIKE' && !dislikeCategories.includes(category)) {
      logger.warn({
        type,
        category,
        validCategories: dislikeCategories
      }, 'Invalid category for DISLIKE rating');
      throw new Error(`Invalid category for DISLIKE. Must be one of: ${dislikeCategories.join(', ')}`);
    }

    // Check if user already rated this person in this match
    const existingRating = await Rating.findOne({
      fromUserId,
      toUserId,
      lobbyId
    });

    if (existingRating) {
      logger.warn({
        fromUserId,
        toUserId,
        lobbyId,
        existingRatingId: existingRating._id
      }, 'User already rated this player in this lobby');
      throw new Error('You have already rated this user for this match');
    }

    // Create the rating
    const rating = await Rating.create({
      fromUserId,
      toUserId,
      lobbyId,
      type,
      category
    });

    logger.info({
      ratingId: rating._id,
      fromUserId,
      toUserId,
      lobbyId,
      type,
      category
    }, 'Rating created successfully');
    
    return rating;
  }

  /**
   * Get ratings received by a user (without sender information)
   */
  async getMyRatings(userId, filters = {}) {
    const query = { toUserId: userId };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    logger.debug({ userId, filters }, 'Fetching ratings from database');

    const ratings = await Rating.find(query)
      .select('-fromUserId -__v') // excludes sender to maintain anonymity
      .sort({ createdAt: -1 });

    logger.debug({
      userId,
      count: ratings.length,
      filters
    }, 'Ratings fetched successfully');

    return ratings;
  }

  /**
   * Get rating statistics for a user
   */
  async getUserRatingStats(userId) {
    logger.debug({ userId }, 'Calculating rating statistics');

    const ratings = await Rating.find({ toUserId: userId });

    const stats = {
      totalRatings: ratings.length,
      likes: {
        total: 0,
        Friendly: 0,
        Communicative: 0,
        Sporty: 0,
        Fair: 0
      },
      dislikes: {
        total: 0,
        Toxic: 0,
        Aggressive: 0,
        Sloppy: 0,
        Unfair: 0
      }
    };

    ratings.forEach(rating => {
      if (rating.type === 'LIKE') {
        stats.likes.total++;
        stats.likes[rating.category]++;
      } else {
        stats.dislikes.total++;
        stats.dislikes[rating.category]++;
      }
    });

    logger.debug({
      userId,
      totalRatings: stats.totalRatings,
      likes: stats.likes.total,
      dislikes: stats.dislikes.total
    }, 'Rating statistics calculated');

    return stats;
  }

  /**
   * Get eligible users to rate in a specific lobby
   */
  async getEligibleUsersToRate(userId, lobbyId) {
    logger.debug({ userId, lobbyId }, 'Finding eligible users to rate');

    // Check if user can rate in this lobby
    const eligibility = await lobbyService.canUserRateInLobby(userId, lobbyId);
    
    if (!eligibility.canRate) {
      logger.warn({
        userId,
        lobbyId,
        reason: eligibility.reason
      }, 'User cannot rate in lobby');
      throw new Error(eligibility.reason);
    }

    // Get all players except the current user
    const lobbyPlayers = await lobbyService.getLobbyPlayers(lobbyId, userId);

    // Get users already rated in this lobby
    const existingRatings = await Rating.find({
      fromUserId: userId,
      lobbyId
    }).select('toUserId');

    const ratedUserIds = existingRatings.map(r => r.toUserId.toString());

    // Filter out already rated users
    const eligiblePlayers = lobbyPlayers.filter(
      p => !ratedUserIds.includes(p.userId.toString())
    );

    logger.info({
      userId,
      lobbyId,
      totalPlayers: lobbyPlayers.length,
      alreadyRated: ratedUserIds.length,
      eligible: eligiblePlayers.length
    }, 'Eligible users calculated');

    return eligiblePlayers;
  }
}

module.exports = new RatingService();