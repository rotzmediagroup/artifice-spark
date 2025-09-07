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
const port = process.env.PORT || 8888;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Database connection with graceful error handling
const dbConfig = {
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rotz_image_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(dbConfig);

// Test database connection on startup but don't fail if unavailable
let dbConnected = false;
const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    dbConnected = true;
    console.log('Database connected successfully');
  } catch (error) {
    console.warn('Database connection failed, will retry:', error.message);
    dbConnected = false;
    // Retry connection after 5 seconds
    setTimeout(testConnection, 5000);
  }
};

// Middleware to check database connection
const requireDB = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).send('Database temporarily unavailable');
  }
  next();
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1035190682648-p60ao4phea2hbovo087bcao80741u10o.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from dist (built React app)
app.use(express.static(path.join(__dirname, 'dist')));

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'uploads');
const refImagesDir = path.join(uploadDir, 'reference-images');
const genContentDir = path.join(uploadDir, 'generated-content');

[uploadDir, refImagesDir, genContentDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve uploads directory
app.use('/uploads', express.static(uploadDir));

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

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
  const client = await pool.connect();
  try {
    // Check if user is admin
    const result = await client.query(
      'SELECT p.is_admin FROM user_profiles p WHERE p.user_id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  } finally {
    client.release();
  }
};

// Health check endpoint (works without database)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: dbConnected ? 'connected' : 'unavailable'
  });
});

// API ROUTES START HERE

// Google OAuth endpoint
app.post('/api/auth/google', async (req, res) => {
  let client;
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
    
    let userId, userData;
    
    // Try database operations if connected
    if (dbConnected) {
      try {
        client = await pool.connect();
        await client.query('BEGIN');
        
        // Check if user exists
        let userResult = await client.query(
          'SELECT * FROM users WHERE email = $1 OR google_id = $2',
          [email, googleId]
        );
        
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
        const userDataResult = await client.query(
          `SELECT u.*, p.* FROM users u 
           LEFT JOIN user_profiles p ON u.id = p.user_id 
           WHERE u.id = $1`,
          [userId]
        );
        userData = userDataResult.rows[0];
        
        await client.query('COMMIT');
      } catch (dbError) {
        console.error('Database error during auth:', dbError);
        if (client) {
          try { await client.query('ROLLBACK'); } catch (e) {}
        }
        // Fall back to in-memory user
        dbConnected = false;
      }
    }
    
    // Fallback: Create temporary user object without database
    if (!userData) {
      console.log('Creating temporary user session without database');
      userId = googleId; // Use Google ID as temporary user ID
      userData = {
        id: userId,
        email: email,
        display_name: name || email,
        google_id: googleId,
        photo_url: picture,
        is_admin: isAdmin,
        image_credits: isAdmin ? 999999 : 5,
        video_credits: isAdmin ? 999999 : 0,
        created_at: new Date(),
        last_login: new Date()
      };
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userData.id,
        email: userData.email,
        displayName: userData.display_name,
        isAdmin: userData.is_admin
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Return user data with token
    res.json({
      token,
      user: {
        uid: userData.id, // Firebase compatibility
        id: userData.id,
        email: userData.email,
        displayName: userData.display_name,
        photoURL: userData.photo_url,
        profile: {
          imageCredits: userData.image_credits,
          videoCredits: userData.video_credits,
          isAdmin: userData.is_admin,
          totalCreditsGranted: userData.total_credits_granted || 0,
          totalCreditsUsed: userData.total_credits_used || 0
        }
      }
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (e) {}
    }
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Google authentication failed' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// User profile endpoint
app.get('/api/users/:userId/profile', authenticateToken, requireDB, async (req, res) => {
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
app.get('/api/users/:userId/images', authenticateToken, requireDB, async (req, res) => {
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

app.post('/api/users/:userId/images', authenticateToken, requireDB, async (req, res) => {
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

// Update image metadata (like/unlike, etc.)
app.patch('/api/users/:userId/images/:imageId', authenticateToken, requireDB, async (req, res) => {
  const { userId, imageId } = req.params;
  const { liked, ...updates } = req.body;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    // Build update query dynamically based on provided fields
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (typeof liked === 'boolean') {
      updateFields.push(`liked = $${paramCount++}`);
      values.push(liked);
    }
    
    // Add other updatable fields as needed
    if (updates.title) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(updates.title);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(imageId);
    values.push(userId);
    
    const result = await client.query(
      `UPDATE image_history SET ${updateFields.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Image updated successfully',
      image: result.rows[0] 
    });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  } finally {
    client.release();
  }
});

// Delete image from history
app.delete('/api/users/:userId/images/:imageId', authenticateToken, requireDB, async (req, res) => {
  const { userId, imageId } = req.params;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM image_history WHERE id = $1 AND user_id = $2 RETURNING url',
      [imageId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // TODO: Also delete the actual file from disk/storage if needed
    // const imageUrl = result.rows[0].url;
    // await deleteImageFile(imageUrl);
    
    res.json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  } finally {
    client.release();
  }
});

// Extend image expiration (admin or user with extension credits)
app.post('/api/users/:userId/images/:imageId/extend', authenticateToken, requireDB, async (req, res) => {
  const { userId, imageId } = req.params;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get current image info
    const imageResult = await client.query(
      'SELECT * FROM image_history WHERE id = $1 AND user_id = $2',
      [imageId, userId]
    );
    
    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const image = imageResult.rows[0];
    const isAdmin = req.user.isAdmin;
    const contentType = image.content_type || 'image';
    
    // Check extension limits
    const currentExtensionCount = image.extension_count || 0;
    const maxExtensions = contentType === 'video' ? 1 : 3;
    
    if (!isAdmin && currentExtensionCount >= maxExtensions) {
      return res.status(400).json({ 
        error: `Maximum extensions reached for ${contentType} (${maxExtensions})`,
        remainingExtensions: 0
      });
    }
    
    // Extend expiration by 7 days
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    const newExtensionCount = currentExtensionCount + 1;
    
    // Update image
    const updateResult = await client.query(`
      UPDATE image_history 
      SET expires_at = $1, extension_count = $2, last_extended_at = NOW(), updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `, [newExpiresAt, newExtensionCount, imageId, userId]);
    
    await client.query('COMMIT');
    
    const updatedImage = updateResult.rows[0];
    const remainingExtensions = isAdmin ? 'unlimited' : Math.max(0, maxExtensions - newExtensionCount);
    
    res.json({
      success: true,
      newExpiresAt: newExpiresAt.toISOString(),
      extensionCount: newExtensionCount,
      remainingExtensions,
      message: `${contentType} expiration extended by 7 days`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error extending image:', error);
    res.status(500).json({ error: 'Failed to extend image expiration' });
  } finally {
    client.release();
  }
});

// Presets endpoints
app.get('/api/users/:userId/presets', authenticateToken, requireDB, async (req, res) => {
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

app.post('/api/users/:userId/presets', authenticateToken, requireDB, async (req, res) => {
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

app.put('/api/users/:userId/presets/:presetId', authenticateToken, requireDB, async (req, res) => {
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

app.delete('/api/users/:userId/presets/:presetId', authenticateToken, requireDB, async (req, res) => {
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
app.post('/api/users/:userId/credits/deduct', authenticateToken, requireDB, async (req, res) => {
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
    
    // Log transaction (if credit_transactions table exists)
    try {
      await client.query(
        `INSERT INTO credit_transactions (
          user_id, transaction_type, credit_type, amount,
          balance_before, balance_after, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, 'deduction', credit_type, amount, currentBalance, newBalance, reason || 'Generation']
      );
    } catch (err) {
      console.warn('Credit transaction logging failed (table may not exist):', err.message);
    }
    
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

// ADMIN API ENDPOINTS

// Get all users for admin dashboard
app.get('/api/admin/users', authenticateToken, requireAdmin, requireDB, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        u.id, u.email, u.display_name, u.photo_url, u.created_at, u.last_login,
        p.is_admin, p.image_credits, p.video_credits, p.total_credits_granted, 
        p.total_credits_used, p.is_active, p.is_suspended, p.settings
      FROM users u 
      LEFT JOIN user_profiles p ON u.id = p.user_id 
      ORDER BY u.created_at DESC
    `);
    
    const users = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      photoURL: row.photo_url,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      isAdmin: row.is_admin,
      imageCredits: row.image_credits || 0,
      videoCredits: row.video_credits || 0,
      totalCreditsGranted: row.total_credits_granted || 0,
      totalCreditsUsed: row.total_credits_used || 0,
      isActive: row.is_active !== false,
      isSuspended: row.is_suspended || false
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  } finally {
    client.release();
  }
});

// Grant/deduct credits for a user
app.post('/api/admin/users/:userId/credits', authenticateToken, requireAdmin, requireDB, async (req, res) => {
  const { userId } = req.params;
  const { creditType, amount, action, reason } = req.body;
  
  if (!['image', 'video'].includes(creditType)) {
    return res.status(400).json({ error: 'Invalid credit type. Must be "image" or "video"' });
  }
  
  if (!['grant', 'deduct'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be "grant" or "deduct"' });
  }
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get current credits
    const userResult = await client.query(
      'SELECT image_credits, video_credits FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentImageCredits = userResult.rows[0].image_credits || 0;
    const currentVideoCredits = userResult.rows[0].video_credits || 0;
    const currentCredits = creditType === 'image' ? currentImageCredits : currentVideoCredits;
    
    // Calculate new credit amount
    let newCredits;
    if (action === 'grant') {
      newCredits = currentCredits + amount;
    } else {
      newCredits = Math.max(0, currentCredits - amount);
    }
    
    // Update credits
    const updateField = creditType === 'image' ? 'image_credits' : 'video_credits';
    await client.query(
      `UPDATE user_profiles SET ${updateField} = $1 WHERE user_id = $2`,
      [newCredits, userId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      previousBalance: currentCredits,
      newBalance: newCredits,
      action,
      amount,
      creditType
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating credits:', error);
    res.status(500).json({ error: 'Failed to update credits' });
  } finally {
    client.release();
  }
});

// Suspend/unsuspend user
app.put('/api/admin/users/:userId/status', authenticateToken, requireAdmin, requireDB, async (req, res) => {
  const { userId } = req.params;
  const { action, reason } = req.body;
  
  if (!['suspend', 'unsuspend', 'delete', 'reactivate'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  if (userId === req.user.userId) {
    return res.status(400).json({ error: 'Cannot modify your own account status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if user exists and is not admin
    const userCheck = await client.query(
      'SELECT p.is_admin FROM user_profiles p WHERE p.user_id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userCheck.rows[0].is_admin) {
      return res.status(400).json({ error: 'Cannot modify admin account status' });
    }
    
    // Update user status based on action
    let updateFields = {};
    let logReason = reason;
    
    switch (action) {
      case 'suspend':
        updateFields = { is_suspended: true, is_active: true };
        logReason = logReason || 'Account suspended by admin';
        break;
      case 'unsuspend':
        updateFields = { is_suspended: false, is_active: true };
        logReason = logReason || 'Account unsuspended by admin';
        break;
      case 'delete':
        updateFields = { is_active: false, is_suspended: false };
        logReason = logReason || 'Account deleted by admin';
        break;
      case 'reactivate':
        updateFields = { is_active: true, is_suspended: false };
        logReason = logReason || 'Account reactivated by admin';
        break;
    }
    
    // Build UPDATE query dynamically
    const setClause = Object.keys(updateFields).map((key, index) => 
      `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updateFields);
    values.push(userId);
    
    await client.query(
      `UPDATE user_profiles SET ${setClause} WHERE user_id = $${values.length}`,
      values
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      action,
      userId,
      reason: logReason
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  } finally {
    client.release();
  }
});

// Get system statistics
app.get('/api/admin/stats', authenticateToken, requireAdmin, requireDB, async (req, res) => {
  const client = await pool.connect();
  try {
    // Get user counts and credit statistics
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN p.is_active = true AND p.is_suspended = false THEN 1 END) as active_users,
        COUNT(CASE WHEN p.is_suspended = true THEN 1 END) as suspended_users,
        COUNT(CASE WHEN p.is_admin = true THEN 1 END) as admin_users,
        SUM(CASE WHEN p.is_active = true THEN p.image_credits ELSE 0 END) as total_image_credits,
        SUM(CASE WHEN p.is_active = true THEN p.video_credits ELSE 0 END) as total_video_credits,
        SUM(CASE WHEN p.is_active = true THEN p.total_credits_granted ELSE 0 END) as total_credits_granted,
        SUM(CASE WHEN p.is_active = true THEN p.total_credits_used ELSE 0 END) as total_credits_used
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
    `);
    
    // Get image generation statistics
    const imageStats = await client.query(`
      SELECT 
        COUNT(*) as total_images,
        COUNT(CASE WHEN content_type = 'image' THEN 1 END) as images_generated,
        COUNT(CASE WHEN content_type = 'video' THEN 1 END) as videos_generated
      FROM image_history
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    
    const statsData = stats.rows[0];
    const imgStats = imageStats.rows[0];
    
    res.json({
      users: {
        total: parseInt(statsData.total_users) || 0,
        active: parseInt(statsData.active_users) || 0,
        suspended: parseInt(statsData.suspended_users) || 0,
        admins: parseInt(statsData.admin_users) || 0
      },
      credits: {
        totalImageCredits: parseInt(statsData.total_image_credits) || 0,
        totalVideoCredits: parseInt(statsData.total_video_credits) || 0,
        totalCreditsGranted: parseInt(statsData.total_credits_granted) || 0,
        totalCreditsUsed: parseInt(statsData.total_credits_used) || 0,
        totalCreditsInCirculation: (parseInt(statsData.total_image_credits) || 0) + (parseInt(statsData.total_video_credits) || 0)
      },
      content: {
        totalGenerations: parseInt(imgStats.total_images) || 0,
        imagesGenerated: parseInt(imgStats.images_generated) || 0,
        videosGenerated: parseInt(imgStats.videos_generated) || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
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
    
    if (dbConnected) {
      const client = await pool.connect();
      try {
        // Save file info to database
        await client.query(
          `INSERT INTO file_storage (user_id, file_type, file_path, file_size, content_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user.userId,
            req.body.uploadType || 'reference-image',
            req.file.path,
            req.file.size,
            req.file.mimetype
          ]
        );
      } catch (dbError) {
        console.warn('File storage database logging failed:', dbError.message);
      } finally {
        client.release();
      }
    }
    
    // Return URL that frontend can use
    const fileUrl = `/uploads/${req.body.uploadType || 'reference-images'}/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      path: req.file.path,
      size: req.file.size,
      contentType: req.file.mimetype
    });
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
    
    // Save to database if available
    if (dbConnected) {
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
      } catch (dbError) {
        console.warn('Generated image database logging failed:', dbError.message);
      } finally {
        client.release();
      }
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

// Catch-all handler: send back React's index.html file for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the connection test
testConnection();

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Unified server running on port ${port}`);
  console.log(`Serving React app and API from single process`);
  console.log(`Database connection: ${dbConnected ? 'connected' : 'attempting to connect...'}`);
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