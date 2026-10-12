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
    'AIzaSyA5x2ucDW9LBMDvVY_g3dsQRkk2zgvBLWw',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'anushabazaar-2288e.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'anushabazaar-2288e',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'anushabazaar-2288e.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '64875938387',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    '1:64875938387:android:8093266dd582087bba7ca6',
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
