const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'rating-service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
// TODO: Add rating routes

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Rating Service running on port ${PORT}`);
  });
});
