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
const { OAuth2Client } = require('google-auth-library');
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

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1035190682648-p60ao4phea2hbovo087bcao80741u10o.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

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

// Google OAuth sign-in
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const displayName = payload.name || '';
    const emailVerified = payload.email_verified;

    if (!emailVerified) {
      return res.status(400).json({ error: 'Google account email is not verified' });
    }

    // Check if user exists
    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (userResult.rows.length === 0) {
      // Create new user for Google sign-in (no password needed)
      const newUserResult = await pool.query(
        'INSERT INTO users (email, password_hash, display_name, email_verified) VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, created_at',
        [email, '', displayName, true] // Empty password hash for Google users
      );
      
      user = newUserResult.rows[0];
      
      // Create user profile
      const isAdmin = email === 'jerome@rotz.host';
      await pool.query(
        `INSERT INTO user_profiles 
         (user_id, email, display_name, is_admin, image_credits, video_credits) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, email, displayName, isAdmin, isAdmin ? 999999 : 0, isAdmin ? 999999 : 0]
      );
    } else {
      user = userResult.rows[0];
      
      // Update last login
      await pool.query('UPDATE user_profiles SET last_login = NOW() WHERE user_id = $1', [user.id]);
    }

    // Generate token
    const token = generateToken(user.id);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        emailVerified: true
      },
      token
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
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

// ===== PRESETS =====

// Get user presets
app.get('/api/users/:userId/presets', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only access their own presets
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(
      'SELECT * FROM presets WHERE user_id = $1 ORDER BY timestamp DESC',
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new preset
app.post('/api/users/:userId/presets', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      name, positive_prompt, negative_prompt, selected_style,
      aspect_ratio_label, aspect_ratio_value, aspect_ratio_width, aspect_ratio_height, aspect_ratio_category,
      steps, cfg_scale, custom_width, custom_height, use_custom_dimensions
    } = req.body;

    const result = await pool.query(`
      INSERT INTO presets (
        user_id, name, positive_prompt, negative_prompt, selected_style,
        aspect_ratio_label, aspect_ratio_value, aspect_ratio_width, aspect_ratio_height, aspect_ratio_category,
        steps, cfg_scale, custom_width, custom_height, use_custom_dimensions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      userId, name, positive_prompt, negative_prompt, selected_style,
      aspect_ratio_label, aspect_ratio_value, aspect_ratio_width, aspect_ratio_height, aspect_ratio_category,
      steps, cfg_scale, custom_width, custom_height, use_custom_dimensions
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating preset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update preset
app.put('/api/users/:userId/presets/:presetId', authenticateToken, async (req, res) => {
  try {
    const { userId, presetId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const {
      name, positive_prompt, negative_prompt, selected_style,
      aspect_ratio_label, aspect_ratio_value, aspect_ratio_width, aspect_ratio_height, aspect_ratio_category,
      steps, cfg_scale, custom_width, custom_height, use_custom_dimensions
    } = req.body;

    const result = await pool.query(`
      UPDATE presets SET 
        name = $1, positive_prompt = $2, negative_prompt = $3, selected_style = $4,
        aspect_ratio_label = $5, aspect_ratio_value = $6, aspect_ratio_width = $7, 
        aspect_ratio_height = $8, aspect_ratio_category = $9,
        steps = $10, cfg_scale = $11, custom_width = $12, custom_height = $13, 
        use_custom_dimensions = $14, updated_at = NOW()
      WHERE id = $15 AND user_id = $16
      RETURNING *
    `, [
      name, positive_prompt, negative_prompt, selected_style,
      aspect_ratio_label, aspect_ratio_value, aspect_ratio_width, aspect_ratio_height, aspect_ratio_category,
      steps, cfg_scale, custom_width, custom_height, use_custom_dimensions,
      presetId, userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating preset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete preset
app.delete('/api/users/:userId/presets/:presetId', authenticateToken, async (req, res) => {
  try {
    const { userId, presetId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query(
      'DELETE FROM presets WHERE id = $1 AND user_id = $2 RETURNING *',
      [presetId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== CREDITS =====

// Deduct credits
app.post('/api/users/:userId/credits/deduct', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { credit_type, amount, reason } = req.body;
    
    if (!credit_type || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid credit_type or amount' });
    }

    // Check if user is admin (unlimited credits)
    const profileResult = await pool.query('SELECT is_admin FROM user_profiles WHERE user_id = $1', [userId]);
    if (profileResult.rows.length > 0 && profileResult.rows[0].is_admin) {
      return res.json({ success: true, message: 'Admin has unlimited credits' });
    }

    // Use transaction to ensure atomic credit deduction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current credits
      const userResult = await client.query('SELECT image_credits, video_credits FROM user_profiles WHERE user_id = $1', [userId]);
      if (userResult.rows.length === 0) {
        throw new Error('User profile not found');
      }

      const currentCredits = credit_type === 'image' ? userResult.rows[0].image_credits : userResult.rows[0].video_credits;
      
      if (currentCredits < amount) {
        throw new Error(`Insufficient ${credit_type} credits. Required: ${amount}, Available: ${currentCredits}`);
      }

      // Deduct credits
      const creditField = credit_type === 'image' ? 'image_credits' : 'video_credits';
      const newCredits = currentCredits - amount;
      
      await client.query(
        `UPDATE user_profiles SET ${creditField} = $1, total_credits_used = total_credits_used + $2, updated_at = NOW() WHERE user_id = $3`,
        [newCredits, amount, userId]
      );

      // Log transaction
      await client.query(
        'INSERT INTO credit_transactions (user_id, type, amount, credit_type, description, source) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, 'spent', -amount, credit_type, reason || `${credit_type} generation`, 'generation']
      );

      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        new_balance: newCredits,
        credits_deducted: amount
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deducting credits:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
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