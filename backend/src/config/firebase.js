/**
 * @file firebase.js
 * @description Firebase Admin SDK Configuration
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables or service account
let db;

try {
    // Option 1: Use service account file (for production)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    }
    // Option 2: Use environment variables (for development)
    else if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            }),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    }
    // Option 3: Default initialization (uses GOOGLE_APPLICATION_CREDENTIALS env var)
    else {
        admin.initializeApp();
    }

    db = admin.firestore();
    console.log('✅ Firebase Admin initialized successfully');

} catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    console.log('⚠️  Running without Firebase - using mock data');
    db = null;
}

module.exports = { admin, db };
