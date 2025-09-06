const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
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
const dbPath = process.env.DB_PATH || '/app/data/rotz.db';
// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database with schema
const initDatabase = () => {
  const schemaPath = '/app/database/schema.sqlite.sql';
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(s => s.trim());
    statements.forEach(statement => {
      try {
        db.exec(statement + ';');
      } catch (error) {
        // Skip errors for existing tables/indexes
        if (!error.message.includes('already exists')) {
          console.log('Schema error:', error.message);
        }
      }
    });
    console.log('Database initialized with schema');
  } else {
    console.log('No schema file found, using existing database');
  }
};

initDatabase();

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

// Serve static frontend files
app.use(express.static('/app/dist'));

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.uploadType || 'reference-images';
    const uploadDir = `uploads/${uploadType}`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
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

// Helper function to run database transaction
const runTransaction = (callback) => {
  const beginTransaction = db.prepare('BEGIN');
  const commit = db.prepare('COMMIT');
  const rollback = db.prepare('ROLLBACK');
  
  beginTransaction.run();
  try {
    const result = callback();
    commit.run();
    return result;
  } catch (error) {
    rollback.run();
    throw error;
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  
  try {
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user and profile in transaction
    const userId = uuidv4();
    runTransaction(() => {
      db.prepare('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)')
        .run(userId, email, displayName || email);
      
      db.prepare(`INSERT INTO user_profiles (user_id, is_admin, image_credits, video_credits) 
                  VALUES (?, ?, ?, ?)`)
        .run(userId, 0, 5, 0);
    });
    
    // Generate JWT
    const token = jwt.sign(
      { userId, email, displayName: displayName || email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({ token, userId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Get user with profile
    const user = db.prepare(`
      SELECT u.*, p.* FROM users u 
      LEFT JOIN user_profiles p ON u.id = p.user_id 
      WHERE u.email = ?
    `).get(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Note: Since we're migrating from Firebase, we might not have passwords
    // In production, you'd verify the password here
    // const validPassword = await bcrypt.compare(password, user.password);
    
    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
      .run(user.id);
    
    // Generate JWT
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
    
    res.json({ 
      token, 
      userId: user.id,
      profile: {
        imageCredits: user.image_credits,
        videoCredits: user.video_credits,
        isAdmin: user.is_admin,
        totalCreditsGranted: user.total_credits_granted,
        totalCreditsUsed: user.total_credits_used
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth endpoint
app.post('/api/auth/google', async (req, res) => {
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
    
    // Special handling for jerome@rotz.host
    const isAdmin = email === 'jerome@rotz.host';
    
    // Check if user exists
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    let userId;
    
    if (!user) {
      // Create new user
      userId = isAdmin ? 'admin-jerome' : uuidv4();
      
      runTransaction(() => {
        db.prepare('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)')
          .run(userId, email, name || email);
        
        db.prepare(`INSERT INTO user_profiles (user_id, is_admin, image_credits, video_credits) 
                    VALUES (?, ?, ?, ?)`)
          .run(userId, isAdmin ? 1 : 0, isAdmin ? 999999 : 5, isAdmin ? 999999 : 0);
      });
    } else {
      userId = user.id;
      // Update last login
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
        .run(userId);
    }
    
    // Get complete user data with profile
    const userData = db.prepare(`
      SELECT u.*, p.* FROM users u 
      LEFT JOIN user_profiles p ON u.id = p.user_id 
      WHERE u.id = ?
    `).get(userId);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userData.id,
        email: userData.email,
        displayName: userData.display_name,
        googleId: googleId,
        isAdmin: userData.is_admin
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Return user data with token
    res.json({
      token,
      user: {
        id: userData.id,
        email: userData.email,
        displayName: userData.display_name,
        profile: {
          imageCredits: userData.image_credits,
          videoCredits: userData.video_credits,
          isAdmin: userData.is_admin,
          totalCreditsGranted: userData.total_credits_granted,
          totalCreditsUsed: userData.total_credits_used
        }
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// User profile endpoint
app.get('/api/users/:userId/profile', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const userData = db.prepare(`
      SELECT u.*, p.* FROM users u 
      LEFT JOIN user_profiles p ON u.id = p.user_id 
      WHERE u.id = ?
    `).get(userId);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: userData.id,
      email: userData.email,
      displayName: userData.display_name,
      imageCredits: userData.image_credits,
      videoCredits: userData.video_credits,
      isAdmin: userData.is_admin,
      createdAt: userData.created_at,
      lastLogin: userData.last_login,
      totalCreditsGranted: userData.total_credits_granted,
      totalCreditsUsed: userData.total_credits_used
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Image history endpoints
app.get('/api/users/:userId/images', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const images = db.prepare(`
      SELECT * FROM image_history 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(userId);
    
    res.json(images);
  } catch (error) {
    console.error('Image history fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch image history' });
  }
});

app.post('/api/users/:userId/images', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const imageId = uuidv4();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    
    const stmt = db.prepare(`
      INSERT INTO image_history (
        id, user_id, url, prompt, style, liked, content_type, file_extension,
        steps, cfg_scale, aspect_ratio, negative_prompt, width, height,
        is_custom_dimensions, total_pixels, megapixels, video_duration,
        video_fps, video_format, video_with_audio, video_resolution,
        expires_at, extension_count, is_expired
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      imageId, userId, req.body.url, req.body.prompt, req.body.style,
      req.body.liked ? 1 : 0, req.body.content_type, req.body.file_extension,
      req.body.steps, req.body.cfg_scale, req.body.aspect_ratio,
      req.body.negative_prompt, req.body.width, req.body.height,
      req.body.is_custom_dimensions ? 1 : 0, req.body.total_pixels,
      req.body.megapixels, req.body.video_duration, req.body.video_fps,
      req.body.video_format, req.body.video_with_audio ? 1 : 0,
      req.body.video_resolution, expiresAt.toISOString(), 0, 0
    );
    
    res.json({ id: imageId, message: 'Image saved successfully' });
  } catch (error) {
    console.error('Image save error:', error);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

// Presets endpoints
app.get('/api/users/:userId/presets', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const presets = db.prepare(`
      SELECT * FROM presets 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(userId);
    
    res.json(presets);
  } catch (error) {
    console.error('Presets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

app.post('/api/users/:userId/presets', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const presetId = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO presets (
        id, user_id, name, positive_prompt, negative_prompt, selected_style,
        aspect_ratio_label, aspect_ratio_value, aspect_ratio_width,
        aspect_ratio_height, aspect_ratio_category, steps, cfg_scale,
        custom_width, custom_height, use_custom_dimensions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      presetId, userId, req.body.name, req.body.positive_prompt,
      req.body.negative_prompt, req.body.selected_style,
      req.body.aspect_ratio_label, req.body.aspect_ratio_value,
      req.body.aspect_ratio_width, req.body.aspect_ratio_height,
      req.body.aspect_ratio_category, req.body.steps, req.body.cfg_scale,
      req.body.custom_width, req.body.custom_height,
      req.body.use_custom_dimensions ? 1 : 0
    );
    
    res.json({ id: presetId, message: 'Preset created successfully' });
  } catch (error) {
    console.error('Preset create error:', error);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

app.put('/api/users/:userId/presets/:presetId', authenticateToken, (req, res) => {
  const { userId, presetId } = req.params;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const stmt = db.prepare(`
      UPDATE presets SET
        name = ?, positive_prompt = ?, negative_prompt = ?, selected_style = ?,
        aspect_ratio_label = ?, aspect_ratio_value = ?, aspect_ratio_width = ?,
        aspect_ratio_height = ?, aspect_ratio_category = ?, steps = ?, cfg_scale = ?,
        custom_width = ?, custom_height = ?, use_custom_dimensions = ?
      WHERE id = ? AND user_id = ?
    `);
    
    const result = stmt.run(
      req.body.name, req.body.positive_prompt, req.body.negative_prompt,
      req.body.selected_style, req.body.aspect_ratio_label,
      req.body.aspect_ratio_value, req.body.aspect_ratio_width,
      req.body.aspect_ratio_height, req.body.aspect_ratio_category,
      req.body.steps, req.body.cfg_scale, req.body.custom_width,
      req.body.custom_height, req.body.use_custom_dimensions ? 1 : 0,
      presetId, userId
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    res.json({ message: 'Preset updated successfully' });
  } catch (error) {
    console.error('Preset update error:', error);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

app.delete('/api/users/:userId/presets/:presetId', authenticateToken, (req, res) => {
  const { userId, presetId } = req.params;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const result = db.prepare('DELETE FROM presets WHERE id = ? AND user_id = ?')
      .run(presetId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Preset delete error:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// Credit management endpoints
app.post('/api/users/:userId/credits/deduct', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const { credit_type, amount, reason } = req.body;
  
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    runTransaction(() => {
      // Get current balance
      const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
      
      if (!profile) {
        throw new Error('User profile not found');
      }
      
      // Check if admin (unlimited credits)
      if (profile.is_admin) {
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
      db.prepare(`UPDATE user_profiles SET ${creditField} = ?, total_credits_used = total_credits_used + ? WHERE user_id = ?`)
        .run(newBalance, amount, userId);
      
      // Log transaction
      const transactionId = uuidv4();
      db.prepare(`
        INSERT INTO credit_transactions (
          id, user_id, transaction_type, credit_type, amount,
          balance_before, balance_after, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionId, userId, 'deduction', credit_type, amount,
        currentBalance, newBalance, reason || 'Generation'
      );
      
      res.json({ 
        success: true, 
        new_balance: newBalance,
        transaction_id: transactionId
      });
    });
  } catch (error) {
    console.error('Credit deduction error:', error);
    res.status(400).json({ error: error.message });
  }
});

// File upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileId = uuidv4();
    
    db.prepare(`
      INSERT INTO file_storage (id, user_id, file_type, file_path, file_size, content_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      fileId, req.user.userId, req.body.uploadType || 'reference-image',
      req.file.path, req.file.size, req.file.mimetype
    );
    
    res.json({
      id: fileId,
      url: `/${req.file.path}`,
      path: req.file.path,
      size: req.file.size,
      contentType: req.file.mimetype
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Catch-all handler: send back index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile('/app/dist/index.html');
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`API server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  db.close();
  process.exit(0);
});