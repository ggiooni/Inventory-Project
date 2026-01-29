/**
 * Auth Middleware Tests
 * @description Unit tests for authentication middleware functions
 */

const jwt = require('jsonwebtoken');
const { verifyToken, isAdmin, isManagerOrAdmin, canModifyStock } = require('../../src/middleware/auth');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = global.testUtils.mockRequest();
        res = global.testUtils.mockResponse();
        next = global.testUtils.mockNext();
    });

    // =============================================
    // verifyToken Tests
    // =============================================
    describe('verifyToken', () => {
        it('should call next() with valid token', () => {
            const token = global.testUtils.generateTestToken({ email: 'admin@test.com', role: 'admin' });
            req.headers.authorization = `Bearer ${token}`;

            verifyToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.user).toBeDefined();
            expect(req.user.email).toBe('admin@test.com');
            expect(req.user.role).toBe('admin');
        });

        it('should return 401 when no authorization header', () => {
            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.any(String)
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when authorization header does not start with Bearer', () => {
            req.headers.authorization = 'Basic sometoken';

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.any(String)
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when token is expired', () => {
            const expiredToken = global.testUtils.generateExpiredToken();
            req.headers.authorization = `Bearer ${expiredToken}`;

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Token expired'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when token is invalid', () => {
            req.headers.authorization = 'Bearer invalid-token';

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.any(String)
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when token has wrong signature', () => {
            const token = jwt.sign(
                { email: 'test@test.com', role: 'admin' },
                'wrong-secret',
                { expiresIn: '1h' }
            );
            req.headers.authorization = `Bearer ${token}`;

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
    });

    // =============================================
    // isAdmin Tests
    // =============================================
    describe('isAdmin', () => {
        it('should call next() when user is admin', () => {
            req.user = { email: 'admin@test.com', role: 'admin' };

            isAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should return 403 when user is manager', () => {
            req.user = { email: 'manager@test.com', role: 'manager' };

            isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Admin access required'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 403 when user is staff', () => {
            req.user = { email: 'staff@test.com', role: 'staff' };

            isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Admin access required'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // =============================================
    // isManagerOrAdmin Tests
    // =============================================
    describe('isManagerOrAdmin', () => {
        it('should call next() when user is admin', () => {
            req.user = { email: 'admin@test.com', role: 'admin' };

            isManagerOrAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should call next() when user is manager', () => {
            req.user = { email: 'manager@test.com', role: 'manager' };

            isManagerOrAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should return 403 when user is staff', () => {
            req.user = { email: 'staff@test.com', role: 'staff' };

            isManagerOrAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Manager or Admin access required'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // =============================================
    // canModifyStock Tests
    // =============================================
    describe('canModifyStock', () => {
        it('should call next() when user is authenticated (any role)', () => {
            req.user = { email: 'staff@test.com', role: 'staff' };

            canModifyStock(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should call next() when user is admin', () => {
            req.user = { email: 'admin@test.com', role: 'admin' };

            canModifyStock(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should call next() when user is manager', () => {
            req.user = { email: 'manager@test.com', role: 'manager' };

            canModifyStock(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should return 401 when user is not authenticated', () => {
            req.user = null;

            canModifyStock(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.any(String)
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
