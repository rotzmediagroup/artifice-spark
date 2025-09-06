const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'rotz_image_generator',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.uploadType || 'reference-images';
    const uploadPath = `uploads/${uploadType}`;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Helper function to generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== AUTHENTICATION ROUTES =====

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash, display_name, email_verified) VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, created_at',
      [email, passwordHash, displayName || '', true] // Auto-verify for simplicity
    );
    
    const user = userResult.rows[0];
    
    // Create user profile
    const isAdmin = email === 'jerome@rotz.host';
    await pool.query(
      `INSERT INTO user_profiles 
       (user_id, email, display_name, is_admin, image_credits, video_credits) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, email, displayName || '', isAdmin, isAdmin ? 999999 : 0, isAdmin ? 999999 : 0]
    );
    
    // Generate token
    const token = generateToken(user.id);
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Get user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await pool.query('UPDATE user_profiles SET last_login = NOW() WHERE user_id = $1', [user.id]);
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        emailVerified: user.email_verified
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Get user profile
    const result = await pool.query(
      `SELECT up.*, u.email_verified 
       FROM user_profiles up 
       JOIN users u ON up.user_id = u.id 
       WHERE up.user_id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const profile = result.rows[0];
    
    res.json({
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.display_name,
      emailVerified: profile.email_verified,
      profile: {
        imageCredits: profile.image_credits,
        videoCredits: profile.video_credits,
        isAdmin: profile.is_admin,
        totalCreditsGranted: profile.total_credits_granted,
        totalCreditsUsed: profile.total_credits_used,
        mfaEnabled: profile.mfa_enabled
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== USER PROFILES =====

app.get('/api/users/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user can access this profile (self or admin)
    if (req.user.id !== userId) {
      const userProfile = await pool.query('SELECT is_admin FROM user_profiles WHERE user_id = $1', [req.user.id]);
      if (userProfile.rows.length === 0 || !userProfile.rows[0].is_admin) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== IMAGE HISTORY =====

app.get('/api/users/:userId/images', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only access their own images
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(
      'SELECT * FROM image_history WHERE user_id = $1 ORDER BY timestamp DESC',
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching image history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:userId/images', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      url, prompt, style, liked, content_type, file_extension,
      steps, cfg_scale, aspect_ratio, negative_prompt, width, height,
      is_custom_dimensions, total_pixels, megapixels, video_duration,
      video_fps, video_format, video_with_audio, video_resolution,
      expires_at, extension_count, last_extended_at, is_expired
    } = req.body;

    const result = await pool.query(`
      INSERT INTO image_history (
        user_id, url, prompt, style, liked, content_type, file_extension,
        steps, cfg_scale, aspect_ratio, negative_prompt, width, height,
        is_custom_dimensions, total_pixels, megapixels, video_duration,
        video_fps, video_format, video_with_audio, video_resolution,
        expires_at, extension_count, last_extended_at, is_expired
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `, [
      userId, url, prompt, style, liked, content_type, file_extension,
      steps, cfg_scale, aspect_ratio, negative_prompt, width, height,
      is_custom_dimensions, total_pixels, megapixels, video_duration,
      video_fps, video_format, video_with_audio, video_resolution,
      expires_at, extension_count, last_extended_at, is_expired
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding image to history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== FILE UPLOAD =====

app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Save file info to database
    const result = await pool.query(
      `INSERT INTO file_storage (user_id, filename, original_name, file_path, file_size, content_type, upload_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        req.body.uploadType || 'reference-images'
      ]
    );
    
    // Return public URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.body.uploadType || 'reference-images'}/${req.file.filename}`;
    
    res.json({
      id: result.rows[0].id,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      contentType: req.file.mimetype
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// More routes will be added for presets, credits, TOTP, etc...

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`API server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end(() => {
    process.exit(0);
  });
});