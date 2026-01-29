/**
 * @file auth.js
 * @module modules/auth
 * @description Authentication Module - Handles user authentication and authorization
 * @author Nicolas Boggioni Troncoso
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 * @version 1.0.0
 * @date 2025
 *
 * This module implements the authentication layer using Firebase Authentication.
 * It provides login, logout, and session management functionality with
 * role-based access control (RBAC).
 *
 * @requires firebase/auth
 * @see {@link https://firebase.google.com/docs/auth}
 *
 * Design Pattern: Module Pattern with ES6 exports
 * Security: Firebase handles password hashing and session tokens
 */

import { auth } from '../config/firebase.js';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { USER_ROLES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants.js';

// =============================================
// MODULE STATE
// =============================================

/**
 * Authentication state object
 * @private
 * @type {Object}
 */
const authState = {
    currentUser: null,
    userRole: 'staff',
    isAuthenticated: false
};

/**
 * Callback functions registered by other modules
 * @private
 * @type {Object}
 */
const callbacks = {
    onLogin: [],
    onLogout: []
};

// =============================================
// PUBLIC API
// =============================================

/**
 * Get the current authenticated user
 * @returns {Object|null} Current user object or null if not authenticated
 */
export function getCurrentUser() {
    return authState.currentUser;
}

/**
 * Get the current user's role
 * @returns {string} User role ('admin', 'manager', or 'staff')
 */
export function getUserRole() {
    return authState.userRole;
}

/**
 * Check if a user is currently authenticated
 * @returns {boolean} True if user is authenticated
 */
export function isAuthenticated() {
    return authState.isAuthenticated;
}

/**
 * Check if current user can modify stock levels
 * All authenticated users have this permission
 * @returns {boolean} True if user can modify stock
 */
export function canModifyStock() {
    return authState.currentUser !== null;
}

/**
 * Check if current user can manage products (add/delete)
 * Requires manager or admin role
 * @returns {boolean} True if user can manage products
 */
export function canManageProducts() {
    return authState.userRole === 'admin' || authState.userRole === 'manager';
}

/**
 * Check if current user can manage priority settings
 * Requires admin role
 * @returns {boolean} True if user can manage priorities
 */
export function canManagePriorities() {
    return authState.userRole === 'admin';
}

/**
 * Register a callback for login events
 * @param {Function} callback - Function to call on login
 */
export function onLogin(callback) {
    if (typeof callback === 'function') {
        callbacks.onLogin.push(callback);
    }
}

/**
 * Register a callback for logout events
 * @param {Function} callback - Function to call on logout
 */
export function onLogout(callback) {
    if (typeof callback === 'function') {
        callbacks.onLogout.push(callback);
    }
}

/**
 * Attempt to log in with email and password
 *
 * @async
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Result object with success status and message
 *
 * @example
 * const result = await attemptLogin('admin@inventory.com', 'admin123.');
 * if (result.success) {
 *     console.log('Logged in as:', result.user.email);
 * }
 */
export async function attemptLogin(email, password) {
    // Input validation
    if (!email || !password) {
        return {
            success: false,
            error: 'Please enter both email and password'
        };
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return {
            success: true,
            user: userCredential.user
        };
    } catch (error) {
        console.error('Login error:', error);

        // Map Firebase error codes to user-friendly messages
        let errorMessage = ERROR_MESSAGES.AUTH.GENERIC;

        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                errorMessage = ERROR_MESSAGES.AUTH.USER_NOT_FOUND;
                break;
            case 'auth/invalid-email':
                errorMessage = ERROR_MESSAGES.AUTH.INVALID_EMAIL;
                break;
            case 'auth/too-many-requests':
                errorMessage = ERROR_MESSAGES.AUTH.TOO_MANY_REQUESTS;
                break;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Log out the current user
 *
 * @async
 * @returns {Promise<Object>} Result object with success status
 *
 * @example
 * const result = await logout();
 * if (result.success) {
 *     // Redirect to login page
 * }
 */
export async function logout() {
    try {
        await signOut(auth);
        return {
            success: true,
            message: SUCCESS_MESSAGES.LOGOUT
        };
    } catch (error) {
        console.error('Logout error:', error);
        return {
            success: false,
            error: 'Error signing out'
        };
    }
}

/**
 * Initialize the authentication listener
 * This should be called once when the application starts
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onAuthSuccess - Callback when user is authenticated
 * @param {Function} options.onAuthFailure - Callback when user is not authenticated
 */
export function initAuth({ onAuthSuccess, onAuthFailure }) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            authState.currentUser = user;
            authState.userRole = USER_ROLES[user.email] || 'staff';
            authState.isAuthenticated = true;

            // Extract username from email
            const userName = user.email.split('@')[0];
            const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

            // Notify registered callbacks
            callbacks.onLogin.forEach(cb => cb(user, authState.userRole));

            // Call success callback
            if (typeof onAuthSuccess === 'function') {
                onAuthSuccess({
                    user,
                    role: authState.userRole,
                    displayName
                });
            }
        } else {
            // User is signed out
            authState.currentUser = null;
            authState.userRole = 'staff';
            authState.isAuthenticated = false;

            // Notify registered callbacks
            callbacks.onLogout.forEach(cb => cb());

            // Call failure callback
            if (typeof onAuthFailure === 'function') {
                onAuthFailure();
            }
        }
    });
}

/**
 * Get user display information
 * @returns {Object} User display data
 */
export function getUserDisplayInfo() {
    if (!authState.currentUser) {
        return {
            name: 'Guest',
            initial: 'G',
            role: 'guest',
            email: null
        };
    }

    const userName = authState.currentUser.email.split('@')[0];
    return {
        name: userName.charAt(0).toUpperCase() + userName.slice(1),
        initial: userName.charAt(0).toUpperCase(),
        role: authState.userRole,
        email: authState.currentUser.email
    };
}
