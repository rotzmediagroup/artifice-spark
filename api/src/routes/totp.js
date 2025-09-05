import express from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as OTPAuth from 'otpauth';

const router = express.Router();

// Get TOTP settings for current user
router.get('/settings', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT enabled, secret, backup_codes, enrolled_at, last_used, recovery_email FROM totp_settings WHERE user_id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.json(null);
  }

  const settings = result.rows[0];

  res.json({
    userId: req.user.id,
    enabled: settings.enabled,
    secret: settings.secret,
    backupCodes: settings.backup_codes || [],
    enrolledAt: settings.enrolled_at,
    lastUsed: settings.last_used,
    recoveryEmail: settings.recovery_email
  });
}));

// Enable TOTP for current user
router.post('/enable', asyncHandler(async (req, res) => {
  const { secret, verificationCode, backupCodes } = req.body;

  if (!secret || !verificationCode || !backupCodes) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Verify the code first
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30
    });

    const isValid = totp.validate({ token: verificationCode, window: 1 }) !== null;

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Save TOTP settings
    await query(
      `INSERT INTO totp_settings (user_id, enabled, secret, backup_codes, enrolled_at, recovery_email, updated_at)
       VALUES ($1, true, $2, $3, NOW(), $4, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET enabled = true, secret = $2, backup_codes = $3, enrolled_at = NOW(), updated_at = NOW()`,
      [req.user.id, secret, JSON.stringify(backupCodes), req.user.email]
    );

    res.json({ success: true, message: 'TOTP enabled successfully' });
  } catch (error) {
    console.error('Error enabling TOTP:', error);
    return res.status(500).json({ error: 'Failed to enable TOTP' });
  }
}));

// Disable TOTP for current user
router.post('/disable', asyncHandler(async (req, res) => {
  const { verificationCode } = req.body;

  if (!verificationCode) {
    return res.status(400).json({ error: 'Verification code required' });
  }

  // Get current settings
  const settingsResult = await query(
    'SELECT secret FROM totp_settings WHERE user_id = $1 AND enabled = true',
    [req.user.id]
  );

  if (settingsResult.rows.length === 0) {
    return res.status(400).json({ error: 'TOTP not enabled' });
  }

  const { secret } = settingsResult.rows[0];

  // Verify the code
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30
    });

    const isValid = totp.validate({ token: verificationCode, window: 1 }) !== null;

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Disable TOTP
    await query(
      'UPDATE totp_settings SET enabled = false, updated_at = NOW() WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ success: true, message: 'TOTP disabled successfully' });
  } catch (error) {
    console.error('Error disabling TOTP:', error);
    return res.status(500).json({ error: 'Failed to disable TOTP' });
  }
}));

// Verify TOTP code
router.post('/verify', asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Verification code required' });
  }

  const settingsResult = await query(
    'SELECT secret FROM totp_settings WHERE user_id = $1 AND enabled = true',
    [req.user.id]
  );

  if (settingsResult.rows.length === 0) {
    return res.status(400).json({ error: 'TOTP not enabled' });
  }

  const { secret } = settingsResult.rows[0];

  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30
    });

    const isValid = totp.validate({ token: code, window: 1 }) !== null;

    if (isValid) {
      // Update last used timestamp
      await query(
        'UPDATE totp_settings SET last_used = NOW() WHERE user_id = $1',
        [req.user.id]
      );
    }

    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    res.json({ valid: false });
  }
}));

// Verify backup code
router.post('/verify-backup', asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Backup code required' });
  }

  const settingsResult = await query(
    'SELECT backup_codes FROM totp_settings WHERE user_id = $1 AND enabled = true',
    [req.user.id]
  );

  if (settingsResult.rows.length === 0) {
    return res.status(400).json({ error: 'TOTP not enabled' });
  }

  const backupCodes = settingsResult.rows[0].backup_codes || [];
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normalizedBackupCodes = backupCodes.map(c => 
    c.toUpperCase().replace(/[^A-Z0-9]/g, '')
  );

  const index = normalizedBackupCodes.indexOf(normalizedCode);
  if (index === -1) {
    return res.json({ valid: false });
  }

  // Remove used backup code
  const newBackupCodes = [...backupCodes];
  newBackupCodes.splice(index, 1);

  await query(
    'UPDATE totp_settings SET backup_codes = $1, last_used = NOW() WHERE user_id = $2',
    [JSON.stringify(newBackupCodes), req.user.id]
  );

  res.json({ 
    valid: true, 
    backupCodes: newBackupCodes
  });
}));

// Regenerate backup codes
router.post('/regenerate-backup-codes', asyncHandler(async (req, res) => {
  // Check if TOTP is enabled
  const settingsResult = await query(
    'SELECT id FROM totp_settings WHERE user_id = $1 AND enabled = true',
    [req.user.id]
  );

  if (settingsResult.rows.length === 0) {
    return res.status(400).json({ error: 'TOTP not enabled' });
  }

  // Generate new backup codes
  const newCodes = [];
  for (let i = 0; i < 10; i++) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    newCodes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  await query(
    'UPDATE totp_settings SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
    [JSON.stringify(newCodes), req.user.id]
  );

  res.json({ backupCodes: newCodes });
}));

export default router;