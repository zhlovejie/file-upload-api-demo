const logger = require('../utils/logger');

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;
  const message = statusCode === 500 ? 'Internal server error.' : error.message;

  logger.error('Request failed', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: error.message,
    stack: statusCode === 500 ? error.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: statusCode,
      details: error.details || null,
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = errorHandler;
