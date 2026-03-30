import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import botRoutes from './routes/bot.js';
import marketplaceRoutes from './routes/marketplace.js';
import paymentRoutes from './routes/payment.js';
import telegramBotFactory from './services/telegramBotFactory.js';
import emailForwardingService from './services/EmailForwardingService.js';
import checkDatabaseSchema from './config/schema-check.js';
import './config/database.js'; // Initialize Supabase connection

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || 5000, 10);

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP (login/signup)
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
  },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/payments', paymentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Botify API is running!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server with graceful error handling
let server;
const startServer = (port) => {
  server = app.listen(port, async () => {
    console.log(`\n🚀 Botify Backend Server is running on port ${port}`);
    console.log(`📡 API available at http://localhost:${port}/api`);
    console.log(`🏥 Health check: http://localhost:${port}/api/health\n`);

    // Check database schema
    try {
      await checkDatabaseSchema();
    } catch (err) {
      console.warn('⚠️  Schema check failed:', err.message);
    }

    try {
      await telegramBotFactory.initialize();
      telegramBotFactory.startAutoRefresh();
    } catch (err) {
      console.error('Telegram Bot Factory failed to initialize:', err.message);
    }

    // Start Email Forwarding Service
    try {
      await emailForwardingService.start();
      console.log('✅ Email Forwarding Service started');
    } catch (err) {
      console.error('Email Forwarding Service failed to initialize:', err.message);
    }
  });

  // Handle port already in use error
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️  Port ${port} is already in use!`);
      console.log(`🔄 Attempting to use port ${port + 1}...`);
      server.close();
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
};

startServer(PORT);

// Graceful shutdown - unified handler
const gracefulShutdown = async () => {
  console.log('\n📌 Shutdown signal received: closing services');
  
  // Close HTTP server
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
  }

  // Shutdown Telegram bot factory
  try {
    await telegramBotFactory.shutdown();
    console.log('✅ Telegram Bot Factory shutdown complete');
  } catch (err) {
    console.error('⚠️ Telegram Bot Factory shutdown error:', err.message);
  }

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
