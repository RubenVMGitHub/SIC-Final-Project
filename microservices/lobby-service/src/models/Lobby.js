const mongoose = require('mongoose');

const lobbySchema = new mongoose.Schema(
  {
    sport: {
      type: String,
      required: true,
      enum: ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Swimming', 'Running', 'Cycling'],
      index: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    time: {
      type: Date,
      required: true,
      index: true
    },
    maxPlayers: {
      type: Number,
      required: true,
      min: 2,
      max: 50
    },
    players: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        displayName: {
          type: String,
          required: true
        }
      }
    ],
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'FULL', 'FINISHED', 'CANCELLED'],
      default: 'OPEN',
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

lobbySchema.index({ sport: 1, status: 1 });
lobbySchema.index({ status: 1, time: 1 });

module.exports = mongoose.model('Lobby', lobbySchema);