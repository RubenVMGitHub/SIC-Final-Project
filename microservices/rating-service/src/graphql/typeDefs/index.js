const { gql } = require('graphql-tag');

const typeDefs = gql`
  type Query {
    """
    Get ratings received by the authenticated user
    """
    myRatings(type: RatingType, category: RatingCategory): [Rating!]!
    
    """
    Get rating statistics for the authenticated user
    """
    myRatingStats: RatingStats!
    
    """
    Get users eligible to rate in a specific lobby
    """
    eligibleUsersToRate(lobbyId: ID!): [LobbyPlayer!]!
  }

  type Mutation {
    """
    Submit a rating for another user
    """
    submitRating(input: SubmitRatingInput!): Rating!
  }

  enum RatingType {
    LIKE
    DISLIKE
  }

  enum RatingCategory {
    # LIKE categories
    Friendly
    Communicative
    Sporty
    Fair
    # DISLIKE categories
    Toxic
    Aggressive
    Sloppy
    Unfair
  }

  input SubmitRatingInput {
    toUserId: ID!
    lobbyId: ID!
    type: RatingType!
    category: RatingCategory!
  }

  type Rating {
    _id: ID!
    toUserId: ID!
    lobbyId: ID!
    type: RatingType!
    category: RatingCategory!
    createdAt: String!
  }

  type RatingStats {
    totalRatings: Int!
    likes: LikeStats!
    dislikes: DislikeStats!
  }

  type LikeStats {
    total: Int!
    Friendly: Int!
    Communicative: Int!
    Sporty: Int!
    Fair: Int!
  }

  type DislikeStats {
    total: Int!
    Toxic: Int!
    Aggressive: Int!
    Sloppy: Int!
    Unfair: Int!
  }

  type LobbyPlayer {
    userId: ID!
    displayName: String!
  }
`;

module.exports = typeDefs;