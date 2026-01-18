const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    lobbyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['LIKE', 'DISLIKE'],
      required: true
    },
    category: {
      type: String,
      enum: ['Friendly', 'Communicative', 'Sporty', 'Fair', 'Toxic', 'Aggressive', 'Sloppy', 'Unfair'],
      required: true
    }
  },
  { timestamps: true }
);

// ensures one rating per user per match
ratingSchema.index({ fromUserId: 1, toUserId: 1, lobbyId: 1 }, { unique: true });

ratingSchema.index({ toUserId: 1, createdAt: -1 });

module.exports = mongoose.model('Rating', ratingSchema);