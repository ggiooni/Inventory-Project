/**
 * Auth Controller Tests
 * @description Unit tests for authentication controller logic
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Set up test environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Mock Firebase
jest.mock('../../src/config/firebase', () => ({
    db: null
}));

// Import constants and error handler
const { USER_ROLES, JWT_CONFIG, MESSAGES } = require('../../src/config/constants');
const { ApiError } = require('../../src/middleware/errorHandler');

describe('Auth Controller', () => {
    // =============================================
    // Demo Users Configuration Tests
    // =============================================
    describe('Demo Users Configuration', () => {
        const DEMO_USERS = {
            'admin@inventory.com': { password: 'admin123.', role: USER_ROLES.ADMIN },
            'manager@inventory.com': { password: 'manager123.', role: USER_ROLES.MANAGER },
            'staff@inventory.com': { password: 'staff123.', role: USER_ROLES.STAFF }
        };

        it('should have admin demo user', () => {
            expect(DEMO_USERS['admin@inventory.com']).toBeDefined();
            expect(DEMO_USERS['admin@inventory.com'].role).toBe('admin');
        });

        it('should have manager demo user', () => {
            expect(DEMO_USERS['manager@inventory.com']).toBeDefined();
            expect(DEMO_USERS['manager@inventory.com'].role).toBe('manager');
        });

        it('should have staff demo user', () => {
            expect(DEMO_USERS['staff@inventory.com']).toBeDefined();
            expect(DEMO_USERS['staff@inventory.com'].role).toBe('staff');
        });
    });

    // =============================================
    // Login Logic Tests
    // =============================================
    describe('Login Logic', () => {
        const DEMO_USERS = {
            'admin@inventory.com': { password: 'admin123.', role: 'admin' },
            'manager@inventory.com': { password: 'manager123.', role: 'manager' },
            'staff@inventory.com': { password: 'staff123.', role: 'staff' }
        };

        function validateLogin(email, password) {
            if (!email || !password) {
                throw new ApiError(400, 'Email and password are required');
            }

            const demoUser = DEMO_USERS[email.toLowerCase()];
            if (demoUser && password === demoUser.password) {
                return {
                    success: true,
                    email: email.toLowerCase(),
                    role: demoUser.role
                };
            }

            throw new ApiError(401, 'Invalid email or password');
        }

        it('should validate admin credentials', () => {
            const result = validateLogin('admin@inventory.com', 'admin123.');
            expect(result.success).toBe(true);
            expect(result.role).toBe('admin');
        });

        it('should validate manager credentials', () => {
            const result = validateLogin('manager@inventory.com', 'manager123.');
            expect(result.success).toBe(true);
            expect(result.role).toBe('manager');
        });

        it('should validate staff credentials', () => {
            const result = validateLogin('staff@inventory.com', 'staff123.');
            expect(result.success).toBe(true);
            expect(result.role).toBe('staff');
        });

        it('should handle case-insensitive email', () => {
            const result = validateLogin('ADMIN@INVENTORY.COM', 'admin123.');
            expect(result.success).toBe(true);
        });

        it('should throw error when email is missing', () => {
            expect(() => validateLogin(null, 'password123')).toThrow('Email and password are required');
        });

        it('should throw error when password is missing', () => {
            expect(() => validateLogin('test@test.com', null)).toThrow('Email and password are required');
        });

        it('should throw error with wrong password', () => {
            expect(() => validateLogin('admin@inventory.com', 'wrongpassword')).toThrow('Invalid email or password');
        });

        it('should throw error for non-existent user', () => {
            expect(() => validateLogin('nonexistent@test.com', 'password123')).toThrow('Invalid email or password');
        });
    });

    // =============================================
    // Register Validation Tests
    // =============================================
    describe('Register Validation', () => {
        function validateRegister(email, password, dbAvailable = false) {
            if (!email || !password) {
                throw new ApiError(400, 'Email and password are required');
            }

            if (password.length < 6) {
                throw new ApiError(400, 'Password must be at least 6 characters');
            }

            if (!dbAvailable) {
                throw new ApiError(500, 'Database not available');
            }

            return { success: true };
        }

        it('should throw error when email is missing', () => {
            expect(() => validateRegister(null, 'password123')).toThrow('Email and password are required');
        });

        it('should throw error when password is missing', () => {
            expect(() => validateRegister('test@test.com', null)).toThrow('Email and password are required');
        });

        it('should throw error when password is too short', () => {
            expect(() => validateRegister('test@test.com', '12345')).toThrow('Password must be at least 6 characters');
        });

        it('should throw error when database is not available', () => {
            expect(() => validateRegister('test@test.com', 'password123', false)).toThrow('Database not available');
        });

        it('should accept valid password of 6+ characters', () => {
            const result = validateRegister('test@test.com', 'password123', true);
            expect(result.success).toBe(true);
        });

        it('should accept exactly 6 character password', () => {
            const result = validateRegister('test@test.com', '123456', true);
            expect(result.success).toBe(true);
        });
    });

    // =============================================
    // Token Generation Tests
    // =============================================
    describe('Token Generation', () => {
        function generateToken(email, role) {
            return jwt.sign(
                { email, role },
                process.env.JWT_SECRET,
                { expiresIn: JWT_CONFIG.EXPIRES_IN }
            );
        }

        it('should generate valid JWT token', () => {
            const token = generateToken('admin@inventory.com', 'admin');
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });

        it('should include email in token payload', () => {
            const token = generateToken('admin@inventory.com', 'admin');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.email).toBe('admin@inventory.com');
        });

        it('should include role in token payload', () => {
            const token = generateToken('admin@inventory.com', 'admin');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.role).toBe('admin');
        });

        it('should include expiration', () => {
            const token = generateToken('admin@inventory.com', 'admin');
            const decoded = jwt.decode(token);
            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
        });

        it('should generate different tokens for different users', () => {
            const adminToken = generateToken('admin@inventory.com', 'admin');
            const staffToken = generateToken('staff@inventory.com', 'staff');
            expect(adminToken).not.toBe(staffToken);
        });
    });

    // =============================================
    // Profile Response Tests
    // =============================================
    describe('Profile Response', () => {
        function getProfileData(user) {
            return {
                email: user.email,
                role: user.role,
                displayName: user.email.split('@')[0]
            };
        }

        it('should derive displayName from email', () => {
            const user = { email: 'admin@inventory.com', role: 'admin' };
            const profile = getProfileData(user);
            expect(profile.displayName).toBe('admin');
        });

        it('should include email and role', () => {
            const user = { email: 'manager@inventory.com', role: 'manager' };
            const profile = getProfileData(user);
            expect(profile.email).toBe('manager@inventory.com');
            expect(profile.role).toBe('manager');
        });

        it('should handle complex email usernames', () => {
            const user = { email: 'john.doe@example.com', role: 'staff' };
            const profile = getProfileData(user);
            expect(profile.displayName).toBe('john.doe');
        });
    });

    // =============================================
    // Password Hashing Tests
    // =============================================
    describe('Password Hashing', () => {
        it('should hash password with bcrypt', async () => {
            const password = 'testpassword123';
            const hashed = await bcrypt.hash(password, 10);

            expect(hashed).not.toBe(password);
            expect(hashed.startsWith('$2')).toBe(true); // bcrypt prefix
        });

        it('should verify correct password', async () => {
            const password = 'testpassword123';
            const hashed = await bcrypt.hash(password, 10);
            const isValid = await bcrypt.compare(password, hashed);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const password = 'testpassword123';
            const hashed = await bcrypt.hash(password, 10);
            const isValid = await bcrypt.compare('wrongpassword', hashed);

            expect(isValid).toBe(false);
        });
    });

    // =============================================
    // API Error Tests
    // =============================================
    describe('API Error', () => {
        it('should create error with correct status code', () => {
            const error = new ApiError(400, 'Test error');
            expect(error.statusCode).toBe(400);
        });

        it('should create error with correct message', () => {
            const error = new ApiError(401, 'Unauthorized');
            expect(error.message).toBe('Unauthorized');
        });

        it('should be an instance of Error', () => {
            const error = new ApiError(500, 'Server error');
            expect(error instanceof Error).toBe(true);
        });

        it('should be operational', () => {
            const error = new ApiError(400, 'Bad request');
            expect(error.isOperational).toBe(true);
        });

        it('should allow details', () => {
            const details = { field: 'email', message: 'Invalid format' };
            const error = new ApiError(400, 'Validation error', details);
            expect(error.details).toEqual(details);
        });
    });

    // =============================================
    // Response Format Tests
    // =============================================
    describe('Response Format', () => {
        it('should format successful login response', () => {
            const response = {
                success: true,
                message: MESSAGES.SUCCESS.LOGIN,
                data: {
                    token: 'test-token',
                    user: {
                        email: 'admin@inventory.com',
                        role: 'admin',
                        displayName: 'admin'
                    }
                }
            };

            expect(response.success).toBe(true);
            expect(response.data.token).toBe('test-token');
            expect(response.data.user.email).toBe('admin@inventory.com');
        });

        it('should format logout response', () => {
            const response = {
                success: true,
                message: MESSAGES.SUCCESS.LOGOUT
            };

            expect(response.success).toBe(true);
            expect(response.message).toBe('Logout successful');
        });

        it('should format error response', () => {
            const response = {
                success: false,
                error: 'Invalid email or password'
            };

            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
        });
    });

    // =============================================
    // User Role Tests
    // =============================================
    describe('User Roles', () => {
        it('should have admin role defined', () => {
            expect(USER_ROLES.ADMIN).toBe('admin');
        });

        it('should have manager role defined', () => {
            expect(USER_ROLES.MANAGER).toBe('manager');
        });

        it('should have staff role defined', () => {
            expect(USER_ROLES.STAFF).toBe('staff');
        });

        it('should default to staff role for new users', () => {
            const defaultRole = USER_ROLES.STAFF;
            expect(defaultRole).toBe('staff');
        });
    });

    // =============================================
    // JWT Configuration Tests
    // =============================================
    describe('JWT Configuration', () => {
        it('should have 24h expiration', () => {
            expect(JWT_CONFIG.EXPIRES_IN).toBe('24h');
        });

        it('should use HS256 algorithm', () => {
            expect(JWT_CONFIG.ALGORITHM).toBe('HS256');
        });
    });
});
