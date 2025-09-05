import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import route handlers
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import imageRoutes from './routes/image.js';
import presetRoutes from './routes/preset.js';
import totpRoutes from './routes/totp.js';
import uploadRoutes from './routes/upload.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import database connection
import { initDatabase } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/generated', express.static(path.join(__dirname, '../../generated_images')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/images', authenticateToken, imageRoutes);
app.use('/api/presets', authenticateToken, presetRoutes);
app.use('/api/totp', authenticateToken, totpRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();