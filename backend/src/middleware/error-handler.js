/**
 * Global error handler returning structured, descriptive API error responses
 */
function errorHandler(error, request, response, next) {
  // Zod schema validation error
  if (error.name === 'ZodError') {
    const formattedErrors = {};
    if (Array.isArray(error.issues)) {
      error.issues.forEach((issue) => {
        const path = issue.path.join('.') || 'root';
        formattedErrors[path] = issue.message;
      });
    }
    return response.status(400).json({
      error: 'Validation failed. Please check the submitted fields.',
      details: error.issues,
      fields: formattedErrors
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || {});
    return response.status(409).json({
      error: `A record with this ${fields.join(', ') || 'field'} already exists in the system.`,
      fields
    });
  }

  // Multer file upload errors
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return response.status(400).json({ error: 'Uploaded file exceeds the maximum allowed size of 5MB.' });
    }
    return response.status(400).json({ error: `File upload error: ${error.message}` });
  }

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    return response.status(400).json({
      error: 'Database schema validation failed',
      details: Object.values(error.errors).map((e) => e.message)
    });
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return response.status(400).json({
      error: `Invalid identifier format for ${error.path}.`
    });
  }

  // JSON syntax error in request body
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).json({ error: 'Malformed JSON payload in request body.' });
  }

  console.error('Unhandled server error:', error);
  return response.status(error.status || 500).json({
    error: error.status ? error.message : 'An unexpected internal server error occurred.'
  });
}

module.exports = { errorHandler };
