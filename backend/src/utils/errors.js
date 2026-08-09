class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (typeof details === 'string') {
      this.code = details;
      this.details = null;
    } else {
      this.details = details;
      if (details && typeof details === 'object' && details.code) {
        this.code = details.code;
      }
    }
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

  if (err.code && typeof err.code === 'string' && !String(err.code).startsWith('P')) {
    payload.code = err.code;
  }

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
