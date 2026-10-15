/**
 * Firebase Client Configuration for QuizArena
 * Supports Firebase Auth and Firestore on the web.
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'quiz-arena-default.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'quiz-arena-default',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'quiz-arena-default.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef'
};

export const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;
