require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/user.routes');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('=== USER SERVICE STARTING ===');

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[User Service] ${req.method} ${req.url}`);
  console.log('Body:', req.body);
  next();
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
};

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'user-service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/users', userRoutes);

// Error handling
app.use(errorHandler);

// Start server
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ User Service running on port ${PORT}`);
  });
});