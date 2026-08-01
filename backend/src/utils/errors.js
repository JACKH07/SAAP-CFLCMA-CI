class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || 'Erreur interne du serveur',
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    payload.stack = err.stack;
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Conflit : une ressource avec ces données existe déjà',
      details: err.meta,
    });
  }

  res.status(statusCode).json(payload);
}

module.exports = { AppError, asyncHandler, errorHandler };
