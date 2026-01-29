/**
 * Vitest Test Setup
 * @description Global mocks and test utilities for frontend tests
 */

import { vi } from 'vitest';

// Mock Firebase modules
vi.mock('../src/config/firebase.js', () => ({
    db: null,
    auth: null
}));

// Mock Firebase Firestore
vi.mock('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js', () => ({
    collection: vi.fn(),
    getDocs: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    onSnapshot: vi.fn(),
    setDoc: vi.fn(),
    addDoc: vi.fn()
}));

// Mock Firebase Auth
vi.mock('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js', () => ({
    signInWithEmailAndPassword: vi.fn(),
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn()
}));

// Mock constants for testing
export const MOCK_CONSTANTS = {
    DEFAULT_PRIORITIES: {
        'Spirits': { priority: 'high', threshold: 2 },
        'Wines': { priority: 'medium', threshold: 3 },
        'Beers': { priority: 'medium', threshold: 6 },
        'Soft Drinks': { priority: 'low', threshold: 12 },
        'Syrups': { priority: 'medium', threshold: 2 }
    },
    STOCK_STATUS: {
        URGENT: 'urgent',
        NORMAL: 'normal',
        INFO: 'info',
        GOOD: 'good',
        OPTIMAL: 'optimal'
    },
    STATUS_ORDER: {
        urgent: 4,
        normal: 3,
        info: 2,
        good: 1,
        optimal: 0
    },
    MAX_VISIBLE_ALERTS: 6
};

// Test utility functions
export const testUtils = {
    /**
     * Create a mock product
     */
    createMockProduct: (overrides = {}) => ({
        id: 'test-id',
        name: 'Test Product',
        category: 'Spirits',
        stock: 5,
        priority: 'high',
        alertThreshold: 2,
        ...overrides
    }),

    /**
     * Create a mock user
     */
    createMockUser: (overrides = {}) => ({
        email: 'test@inventory.com',
        uid: 'test-uid',
        ...overrides
    })
};
