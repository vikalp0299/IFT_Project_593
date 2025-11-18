import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { config } from './config.js';
import privateKeyRoutes from './routes/privateKeyRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Private Key Management Server is healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptime: process.uptime()
  });
});

// API routes
app.use('/', privateKeyRoutes);
app.use('/', permissionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Connect to MongoDB
mongoose.connect(config.mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start server
  app.listen(config.port, () => {
    console.log(`🚀 Private Key Management Server running on port ${config.port}`);
    console.log(`📡 Health check: http://localhost:${config.port}/health`);
    console.log(`🔐 Environment: ${config.nodeEnv}`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

export default app;


