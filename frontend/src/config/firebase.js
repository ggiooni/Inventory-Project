/**
 * @file firebase.js
 * @description Firebase Configuration and Initialization
 * @author Nicolas Boggioni Troncoso
 * @course BSc Computer Science - Final Year Project
 * @institution Dorset College Dublin
 * @version 1.0.0
 * @date 2025
 *
 * This module initializes the Firebase SDK and exports the configured
 * instances for use throughout the application.
 *
 * @see {@link https://firebase.google.com/docs/web/setup}
 *
 * SECURITY NOTE:
 * Firebase API keys are safe to expose in client-side code.
 * Security is enforced through Firebase Security Rules on the server.
 * @see {@link https://firebase.google.com/docs/projects/api-keys}
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

/**
 * Firebase project configuration object
 * Contains all necessary credentials for connecting to Firebase services
 *
 * @constant {Object}
 * @property {string} apiKey - Public API key for Firebase project
 * @property {string} authDomain - Authentication domain
 * @property {string} projectId - Unique project identifier
 * @property {string} storageBucket - Cloud Storage bucket URL
 * @property {string} messagingSenderId - Cloud Messaging sender ID
 * @property {string} appId - Firebase application ID
 */
const firebaseConfig = {
    apiKey: "AIzaSyBTHgrFAEKpG7olxxgqn8zUo-XpvD1Zaig",
    authDomain: "bar-inventory-15a15.firebaseapp.com",
    projectId: "bar-inventory-15a15",
    storageBucket: "bar-inventory-15a15.firebasestorage.app",
    messagingSenderId: "968201633006",
    appId: "1:968201633006:web:24fd1269373155ff27c7ff"
};

/**
 * Initialize Firebase application instance
 * @type {FirebaseApp}
 */
export const app = initializeApp(firebaseConfig);

/**
 * Firestore database instance for real-time data operations
 * @type {Firestore}
 * @example
 * import { db } from './config/firebase.js';
 * const snapshot = await getDocs(collection(db, 'inventory'));
 */
export const db = getFirestore(app);

/**
 * Firebase Authentication instance for user management
 * @type {Auth}
 * @example
 * import { auth } from './config/firebase.js';
 * const user = await signInWithEmailAndPassword(auth, email, password);
 */
export const auth = getAuth(app);

// Log successful initialization in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔥 Firebase initialized in development mode');
    console.log(`📦 Project: ${firebaseConfig.projectId}`);
}
