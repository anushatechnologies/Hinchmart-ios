/**
 * HINCH MART — Firebase Client Configuration & Authentication Service
 * Connected to live production Firebase project (anushabazaar-2288e)
 * Backend verification: https://api.hinchmart.com/actuator/health
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  ConfirmationResult,
  updateProfile,
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyDR2hKXdih5wM60Vzv-e23hMzVJEDaMuZI',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'hinchmart-6d0ba.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'hinchmart-6d0ba',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'hinchmart-6d0ba.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '728291955959',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    '1:728291955959:ios:d99c9c5da29ce19f146ff2',
};

// Initialize Firebase App singleton
export const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const app = firebaseApp;

// Initialize Firebase Auth
export const auth = getAuth(firebaseApp);

/**
 * Global holder for active Phone Auth confirmation result
 */
let activeConfirmationResult: ConfirmationResult | null = null;

export function setActiveConfirmationResult(result: ConfirmationResult | null) {
  activeConfirmationResult = result;
}

export function getActiveConfirmationResult(): ConfirmationResult | null {
  return activeConfirmationResult;
}

/**
 * Get currently active Firebase ID Token (auto-refreshed by Firebase if expired)
 */
export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.warn('[Firebase] Failed to get ID token:', error);
    return null;
  }
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  updateProfile,
};
