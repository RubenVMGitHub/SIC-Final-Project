const ratingService = require('../../services/rating.service');
const logger = require('../../config/logger');

const queries = {
  myRatings: async (_, { type, category }, context) => {
    const user = context.user;
    
    if (!user) {
      throw new Error('Authentication required');
    }

    logger.info(`Fetching ratings for user: ${user.sub}`);
    
    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;

    return await ratingService.getMyRatings(user.sub, filters);
  },

  myRatingStats: async (_, __, context) => {
    const user = context.user;
    
    if (!user) {
      throw new Error('Authentication required');
    }

    logger.info(`Fetching rating stats for user: ${user.sub}`);
    
    return await ratingService.getUserRatingStats(user.sub);
  },

  eligibleUsersToRate: async (_, { lobbyId }, context) => {
    const user = context.user;
    
    if (!user) {
      throw new Error('Authentication required');
    }

    logger.info(`Fetching eligible users to rate in lobby: ${lobbyId}`);
    
    return await ratingService.getEligibleUsersToRate(user.sub, lobbyId);
  }
};

module.exports = queries;