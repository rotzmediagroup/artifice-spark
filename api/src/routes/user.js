import express from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get user profile
router.get('/profile', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.id, u.email, u.display_name, up.is_admin, up.credits, up.image_credits, 
            up.video_credits, up.total_images_generated, up.created_at, up.last_login
     FROM users u
     JOIN user_profiles up ON u.id = up.id
     WHERE u.id = $1`,
    [req.user.id]
  );

  const user = result.rows[0];

  res.json({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    isAdmin: user.is_admin,
    credits: user.credits,
    imageCredits: user.image_credits,
    videoCredits: user.video_credits,
    totalImagesGenerated: user.total_images_generated,
    createdAt: user.created_at,
    lastLogin: user.last_login
  });
}));

// Get user credits
router.get('/credits', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT credits, image_credits, video_credits FROM user_profiles WHERE id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const credits = result.rows[0];

  res.json({
    credits: credits.credits,
    imageCredits: credits.image_credits,
    videoCredits: credits.video_credits
  });
}));

// Get credit transactions
router.get('/transactions', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT id, amount, type, description, metadata, created_at
     FROM credit_transactions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM credit_transactions WHERE user_id = $1',
    [req.user.id]
  );

  res.json({
    transactions: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      pages: Math.ceil(countResult.rows[0].count / limit)
    }
  });
}));

export default router;