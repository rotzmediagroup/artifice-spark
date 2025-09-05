import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { query, transaction } from '../config/database.js';
import { 
  generateTokens, 
  storeRefreshToken, 
  verifyRefreshToken,
  revokeRefreshToken 
} from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(2).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password, displayName } = value;

  // Check if user already exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    return res.status(409).json({ error: 'User already exists' });
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Check if user should be admin
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  const isAdmin = adminEmails.includes(email);

  // Create user and profile in transaction
  const userId = uuidv4();
  const queries = [
    {
      text: `INSERT INTO users (id, email, password_hash, display_name, email_confirmed)
             VALUES ($1, $2, $3, $4, $5)`,
      params: [userId, email, passwordHash, displayName, true] // Auto-confirm for now
    }
  ];

  await transaction(queries);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(userId);
  await storeRefreshToken(userId, refreshToken);

  // Get user profile
  const userResult = await query(
    `SELECT u.id, u.email, u.display_name, up.is_admin, up.credits, up.image_credits, up.video_credits
     FROM users u
     JOIN user_profiles up ON u.id = up.id
     WHERE u.id = $1`,
    [userId]
  );

  const user = userResult.rows[0];

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      isAdmin: user.is_admin,
      credits: user.credits,
      imageCredits: user.image_credits,
      videoCredits: user.video_credits
    },
    tokens: {
      accessToken,
      refreshToken
    }
  });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password } = value;

  // Get user with profile
  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.display_name, 
            up.is_admin, up.is_suspended, up.is_active, up.credits, up.image_credits, up.video_credits
     FROM users u
     JOIN user_profiles up ON u.id = up.id
     WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = result.rows[0];

  // Check account status
  if (user.is_suspended) {
    return res.status(403).json({ error: 'Account is suspended' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Account is inactive' });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Update last login
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  await query('UPDATE user_profiles SET last_login = NOW() WHERE id = $1', [user.id]);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);
  await storeRefreshToken(user.id, refreshToken);

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      isAdmin: user.is_admin,
      credits: user.credits,
      imageCredits: user.image_credits,
      videoCredits: user.video_credits
    },
    tokens: {
      accessToken,
      refreshToken
    }
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { error, value } = refreshSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { refreshToken } = value;

  // Verify refresh token
  const tokenData = await verifyRefreshToken(refreshToken);
  if (!tokenData) {
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenData.userId);
  
  // Store new refresh token and revoke old one
  await revokeRefreshToken(refreshToken);
  await storeRefreshToken(tokenData.userId, newRefreshToken);

  res.json({
    tokens: {
      accessToken,
      refreshToken: newRefreshToken
    }
  });
}));

// Logout
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  res.json({ message: 'Logged out successfully' });
}));

// Check auth status
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key-here');
    
    const result = await query(
      `SELECT u.id, u.email, u.display_name, up.is_admin, up.credits, up.image_credits, up.video_credits
       FROM users u
       JOIN user_profiles up ON u.id = up.id
       WHERE u.id = $1 AND up.is_active = true AND up.is_suspended = false`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        isAdmin: user.is_admin,
        credits: user.credits,
        imageCredits: user.image_credits,
        videoCredits: user.video_credits
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}));

export default router;