/**
 * Jest Test Setup
 * @description Global mocks and test utilities
 */

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Mock Firebase Admin
jest.mock('../src/config/firebase', () => ({
    db: null,
    admin: {
        initializeApp: jest.fn(),
        credential: {
            cert: jest.fn()
        }
    }
}));

// Mock console.error for cleaner test output
const originalConsoleError = console.error;
beforeAll(() => {
    console.error = jest.fn();
});

afterAll(() => {
    console.error = originalConsoleError;
});

// Global test utilities
global.testUtils = {
    /**
     * Create a mock request object
     */
    mockRequest: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ...overrides
    }),

    /**
     * Create a mock response object
     */
    mockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.set = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        return res;
    },

    /**
     * Create a mock next function
     */
    mockNext: () => jest.fn(),

    /**
     * Generate a valid JWT token for testing
     */
    generateTestToken: (payload = {}) => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            { email: 'test@test.com', role: 'admin', ...payload },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    },

    /**
     * Generate an expired JWT token for testing
     */
    generateExpiredToken: (payload = {}) => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            { email: 'test@test.com', role: 'admin', ...payload },
            process.env.JWT_SECRET,
            { expiresIn: '-1h' }
        );
    }
};
