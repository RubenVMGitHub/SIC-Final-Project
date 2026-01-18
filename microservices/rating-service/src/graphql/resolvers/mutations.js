const ratingService = require('../../services/rating.service');
const logger = require('../../config/logger');

const mutations = {
  submitRating: async (_, { input }, context) => {
    const user = context.user;
    
    if (!user) {
      throw new Error('Authentication required');
    }

    logger.info(`User ${user.sub} submitting rating for user ${input.toUserId}`);
    
    return await ratingService.submitRating(user.sub, input);
  }
};

module.exports = mutations;