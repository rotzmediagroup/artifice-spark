import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-here';

// Generate JWT tokens
export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authenticate middleware
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'access') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Verify user still exists and is active
    const result = await query(
      `SELECT u.id, u.email, u.display_name, up.is_admin, up.is_suspended, up.is_active
       FROM users u
       JOIN user_profiles up ON u.id = up.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.is_suspended || !user.is_active) {
      return res.status(403).json({ error: 'Account suspended or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Admin only middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Store refresh token in database
export const storeRefreshToken = async (userId, refreshToken) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await query(
    `INSERT INTO user_sessions (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (refresh_token) DO UPDATE SET 
     expires_at = $3, last_used = NOW()`,
    [userId, refreshToken, expiresAt]
  );
};

// Verify refresh token
export const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = verifyToken(refreshToken);
    
    if (!decoded || decoded.type !== 'refresh') {
      return null;
    }

    // Check if refresh token exists in database and is not expired
    const result = await query(
      `SELECT user_id FROM user_sessions 
       WHERE refresh_token = $1 AND expires_at > NOW()`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update last used timestamp
    await query(
      'UPDATE user_sessions SET last_used = NOW() WHERE refresh_token = $1',
      [refreshToken]
    );

    return { userId: result.rows[0].user_id };
  } catch (error) {
    console.error('Refresh token verification error:', error);
    return null;
  }
};

// Revoke refresh token
export const revokeRefreshToken = async (refreshToken) => {
  await query(
    'DELETE FROM user_sessions WHERE refresh_token = $1',
    [refreshToken]
  );
};