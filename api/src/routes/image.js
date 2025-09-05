import express from 'express';
import Joi from 'joi';
import { query, transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get user's image history
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT id, url, file_path, prompt, style, liked, content_type, file_extension,
            settings, expires_at, extension_count, last_extended_at, created_at
     FROM image_history 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM image_history WHERE user_id = $1',
    [req.user.id]
  );

  res.json({
    images: result.rows.map(img => ({
      id: img.id,
      url: img.url,
      prompt: img.prompt,
      style: img.style,
      liked: img.liked,
      contentType: img.content_type,
      fileExtension: img.file_extension,
      settings: img.settings,
      expiresAt: img.expires_at,
      extensionCount: img.extension_count,
      lastExtendedAt: img.last_extended_at,
      createdAt: img.created_at
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      pages: Math.ceil(countResult.rows[0].count / limit)
    }
  });
}));

// Save generated image
router.post('/', asyncHandler(async (req, res) => {
  const schema = Joi.object({
    url: Joi.string().uri().required(),
    filePath: Joi.string().required(),
    prompt: Joi.string().required(),
    style: Joi.string().allow(''),
    contentType: Joi.string().valid('image', 'video').default('image'),
    fileExtension: Joi.string().default('.png'),
    settings: Joi.object().default({}),
    expiresAt: Joi.date().iso()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    url, filePath, prompt, style, contentType, fileExtension, settings, expiresAt
  } = value;

  // Default expiration: 14 days from now
  const expires = expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const result = await query(
    `INSERT INTO image_history 
     (user_id, url, file_path, prompt, style, content_type, file_extension, settings, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [req.user.id, url, filePath, prompt, style, contentType, fileExtension, settings, expires]
  );

  // Update user stats
  await query(
    'UPDATE user_profiles SET total_images_generated = total_images_generated + 1 WHERE id = $1',
    [req.user.id]
  );

  const image = result.rows[0];

  res.status(201).json({
    id: image.id,
    url: image.url,
    prompt: image.prompt,
    style: image.style,
    liked: image.liked,
    contentType: image.content_type,
    fileExtension: image.file_extension,
    settings: image.settings,
    expiresAt: image.expires_at,
    createdAt: image.created_at
  });
}));

// Update image (like/unlike, extend expiration)
router.put('/:id', asyncHandler(async (req, res) => {
  const schema = Joi.object({
    liked: Joi.boolean(),
    extend: Joi.boolean()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { liked, extend } = value;
  const imageId = req.params.id;

  let updateQuery = 'UPDATE image_history SET ';
  const updateParams = [];
  const updates = [];

  if (liked !== undefined) {
    updates.push(`liked = $${updates.length + 1}`);
    updateParams.push(liked);
  }

  if (extend) {
    // Check extension limit (3 max for regular users, unlimited for admin)
    const imageResult = await query(
      'SELECT extension_count FROM image_history WHERE id = $1 AND user_id = $2',
      [imageId, req.user.id]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const currentExtensions = imageResult.rows[0].extension_count;

    if (!req.user.is_admin && currentExtensions >= 3) {
      return res.status(400).json({ error: 'Maximum extensions reached' });
    }

    // Extend by 14 days
    updates.push(`expires_at = expires_at + INTERVAL '14 days'`);
    updates.push(`extension_count = extension_count + 1`);
    updates.push(`last_extended_at = NOW()`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  updateQuery += updates.join(', ');
  updateQuery += ` WHERE id = $${updates.length + 1} AND user_id = $${updates.length + 2} RETURNING *`;
  updateParams.push(imageId, req.user.id);

  const result = await query(updateQuery, updateParams);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Image not found' });
  }

  const image = result.rows[0];

  res.json({
    id: image.id,
    url: image.url,
    prompt: image.prompt,
    style: image.style,
    liked: image.liked,
    contentType: image.content_type,
    fileExtension: image.file_extension,
    settings: image.settings,
    expiresAt: image.expires_at,
    extensionCount: image.extension_count,
    lastExtendedAt: image.last_extended_at,
    createdAt: image.created_at
  });
}));

// Delete image
router.delete('/:id', asyncHandler(async (req, res) => {
  const imageId = req.params.id;

  const result = await query(
    'DELETE FROM image_history WHERE id = $1 AND user_id = $2 RETURNING file_path',
    [imageId, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Image not found' });
  }

  // TODO: Delete physical file
  // const filePath = result.rows[0].file_path;
  // await fs.unlink(filePath);

  res.json({ message: 'Image deleted successfully' });
}));

export default router;