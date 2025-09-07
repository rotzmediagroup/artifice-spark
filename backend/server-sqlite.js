const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const net = require('net');
require('dotenv').config();

const app = express();
let port = parseInt(process.env.PORT) || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Function to find available port starting from preferred port
async function findAvailablePort(startPort) {
  let currentPort = startPort;
  const maxPort = startPort + 100; // Check up to 100 ports ahead
  
  while (currentPort <= maxPort) {
    if (await isPortAvailable(currentPort)) {
      return currentPort;
    }
    currentPort++;
  }
  
  throw new Error(`No available port found between ${startPort} and ${maxPort}`);
}

// Database connection
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

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

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        google_id TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_admin BOOLEAN DEFAULT FALSE
      )`);

      // User profiles table
      db.run(`CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        image_credits INTEGER DEFAULT 0,
        video_credits INTEGER DEFAULT 0,
        total_credits_granted INTEGER DEFAULT 0,
        total_credits_used INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Image history table
      db.run(`CREATE TABLE IF NOT EXISTS image_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        prompt TEXT NOT NULL,
        style TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        liked BOOLEAN DEFAULT FALSE,
        content_type TEXT DEFAULT 'image',
        file_extension TEXT DEFAULT '.png',
        settings TEXT NOT NULL,
        expires_at DATETIME,
        extension_count INTEGER DEFAULT 0,
        last_extended_at DATETIME,
        is_expired BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Presets table
      db.run(`CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        positive_prompt TEXT NOT NULL,
        negative_prompt TEXT,
        selected_style TEXT NOT NULL,
        aspect_ratio TEXT NOT NULL,
        steps INTEGER DEFAULT 30,
        cfg_scale REAL DEFAULT 7.0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        custom_width INTEGER,
        custom_height INTEGER,
        use_custom_dimensions BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Reference images table
      db.run(`CREATE TABLE IF NOT EXISTS reference_images (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Insert default admin user
      db.get("SELECT id FROM users WHERE email = ?", ['jerome@rotz.host'], (err, row) => {
        if (err) {
          console.error('Error checking for admin user:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          const adminId = uuidv4();
          db.run(`INSERT INTO users (id, email, display_name, google_id, is_admin, created_at, last_login) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                 [adminId, 'jerome@rotz.host', 'Jerome Levy', null, true, new Date().toISOString(), new Date().toISOString()], 
                 function(err) {
            if (err) {
              console.error('Error creating admin user:', err);
              reject(err);
              return;
            }
            
            // Create admin profile with lots of credits
            db.run(`INSERT INTO user_profiles (user_id, image_credits, video_credits, total_credits_granted) 
                    VALUES (?, ?, ?, ?)`,
                   [adminId, 1000, 1000, 2000], (err) => {
              if (err) {
                console.error('Error creating admin profile:', err);
                reject(err);
                return;
              }
              console.log('Admin user created successfully');
              resolve();
            });
          });
        } else {
          resolve();
        }
      });
    });
  });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.uploadType || 'generated-content';
    const uploadPath = uploadType === 'reference-images' ? refImagesDir : genContentDir;
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
  try {
    const { credential } = req.body;
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;
    
    // Check if user exists
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (user) {
        // Update last login
        db.run("UPDATE users SET last_login = ? WHERE id = ?", 
               [new Date().toISOString(), user.id], (err) => {
          if (err) console.error('Error updating last login:', err);
        });
        
        // Get user profile
        db.get("SELECT * FROM user_profiles WHERE user_id = ?", [user.id], (err, profile) => {
          if (err) {
            console.error('Error fetching user profile:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Generate JWT token
          const token = jwt.sign({ 
            id: user.id, 
            email: user.email, 
            isAdmin: user.is_admin 
          }, JWT_SECRET, { expiresIn: '7d' });
          
          res.json({
            token,
            user: {
              id: user.id,
              email: user.email,
              displayName: user.display_name,
              profile: profile || {
                imageCredits: 0,
                videoCredits: 0,
                totalCreditsGranted: 0,
                totalCreditsUsed: 0,
                isAdmin: user.is_admin
              }
            }
          });
        });
      } else {
        // Create new user
        const userId = uuidv4();
        const isAdmin = email === 'jerome@rotz.host';
        
        db.run(`INSERT INTO users (id, email, display_name, google_id, is_admin, created_at, last_login) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
               [userId, email, name, googleId, isAdmin, new Date().toISOString(), new Date().toISOString()],
               function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Create user profile
          const initialImageCredits = isAdmin ? 1000 : 10;
          const initialVideoCredits = isAdmin ? 1000 : 5;
          const totalCreditsGranted = initialImageCredits + initialVideoCredits;
          
          db.run(`INSERT INTO user_profiles (user_id, image_credits, video_credits, total_credits_granted) 
                  VALUES (?, ?, ?, ?)`,
                 [userId, initialImageCredits, initialVideoCredits, totalCreditsGranted],
                 (err) => {
            if (err) {
              console.error('Error creating user profile:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            // Generate JWT token
            const token = jwt.sign({ 
              id: userId, 
              email: email, 
              isAdmin: isAdmin 
            }, JWT_SECRET, { expiresIn: '7d' });
            
            res.json({
              token,
              user: {
                id: userId,
                email: email,
                displayName: name,
                profile: {
                  imageCredits: initialImageCredits,
                  videoCredits: initialVideoCredits,
                  totalCreditsGranted: totalCreditsGranted,
                  totalCreditsUsed: 0,
                  isAdmin: isAdmin
                }
              }
            });
          });
        });
      }
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Get user images
app.get('/api/users/:userId/images', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  db.all("SELECT * FROM image_history WHERE user_id = ? ORDER BY timestamp DESC", 
         [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching images:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const images = rows.map(row => ({
      ...row,
      settings: JSON.parse(row.settings),
      timestamp: new Date(row.timestamp).toISOString(),
      expires_at: new Date(row.expires_at).toISOString(),
      last_extended_at: row.last_extended_at ? new Date(row.last_extended_at).toISOString() : null
    }));
    
    res.json(images);
  });
});

// Add image to history
app.post('/api/users/:userId/images', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const imageData = req.body;
  const imageId = uuidv4();
  
  db.run(`INSERT INTO image_history 
          (id, user_id, url, prompt, style, timestamp, liked, content_type, file_extension, settings, expires_at, extension_count) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [imageId, userId, imageData.url, imageData.prompt, imageData.style, 
          new Date(imageData.timestamp).toISOString(), imageData.liked,
          imageData.contentType || 'image', imageData.fileExtension || '.png',
          JSON.stringify(imageData.settings), new Date(imageData.expiresAt).toISOString(),
          imageData.extensionCount || 0],
         function(err) {
    if (err) {
      console.error('Error saving image:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true, id: imageId });
  });
});

// Get user presets
app.get('/api/users/:userId/presets', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  db.all("SELECT * FROM presets WHERE user_id = ? ORDER BY timestamp DESC", 
         [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching presets:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const presets = rows.map(row => ({
      ...row,
      aspect_ratio: JSON.parse(row.aspect_ratio),
      timestamp: new Date(row.timestamp).toISOString()
    }));
    
    res.json(presets);
  });
});

// Add preset
app.post('/api/users/:userId/presets', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const presetData = req.body;
  const presetId = uuidv4();
  
  db.run(`INSERT INTO presets 
          (id, user_id, name, positive_prompt, negative_prompt, selected_style, aspect_ratio, steps, cfg_scale, timestamp, custom_width, custom_height, use_custom_dimensions) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
         [presetId, userId, presetData.name, presetData.positivePrompt, presetData.negativePrompt,
          presetData.selectedStyle, JSON.stringify(presetData.aspectRatio), presetData.steps,
          presetData.cfgScale, new Date(presetData.timestamp).toISOString(),
          presetData.customWidth, presetData.customHeight, presetData.useCustomDimensions],
         function(err) {
    if (err) {
      console.error('Error saving preset:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true, id: presetId });
  });
});

// Update preset
app.put('/api/users/:userId/presets/:presetId', authenticateToken, (req, res) => {
  const { userId, presetId } = req.params;
  
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const updates = req.body;
  const updateFields = [];
  const values = [];
  
  Object.keys(updates).forEach(key => {
    if (key === 'aspectRatio') {
      updateFields.push('aspect_ratio = ?');
      values.push(JSON.stringify(updates[key]));
    } else {
      updateFields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
      values.push(updates[key]);
    }
  });
  
  values.push(presetId);
  
  db.run(`UPDATE presets SET ${updateFields.join(', ')} WHERE id = ?`,
         values, function(err) {
    if (err) {
      console.error('Error updating preset:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true });
  });
});

// Delete preset
app.delete('/api/users/:userId/presets/:presetId', authenticateToken, (req, res) => {
  const { userId, presetId } = req.params;
  
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  db.run("DELETE FROM presets WHERE id = ?", [presetId], function(err) {
    if (err) {
      console.error('Error deleting preset:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ success: true });
  });
});

// Deduct credits
app.post('/api/users/:userId/credits/deduct', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const { credit_type, amount, reason } = req.body;
  
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Admin has unlimited credits
  if (req.user.isAdmin) {
    return res.json({ success: true, new_balance: 999999 });
  }
  
  const creditField = credit_type === 'image' ? 'image_credits' : 'video_credits';
  
  db.get(`SELECT ${creditField} FROM user_profiles WHERE user_id = ?`, [userId], (err, row) => {
    if (err) {
      console.error('Error fetching credits:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const currentCredits = row[creditField];
    if (currentCredits < amount) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }
    
    const newBalance = currentCredits - amount;
    
    db.run(`UPDATE user_profiles SET ${creditField} = ?, total_credits_used = total_credits_used + ? WHERE user_id = ?`,
           [newBalance, amount, userId], function(err) {
      if (err) {
        console.error('Error deducting credits:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ success: true, new_balance: newBalance });
    });
  });
});

// File upload endpoint
app.post('/api/storage/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const relativePath = path.relative(uploadDir, req.file.path);
    const url = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    res.json({
      success: true,
      url: url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Generated content upload endpoint
app.post('/api/storage/upload-generated', authenticateToken, (req, res) => {
  try {
    const { imageData, contentType, imageId } = req.body;
    
    if (!imageData || !imageId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Extract base64 data
    const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Determine file extension based on content type
    let extension = '.png';
    if (contentType === 'video') {
      extension = '.mp4';
    } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      extension = '.jpg';
    } else if (mimeType.includes('gif')) {
      extension = '.gif';
    } else if (mimeType.includes('webp')) {
      extension = '.webp';
    }
    
    const filename = `${imageId}${extension}`;
    const filePath = path.join(genContentDir, filename);
    
    // Write file
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    
    const relativePath = path.relative(uploadDir, filePath);
    const url = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    res.json({
      success: true,
      url: url,
      filename: filename
    });
  } catch (error) {
    console.error('Generated upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// N8N Webhook proxy for image generation
app.post('/api/generate/image', authenticateToken, async (req, res) => {
  try {
    const webhookUrl = 'https://agents.rotz.ai/webhook/2e68b96e-8f08-4e48-8a5d-2b3b5a9c7f3d';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status}`);
    }
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('N8N webhook error:', error);
    res.status(500).json({ error: 'Generation service unavailable' });
  }
});

// N8N Webhook proxy for video generation
app.post('/api/generate/video', authenticateToken, async (req, res) => {
  try {
    const webhookUrl = 'https://agents.rotz.ai/webhook/video-generation-endpoint';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status}`);
    }
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('N8N webhook error:', error);
    res.status(500).json({ error: 'Generation service unavailable' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
initializeDatabase()
  .then(async () => {
    try {
      // Find available port
      const availablePort = await findAvailablePort(port);
      if (availablePort !== port) {
        console.log(`⚠️  Port ${port} in use, using port ${availablePort} instead`);
        port = availablePort;
      }
      
      app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`🗄️  Database: SQLite at ${dbPath}`);
        
        // Write port info to file for frontend to read
        const portInfoPath = path.join(__dirname, '..', 'backend-port.json');
        fs.writeFileSync(portInfoPath, JSON.stringify({ port, apiUrl: `http://localhost:${port}/api` }));
        console.log(`📝 Port info written to ${portInfoPath}`);
      });
    } catch (error) {
      console.error('Failed to find available port:', error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});