// Firebase Configuration and Initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBTHgrFAEKpG7olxxgqn8zUo-XpvD1Zaig",
    authDomain: "bar-inventory-15a15.firebaseapp.com",
    projectId: "bar-inventory-15a15",
    storageBucket: "bar-inventory-15a15.firebasestorage.app",
    messagingSenderId: "968201633006",
    appId: "1:968201633006:web:24fd1269373155ff27c7ff"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);