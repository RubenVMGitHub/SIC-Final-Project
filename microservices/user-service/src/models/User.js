const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    role: {
      type: String,
      enum: ['player', 'admin'],
      default: 'player',
    },
  },
  { timestamps: true }
);

// optional index optimization for login queries
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
