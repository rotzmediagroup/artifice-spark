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
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'uploads');
const refImagesDir = path.join(uploadDir, 'reference-images');
const genContentDir = path.join(uploadDir, 'generated-content');

[uploadDir, refImagesDir, genContentDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.uploadType || 'reference-images';
    const uploadPath = path.join(uploadDir, uploadType);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Google OAuth endpoint
app.post('/api/auth/google', async (req, res) => {
  const client = await pool.connect();
  try {
    const { credential } = req.body;
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;
    const picture = payload.picture;
    
    // Special handling for jerome@rotz.host
    const isAdmin = email === 'jerome@rotz.host';
    
    await client.query('BEGIN');
    
    // Check if user exists
    let userResult = await client.query(
      'SELECT * FROM users WHERE email = $1 OR google_id = $2',
      [email, googleId]
    );
    
    let userId;
    if (userResult.rows.length === 0) {
      // Create new user
      const insertUserResult = await client.query(
        'INSERT INTO users (email, display_name, google_id, photo_url) VALUES ($1, $2, $3, $4) RETURNING id',
        [email, name || email, googleId, picture]
      );
      userId = insertUserResult.rows[0].id;
      
      // Create user profile
      await client.query(
        `INSERT INTO user_profiles (user_id, is_admin, image_credits, video_credits) 
         VALUES ($1, $2, $3, $4)`,
        [userId, isAdmin, isAdmin ? 999999 : 5, isAdmin ? 999999 : 0]
      );
    } else {
      userId = userResult.rows[0].id;
      // Update last login and google_id if needed
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP, google_id = $2 WHERE id = $1',
        [userId, googleId]
      );
    }
    
    // Get complete user data with profile
    const userData = await client.query(
      `SELECT u.*, p.* FROM users u 
       LEFT JOIN user_profiles p ON u.id = p.user_id 
       WHERE u.id = $1`,
      [userId]
    );
    
    await client.query('COMMIT');
    
    const user = userData.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        displayName: user.display_name,
        isAdmin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Return user data with token
    res.json({
      token,
      user: {
        uid: user.id, // Firebase compatibility
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        photoURL: user.photo_url,
        profile: {
          imageCredits: user.image_credits,
          videoCredits: user.video_credits,
          isAdmin: user.is_admin,
          totalCreditsGranted: user.total_credits_granted,
          totalCreditsUsed: user.total_credits_used
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Google authentication failed' });
  } finally {
    client.release();
  }
});

// User profile endpoint
app.get('/api/users/:userId/profile', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT u.*, p.* FROM users u 
       LEFT JOIN user_profiles p ON u.id = p.user_id 
       WHERE u.id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      photoURL: user.photo_url,
      imageCredits: user.image_credits,
      videoCredits: user.video_credits,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      totalCreditsGranted: user.total_credits_granted,
      totalCreditsUsed: user.total_credits_used
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  } finally {
    client.release();
  }
});

// Image history endpoints
app.get('/api/users/:userId/images', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM image_history WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    // Transform to match frontend expectations
    const images = result.rows.map(row => ({
      id: row.id,
      url: row.url,
      prompt: row.prompt,
      style: row.style,
      timestamp: row.created_at,
      liked: row.liked,
      contentType: row.content_type,
      fileExtension: row.file_extension,
      settings: {
        steps: row.steps,
        cfgScale: row.cfg_scale,
        aspectRatio: row.aspect_ratio,
        negativePrompt: row.negative_prompt,
        width: row.width,
        height: row.height,
        isCustomDimensions: row.is_custom_dimensions,
        totalPixels: row.total_pixels,
        megapixels: row.megapixels,
        videoDuration: row.video_duration,
        videoFps: row.video_fps,
        videoFormat: row.video_format,
        videoWithAudio: row.video_with_audio,
        videoResolution: row.video_resolution
      },
      expiresAt: row.expires_at,
      extensionCount: row.extension_count,
      lastExtendedAt: row.last_extended_at,
      isExpired: row.is_expired
    }));
    
    res.json(images);
  } catch (error) {
    console.error('Image history fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch image history' });
  } finally {
    client.release();
  }
});

app.post('/api/users/:userId/images', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    const imageData = req.body;
    const expiresAt = imageData.expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    
    const result = await client.query(
      `INSERT INTO image_history (
        user_id, url, prompt, style, liked, content_type, file_extension,
        steps, cfg_scale, aspect_ratio, negative_prompt, width, height,
        is_custom_dimensions, total_pixels, megapixels, video_duration,
        video_fps, video_format, video_with_audio, video_resolution,
        expires_at, extension_count, is_expired
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING id`,
      [
        userId, imageData.url, imageData.prompt, imageData.style,
        imageData.liked || false, imageData.contentType || 'image', 
        imageData.fileExtension || '.png',
        imageData.settings?.steps || 30, imageData.settings?.cfgScale || 7,
        imageData.settings?.aspectRatio || 'Square (1:1)',
        imageData.settings?.negativePrompt || '', imageData.settings?.width || 1024,
        imageData.settings?.height || 1024, imageData.settings?.isCustomDimensions || false,
        imageData.settings?.totalPixels || 1048576, imageData.settings?.megapixels || 1.05,
        imageData.settings?.videoDuration, imageData.settings?.videoFps,
        imageData.settings?.videoFormat, imageData.settings?.videoWithAudio,
        imageData.settings?.videoResolution, expiresAt, 
        imageData.extensionCount || 0, imageData.isExpired || false
      ]
    );
    
    res.json({ id: result.rows[0].id, message: 'Image saved successfully' });
  } catch (error) {
    console.error('Image save error:', error);
    res.status(500).json({ error: 'Failed to save image' });
  } finally {
    client.release();
  }
});

// Presets endpoints
app.get('/api/users/:userId/presets', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM presets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    // Transform to match frontend expectations
    const presets = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      positivePrompt: row.positive_prompt,
      negativePrompt: row.negative_prompt,
      selectedStyle: row.selected_style,
      aspectRatio: row.aspect_ratio,
      steps: row.steps,
      cfgScale: row.cfg_scale,
      timestamp: row.created_at,
      customWidth: row.custom_width,
      customHeight: row.custom_height,
      useCustomDimensions: row.use_custom_dimensions
    }));
    
    res.json(presets);
  } catch (error) {
    console.error('Presets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  } finally {
    client.release();
  }
});

app.post('/api/users/:userId/presets', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    const preset = req.body;
    
    const result = await client.query(
      `INSERT INTO presets (
        user_id, name, positive_prompt, negative_prompt, selected_style,
        aspect_ratio, steps, cfg_scale, custom_width, custom_height, use_custom_dimensions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        userId, preset.name, preset.positivePrompt, preset.negativePrompt,
        preset.selectedStyle, JSON.stringify(preset.aspectRatio), preset.steps,
        preset.cfgScale, preset.customWidth, preset.customHeight, preset.useCustomDimensions
      ]
    );
    
    res.json({ id: result.rows[0].id, message: 'Preset created successfully' });
  } catch (error) {
    console.error('Preset create error:', error);
    res.status(500).json({ error: 'Failed to create preset' });
  } finally {
    client.release();
  }
});

app.put('/api/users/:userId/presets/:presetId', authenticateToken, async (req, res) => {
  const { userId, presetId } = req.params;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    const preset = req.body;
    
    const result = await client.query(
      `UPDATE presets SET
        name = $3, positive_prompt = $4, negative_prompt = $5, selected_style = $6,
        aspect_ratio = $7, steps = $8, cfg_scale = $9, custom_width = $10,
        custom_height = $11, use_custom_dimensions = $12
      WHERE id = $1 AND user_id = $2`,
      [
        presetId, userId, preset.name, preset.positivePrompt, preset.negativePrompt,
        preset.selectedStyle, JSON.stringify(preset.aspectRatio), preset.steps,
        preset.cfgScale, preset.customWidth, preset.customHeight, preset.useCustomDimensions
      ]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    res.json({ message: 'Preset updated successfully' });
  } catch (error) {
    console.error('Preset update error:', error);
    res.status(500).json({ error: 'Failed to update preset' });
  } finally {
    client.release();
  }
});

app.delete('/api/users/:userId/presets/:presetId', authenticateToken, async (req, res) => {
  const { userId, presetId } = req.params;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM presets WHERE id = $1 AND user_id = $2',
      [presetId, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Preset delete error:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  } finally {
    client.release();
  }
});

// Credit management endpoints
app.post('/api/users/:userId/credits/deduct', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { credit_type, amount, reason } = req.body;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get current user profile
    const profileResult = await client.query(
      'SELECT * FROM user_profiles WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    if (profileResult.rows.length === 0) {
      throw new Error('User profile not found');
    }
    
    const profile = profileResult.rows[0];
    
    // Check if admin (unlimited credits)
    if (profile.is_admin) {
      await client.query('COMMIT');
      return res.json({ 
        success: true, 
        new_balance: 999999, 
        message: 'Admin has unlimited credits' 
      });
    }
    
    const creditField = credit_type === 'video' ? 'video_credits' : 'image_credits';
    const currentBalance = profile[creditField];
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient ${credit_type} credits`);
    }
    
    const newBalance = currentBalance - amount;
    
    // Update balance
    await client.query(
      `UPDATE user_profiles SET ${creditField} = $2, total_credits_used = total_credits_used + $3 WHERE user_id = $1`,
      [userId, newBalance, amount]
    );
    
    // Log transaction
    await client.query(
      `INSERT INTO credit_transactions (
        user_id, transaction_type, credit_type, amount,
        balance_before, balance_after, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'deduction', credit_type, amount, currentBalance, newBalance, reason || 'Generation']
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      new_balance: newBalance 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Credit deduction error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// File upload endpoint
app.post('/api/storage/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const client = await pool.connect();
    try {
      // Save file info to database
      const result = await client.query(
        `INSERT INTO file_storage (user_id, file_type, file_path, file_size, content_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          req.user.userId,
          req.body.uploadType || 'reference-image',
          req.file.path,
          req.file.size,
          req.file.mimetype
        ]
      );
      
      // Return URL that frontend can use
      const fileUrl = `/uploads/${req.body.uploadType || 'reference-images'}/${req.file.filename}`;
      
      res.json({
        id: result.rows[0].id,
        url: fileUrl,
        path: req.file.path,
        size: req.file.size,
        contentType: req.file.mimetype
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Upload generated image (base64)
app.post('/api/storage/upload-generated', authenticateToken, async (req, res) => {
  try {
    const { imageData, contentType, imageId } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    
    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine file extension
    const extension = contentType === 'video' ? '.mp4' : '.png';
    const filename = `${imageId || uuidv4()}${extension}`;
    const filepath = path.join(genContentDir, filename);
    
    // Save file
    fs.writeFileSync(filepath, buffer);
    
    // Save to database
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO file_storage (user_id, file_type, file_path, file_size, content_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.userId,
          'generated-content',
          filepath,
          buffer.length,
          contentType === 'video' ? 'video/mp4' : 'image/png'
        ]
      );
    } finally {
      client.release();
    }
    
    // Return URL
    const fileUrl = `/uploads/generated-content/${filename}`;
    
    res.json({
      url: fileUrl,
      filename: filename
    });
  } catch (error) {
    console.error('Generated image upload error:', error);
    res.status(500).json({ error: 'Failed to save generated image' });
  }
});

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