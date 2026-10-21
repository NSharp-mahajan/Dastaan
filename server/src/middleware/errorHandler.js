export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500);

  // Sanitize message: never leak sensitive credentials, connection strings, or system paths
  let safeMessage = err.message || 'An unexpected server error occurred';

  // Check for specific error types
  if (err.name === 'ValidationError') {
    safeMessage = Object.values(err.errors).map(val => val.message).join(', ');
  } else if (err.code === 11000) {
    safeMessage = 'Duplicate field value entered';
  } else if (err.name === 'CastError') {
    safeMessage = `Resource not found with id: ${err.value}`;
  }

  // Strip potential credential strings if any
  safeMessage = safeMessage.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/i, 'mongodb://[credentials-hidden]@');

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    ...(process.env.NODE_ENV === 'development' && {
      name: err.name,
      stack: err.stack ? err.stack.split('\n')[1]?.trim() : undefined
    })
  });
};
