/**
 * @file errorHandler.js
 * @description Global error handling middleware
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let details = err.details || null;

    // Validation errors (express-validator)
    if (err.array && typeof err.array === 'function') {
        statusCode = 400;
        message = 'Validation error';
        details = err.array();
    }

    // Firebase errors
    if (err.code && err.code.startsWith('auth/')) {
        statusCode = 401;
        message = mapFirebaseAuthError(err.code);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Map Firebase auth error codes to user-friendly messages
 */
function mapFirebaseAuthError(code) {
    const errorMap = {
        'auth/user-not-found': 'Invalid email or password',
        'auth/wrong-password': 'Invalid email or password',
        'auth/invalid-email': 'Invalid email format',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password': 'Password is too weak',
        'auth/too-many-requests': 'Too many attempts. Try again later'
    };
    return errorMap[code] || 'Authentication error';
}

/**
 * Async handler wrapper to catch async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    ApiError,
    errorHandler,
    asyncHandler
};
