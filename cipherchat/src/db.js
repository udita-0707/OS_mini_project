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

export const dbInitError = missingFields.length
    ? `Missing Firebase configuration fields: ${missingFields.join(', ')}`
    : null;

let db = null;
if (!dbInitError) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
}

const dbUnavailableError = () => new Error(dbInitError || 'Firebase is not initialized');

export const dbRef = (path) => {
    if (!db) return null;
    return ref(db, path);
};

export const pushData = (path, data) => {
    if (!db) return Promise.reject(dbUnavailableError());
    return push(ref(db, path), data);
};

export const setData = (path, data) => {
    if (!db) return Promise.reject(dbUnavailableError());
    return set(ref(db, path), data);
};

export const deleteData = (path) => {
    if (!db) return Promise.reject(dbUnavailableError());
    return remove(ref(db, path));
};

export const onData = (path, callback) => {
    if (!db) {
        callback(null);
        return () => {};
    }
    const unsubscribe = onValue(ref(db, path), (snapshot) => callback(snapshot.val()));
    return unsubscribe;
};
