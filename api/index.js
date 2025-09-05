const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'rotz_image_generator',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User Profiles endpoints
app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
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

app.post('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      email, display_name, photo_url, credits, image_credits, video_credits,
      is_admin, total_credits_granted, total_credits_used, mfa_enabled,
      mfa_enabled_at, is_active, is_suspended, suspended_at, suspended_by,
      suspension_reason, deleted_at, deleted_by, delete_reason
    } = req.body;

    const result = await pool.query(`
      INSERT INTO user_profiles (
        user_id, email, display_name, photo_url, credits, image_credits, video_credits,
        is_admin, total_credits_granted, total_credits_used, mfa_enabled, mfa_enabled_at,
        is_active, is_suspended, suspended_at, suspended_by, suspension_reason,
        deleted_at, deleted_by, delete_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        photo_url = EXCLUDED.photo_url,
        credits = EXCLUDED.credits,
        image_credits = EXCLUDED.image_credits,
        video_credits = EXCLUDED.video_credits,
        is_admin = EXCLUDED.is_admin,
        total_credits_granted = EXCLUDED.total_credits_granted,
        total_credits_used = EXCLUDED.total_credits_used,
        mfa_enabled = EXCLUDED.mfa_enabled,
        mfa_enabled_at = EXCLUDED.mfa_enabled_at,
        is_active = EXCLUDED.is_active,
        is_suspended = EXCLUDED.is_suspended,
        suspended_at = EXCLUDED.suspended_at,
        suspended_by = EXCLUDED.suspended_by,
        suspension_reason = EXCLUDED.suspension_reason,
        deleted_at = EXCLUDED.deleted_at,
        deleted_by = EXCLUDED.deleted_by,
        delete_reason = EXCLUDED.delete_reason,
        last_login = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [
      userId, email, display_name, photo_url, credits, image_credits, video_credits,
      is_admin, total_credits_granted, total_credits_used, mfa_enabled, mfa_enabled_at,
      is_active, is_suspended, suspended_at, suspended_by, suspension_reason,
      deleted_at, deleted_by, delete_reason
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Image History endpoints
app.get('/api/users/:userId/images', async (req, res) => {
  try {
    const { userId } = req.params;
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

app.post('/api/users/:userId/images', async (req, res) => {
  try {
    const { userId } = req.params;
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

app.put('/api/users/:userId/images/:imageId', async (req, res) => {
  try {
    const { userId, imageId } = req.params;
    const updates = req.body;
    
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');
    
    const values = [userId, imageId, ...Object.values(updates)];
    
    const result = await pool.query(`
      UPDATE image_history 
      SET ${setClause}, updated_at = NOW()
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:userId/images/:imageId', async (req, res) => {
  try {
    const { userId, imageId } = req.params;
    const result = await pool.query(
      'DELETE FROM image_history WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, imageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Presets endpoints
app.get('/api/users/:userId/presets', async (req, res) => {
  try {
    const { userId } = req.params;
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

app.post('/api/users/:userId/presets', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      name, positive_prompt, negative_prompt, selected_style,
      aspect_ratio_label, aspect_ratio_value, aspect_ratio_width,
      aspect_ratio_height, aspect_ratio_category, steps, cfg_scale,
      custom_width, custom_height, use_custom_dimensions
    } = req.body;

    const result = await pool.query(`
      INSERT INTO presets (
        user_id, name, positive_prompt, negative_prompt, selected_style,
        aspect_ratio_label, aspect_ratio_value, aspect_ratio_width,
        aspect_ratio_height, aspect_ratio_category, steps, cfg_scale,
        custom_width, custom_height, use_custom_dimensions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      userId, name, positive_prompt, negative_prompt, selected_style,
      aspect_ratio_label, aspect_ratio_value, aspect_ratio_width,
      aspect_ratio_height, aspect_ratio_category, steps, cfg_scale,
      custom_width, custom_height, use_custom_dimensions
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding preset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:userId/presets/:presetId', async (req, res) => {
  try {
    const { userId, presetId } = req.params;
    const updates = req.body;
    
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');
    
    const values = [userId, presetId, ...Object.values(updates)];
    
    const result = await pool.query(`
      UPDATE presets 
      SET ${setClause}, updated_at = NOW()
      WHERE user_id = $1 AND id = $2
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating preset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:userId/presets/:presetId', async (req, res) => {
  try {
    const { userId, presetId } = req.params;
    const result = await pool.query(
      'DELETE FROM presets WHERE user_id = $1 AND id = $2 RETURNING *',
      [userId, presetId]
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

// TOTP Settings endpoints
app.get('/api/users/:userId/totp', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM totp_settings WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'TOTP settings not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching TOTP settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:userId/totp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled, secret, backup_codes, enrolled_at, last_used, recovery_email } = req.body;

    const result = await pool.query(`
      INSERT INTO totp_settings (user_id, enabled, secret, backup_codes, enrolled_at, last_used, recovery_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        secret = EXCLUDED.secret,
        backup_codes = EXCLUDED.backup_codes,
        enrolled_at = EXCLUDED.enrolled_at,
        last_used = EXCLUDED.last_used,
        recovery_email = EXCLUDED.recovery_email,
        updated_at = NOW()
      RETURNING *
    `, [userId, enabled, secret, backup_codes, enrolled_at, last_used, recovery_email]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating/updating TOTP settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:userId/totp', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [userId, ...Object.values(updates)];
    
    const result = await pool.query(`
      UPDATE totp_settings 
      SET ${setClause}, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'TOTP settings not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating TOTP settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Credit Transactions endpoints
app.get('/api/users/:userId/credits', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users/:userId/credits', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, amount, credit_type, description, transaction_reference, source, metadata } = req.body;

    const result = await pool.query(`
      INSERT INTO credit_transactions (user_id, type, amount, credit_type, description, transaction_reference, source, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId, type, amount, credit_type, description, transaction_reference, source, metadata]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding credit transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
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