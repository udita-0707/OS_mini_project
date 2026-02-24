// ============================================================
// db.js — Firebase initialization & exports
// ============================================================
// This module initializes the Firebase client and exports
// the standalone helpers so every component can import
// from one place.
// ============================================================

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, remove, onValue } from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    databaseURL: process.env.FIREBASE_DATABASE_URL || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
};

const requiredFields = [
    'apiKey',
    'authDomain',
    'databaseURL',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
];

const missingFields = requiredFields.filter((field) => !firebaseConfig[field]);

if (missingFields.length) {
    throw new Error(`Missing Firebase configuration fields: ${missingFields.join(', ')}`);
}

// Initialize the Firebase app
const app = initializeApp(firebaseConfig);

// Get a reference to the Realtime Database service
const db = getDatabase(app);

// Helper wrapper functions
export const dbRef = (path) => ref(db, path);
export const pushData = (path, data) => push(dbRef(path), data);
export const setData = (path, data) => set(dbRef(path), data);
export const deleteData = (path) => remove(dbRef(path));
export const onData = (path, callback) => {
    const unsubscribe = onValue(dbRef(path), (snapshot) => callback(snapshot.val()));
    return unsubscribe;
};
