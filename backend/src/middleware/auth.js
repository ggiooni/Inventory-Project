/**
 * @file auth.js
 * @description Authentication middleware
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const jwt = require('jsonwebtoken');
const { USER_ROLES, MESSAGES } = require('../config/constants');

/**
 * Verify JWT token middleware
 */
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: MESSAGES.ERROR.UNAUTHORIZED
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }
        return res.status(401).json({
            success: false,
            error: MESSAGES.ERROR.UNAUTHORIZED
        });
    }
};

/**
 * Check if user is admin
 */
const isAdmin = (req, res, next) => {
    if (req.user.role !== USER_ROLES.ADMIN) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};

/**
 * Check if user is manager or admin
 */
const isManagerOrAdmin = (req, res, next) => {
    if (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.MANAGER) {
        return res.status(403).json({
            success: false,
            error: 'Manager or Admin access required'
        });
    }
    next();
};

/**
 * Check if user can modify stock (any authenticated user)
 */
const canModifyStock = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: MESSAGES.ERROR.UNAUTHORIZED
        });
    }
    next();
};

module.exports = {
    verifyToken,
    isAdmin,
    isManagerOrAdmin,
    canModifyStock
};
