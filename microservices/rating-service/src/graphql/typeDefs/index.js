const { gql } = require('graphql-tag');

const typeDefs = gql`
  """
  Rating Service for Sports Matchmaking Platform
  
  This service allows users to rate fellow players after completing matches together.
  Users can submit positive (LIKE) or negative (DISLIKE) ratings with specific categories.
  
  **Rating Rules:**
  - Users can only rate players from finished lobbies
  - Rating window: 72 hours after match completion
  - One rating per user per match
  - Cannot rate yourself
  - Ratings are anonymous (sender identity hidden)
  
  **Authentication:**
  All operations require JWT Bearer token in Authorization header
  """
  type Query {
    """
    Get all ratings received by the authenticated user
    
    Returns ratings without revealing who sent them (anonymous).
    Optional filters can be applied by type or category.
    
    **Authentication Required:** Yes
    
    **Example:**
    \`\`\`graphql
    query {
      myRatings(type: LIKE) {
        _id
        type
        category
        lobbyId
        createdAt
      }
    }
    \`\`\`
    """
    myRatings(
      "Filter by rating type (LIKE or DISLIKE)"
      type: RatingType
      
      "Filter by specific category"
      category: RatingCategory
    ): [Rating!]!
    
    """
    Get aggregated rating statistics for the authenticated user
    
    Provides a summary of all ratings received, broken down by type and category.
    
    **Authentication Required:** Yes
    
    **Example:**
    \`\`\`graphql
    query {
      myRatingStats {
        totalRatings
        likes {
          total
          Friendly
          Communicative
        }
        dislikes {
          total
          Toxic
        }
      }
    }
    \`\`\`
    """
    myRatingStats: RatingStats!
    
    """
    Get list of players eligible to rate in a specific lobby
    
    Returns players from the specified lobby that:
    - You haven't rated yet
    - Were in the same finished match
    - Rating window is still open (within 72 hours)
    
    **Authentication Required:** Yes
    
    **Example:**
    \`\`\`graphql
    query {
      eligibleUsersToRate(lobbyId: "507f1f77bcf86cd799439011") {
        userId
        displayName
      }
    }
    \`\`\`
    """
    eligibleUsersToRate(
      "Lobby/Match ID to check for eligible players"
      lobbyId: ID!
    ): [LobbyPlayer!]!
  }

  type Mutation {
    """
    Submit a rating for another player
    
    Rate a player you played with in a finished match. You can provide
    one LIKE or DISLIKE with a specific category.
    
    **Authentication Required:** Yes
    
    **Validation:**
    - Lobby must be FINISHED
    - Within 72 hours of match completion
    - Both users must have been in the lobby
    - Cannot rate yourself
    - Cannot rate the same user twice for the same match
    - Category must match rating type
    
    **LIKE Categories:**
    - Friendly: Pleasant to play with
    - Communicative: Good team communication
    - Sporty: Shows good sportsmanship
    - Fair: Plays fairly
    
    **DISLIKE Categories:**
    - Toxic: Negative behavior
    - Aggressive: Overly aggressive play
    - Sloppy: Poor performance
    - Unfair: Unfair play
    
    **Example:**
    \`\`\`graphql
    mutation {
      submitRating(input: {
        toUserId: "507f1f77bcf86cd799439012"
        lobbyId: "507f1f77bcf86cd799439013"
        type: LIKE
        category: Friendly
      }) {
        _id
        type
        category
        createdAt
      }
    }
    \`\`\`
    """
    submitRating(
      "Rating input data"
      input: SubmitRatingInput!
    ): Rating!
  }

  """
  Type of rating: positive (LIKE) or negative (DISLIKE)
  """
  enum RatingType {
    "Positive rating"
    LIKE
    
    "Negative rating"
    DISLIKE
  }

  """
  Specific category for the rating
  
  Categories are divided into:
  - LIKE categories: Friendly, Communicative, Sporty, Fair
  - DISLIKE categories: Toxic, Aggressive, Sloppy, Unfair
  """
  enum RatingCategory {
    # LIKE categories (positive traits)
    "Pleasant and friendly to play with"
    Friendly
    
    "Good team communication"
    Communicative
    
    "Shows good sportsmanship"
    Sporty
    
    "Plays fairly and follows rules"
    Fair
    
    # DISLIKE categories (negative traits)
    "Displays toxic behavior"
    Toxic
    
    "Overly aggressive or confrontational"
    Aggressive
    
    "Poor performance or effort"
    Sloppy
    
    "Unfair play or cheating"
    Unfair
  }

  """
  Input for submitting a new rating
  """
  input SubmitRatingInput {
    "ID of the user being rated"
    toUserId: ID!
    
    "ID of the lobby/match where you played together"
    lobbyId: ID!
    
    "Type of rating (LIKE or DISLIKE)"
    type: RatingType!
    
    "Specific category for the rating"
    category: RatingCategory!
  }

  """
  Rating entity (anonymized - sender information hidden)
  """
  type Rating {
    "Unique rating identifier"
    _id: ID!
    
    "ID of the user who received this rating (always current user in queries)"
    toUserId: ID!
    
    "ID of the lobby/match where the rating was given"
    lobbyId: ID!
    
    "Type of rating"
    type: RatingType!
    
    "Specific category"
    category: RatingCategory!
    
    "When the rating was created (ISO 8601 format)"
    createdAt: String!
  }

  """
  Aggregated rating statistics for a user
  """
  type RatingStats {
    "Total number of ratings received"
    totalRatings: Int!
    
    "Breakdown of positive ratings"
    likes: LikeStats!
    
    "Breakdown of negative ratings"
    dislikes: DislikeStats!
  }

  """
  Statistics for positive (LIKE) ratings
  """
  type LikeStats {
    "Total LIKE ratings"
    total: Int!
    
    "Number of 'Friendly' ratings"
    Friendly: Int!
    
    "Number of 'Communicative' ratings"
    Communicative: Int!
    
    "Number of 'Sporty' ratings"
    Sporty: Int!
    
    "Number of 'Fair' ratings"
    Fair: Int!
  }

  """
  Statistics for negative (DISLIKE) ratings
  """
  type DislikeStats {
    "Total DISLIKE ratings"
    total: Int!
    
    "Number of 'Toxic' ratings"
    Toxic: Int!
    
    "Number of 'Aggressive' ratings"
    Aggressive: Int!
    
    "Number of 'Sloppy' ratings"
    Sloppy: Int!
    
    "Number of 'Unfair' ratings"
    Unfair: Int!
  }

  """
  Player from a lobby (minimal information for rating purposes)
  """
  type LobbyPlayer {
    "User ID of the player"
    userId: ID!
    
    "Display name of the player"
    displayName: String!
  }
`;

module.exports = typeDefs;