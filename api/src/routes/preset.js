import express from 'express';
import Joi from 'joi';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get user presets
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, name, positive_prompt, negative_prompt, selected_style, aspect_ratio,
            steps, cfg_scale, custom_width, custom_height, use_custom_dimensions, created_at
     FROM presets 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  res.json({
    presets: result.rows.map(preset => ({
      id: preset.id,
      name: preset.name,
      positivePrompt: preset.positive_prompt,
      negativePrompt: preset.negative_prompt,
      selectedStyle: preset.selected_style,
      aspectRatio: preset.aspect_ratio,
      steps: preset.steps,
      cfgScale: preset.cfg_scale,
      customWidth: preset.custom_width,
      customHeight: preset.custom_height,
      useCustomDimensions: preset.use_custom_dimensions,
      createdAt: preset.created_at
    }))
  });
}));

// Create preset
router.post('/', asyncHandler(async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    positivePrompt: Joi.string().required(),
    negativePrompt: Joi.string().allow(''),
    selectedStyle: Joi.string().required(),
    aspectRatio: Joi.object().required(),
    steps: Joi.number().integer().min(1).max(100).required(),
    cfgScale: Joi.number().min(1).max(20).required(),
    customWidth: Joi.number().integer().min(256).max(2048),
    customHeight: Joi.number().integer().min(256).max(2048),
    useCustomDimensions: Joi.boolean().default(false)
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const result = await query(
    `INSERT INTO presets 
     (user_id, name, positive_prompt, negative_prompt, selected_style, aspect_ratio,
      steps, cfg_scale, custom_width, custom_height, use_custom_dimensions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      req.user.id, value.name, value.positivePrompt, value.negativePrompt,
      value.selectedStyle, JSON.stringify(value.aspectRatio), value.steps,
      value.cfgScale, value.customWidth, value.customHeight, value.useCustomDimensions
    ]
  );

  const preset = result.rows[0];

  res.status(201).json({
    id: preset.id,
    name: preset.name,
    positivePrompt: preset.positive_prompt,
    negativePrompt: preset.negative_prompt,
    selectedStyle: preset.selected_style,
    aspectRatio: preset.aspect_ratio,
    steps: preset.steps,
    cfgScale: preset.cfg_scale,
    customWidth: preset.custom_width,
    customHeight: preset.custom_height,
    useCustomDimensions: preset.use_custom_dimensions,
    createdAt: preset.created_at
  });
}));

// Delete preset
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await query(
    'DELETE FROM presets WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Preset not found' });
  }

  res.json({ message: 'Preset deleted successfully' });
}));

export default router;