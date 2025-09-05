// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // PostgreSQL error handling
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(409).json({
          error: 'Resource already exists',
          details: err.detail
        });
      
      case '23503': // Foreign key violation
        return res.status(400).json({
          error: 'Referenced resource does not exist',
          details: err.detail
        });
      
      case '23502': // Not null violation
        return res.status(400).json({
          error: 'Required field missing',
          details: err.column
        });
      
      default:
        return res.status(500).json({
          error: 'Database error',
          code: err.code
        });
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details
    });
  }

  // Multer errors (file upload)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload error',
      details: err.message
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};

// Async wrapper to catch async errors
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};