/**
 * HINCH MART — Live Firebase Authentication & Backend Synchronization Service
 * Handles:
 * 1. Email/Password Authentication (Firebase Client SDK)
 * 2. Phone SMS OTP Authentication (Firebase Client SDK / Web Recaptcha / Native)
 * 3. Backend User Synchronization (POST https://api.hinchmart.com/api/auth/sync)
 * 4. User Profile Retrieval (GET https://api.hinchmart.com/api/auth/me)
 */
import {
  auth,
  firebaseConfig,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setActiveConfirmationResult,
  getActiveConfirmationResult,
  updateProfile,
} from '../../config/firebase';
import axios from 'axios';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser,
} from 'firebase/auth';
import { authApi } from './auth.api';
import { userApi } from './user.api';
import { customersApi } from './customers.api';
import { authStore } from '../../store/authStore';
import { AuthSyncUser, SyncUserRequest, User } from '../../types/auth.types';
import { Platform } from 'react-native';

export interface FirebaseSyncResult {
  firebaseUser: FirebaseUser;
  idToken: string;
  syncUser: AuthSyncUser;
}

/**
 * Detect generic default placeholder names (e.g. backend fallback "Customer User" or "HinchMart Member")
 */
export function isGenericName(n?: string | null): boolean {
  if (!n) return true;
  const t = n.trim().toLowerCase();
  return (
    t === '' ||
    t === 'customer user' ||
    t === 'hinchmart member' ||
    t === 'user' ||
    t === 'member' ||
    t === 'customer'
  );
}

/**
 * Shared backend synchronization core for Firebase users
 * Adheres to Backend Team Contract:
 * 1. POST /api/auth/sync (Bearer <idToken>)
 *    - Case A: Phone-Only Login (OTP) -> body: {}
 *    - Case C: Returning User Login -> body: {}
 *    - Case B: Full Real Values (Google / Form) -> body: { name, email, phone, role: 'BUYER' }
 * 2. Step 6 Inspection:
 *    - If "name" is null or "email" is null: profileComplete = false (prompts CompleteProfile)
 *    - If all details exist: profileComplete = true
 */
async function syncUserWithBackendCore(params: {
  idToken: string;
  refreshToken: string;
  uid: string;
  phoneNumber?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  firebaseUser?: FirebaseUser;
  meta?: {
    name?: string;
    phone?: string;
    email?: string;
    role?: 'BUYER' | 'CUSTOMER' | 'SELLER' | 'ADMIN';
    companyName?: string;
    businessType?: string;
    gstNumber?: string;
    panNumber?: string;
  };
}): Promise<FirebaseSyncResult> {
  const { idToken, refreshToken, uid, phoneNumber, displayName, photoURL, firebaseUser, meta } = params;

  const cleanPhone =
    meta?.phone ||
    phoneNumber ||
    (firebaseUser?.phoneNumber) ||
    '';

  // Resolve real values ONLY if provided by user/OAuth (no synthetic fallbacks like 'HinchMart Member')
  const realName =
    meta?.name && !isGenericName(meta.name)
      ? meta.name.trim()
      : (!isGenericName(displayName) ? displayName?.trim() : null);

  const enteredEmail =
    meta?.email &&
    !meta.email.includes('@firebase.user') &&
    !meta.email.includes('@hinchmart.com')
      ? meta.email.trim().toLowerCase()
      : null;

  const fbEmail =
    firebaseUser?.email &&
    !firebaseUser.email.includes('@firebase.user') &&
    !firebaseUser.email.includes('@hinchmart.com')
      ? firebaseUser.email.trim().toLowerCase()
      : null;

  const realEmail = enteredEmail || fbEmail || null;

  // Construct request body according to backend specification:
  // POST /api/auth/sync
  // Schema: { firebaseIdToken: string, name?: string, phone?: string, email?: string, role?: string }
  const syncBody: SyncUserRequest = {
    firebaseIdToken: idToken,
  };
  if (realName) syncBody.name = realName;
  if (realEmail) syncBody.email = realEmail;
  if (cleanPhone) syncBody.phone = cleanPhone;
  syncBody.role = meta?.role || 'CUSTOMER';

  // If real name is available, update Firebase displayName for future token claims
  if (realName && firebaseUser) {
    try {
      await updateProfile(firebaseUser, { displayName: realName });
    } catch {}
  }

  // Call POST /api/auth/sync (Public token exchange)
  let syncUser: AuthSyncUser;
  try {
    syncUser = await authApi.syncUser(syncBody, idToken);
  } catch (syncErr: any) {
    console.warn('[Firebase Auth] syncUser backend notice:', syncErr?.message || syncErr);
    syncUser = {
      userId: 0,
      firebaseUid: uid,
      email: realEmail || null,
      name: realName || null,
      phone: cleanPhone,
      role: 'CUSTOMER',
      sellerId: null,
      profileComplete: Boolean(realName),
      isProfileComplete: Boolean(realName),
      active: true,
    };
  }

  // Step 6: Frontend inspects the response:
  // - If "name" is null: show Profile Completion screen. Email is optional.
  // - If all required details exist: navigate to Home/Dashboard.
  const backendName = syncUser?.name && !isGenericName(syncUser.name) ? syncUser.name.trim() : null;
  const backendEmail =
    syncUser?.email &&
    !syncUser.email.includes('@firebase.user') &&
    !syncUser.email.includes('@hinchmart.com')
      ? syncUser.email.trim().toLowerCase()
      : null;

  const finalName = realName || backendName || null;
  const finalEmail = realEmail || backendEmail || null;

  const isProfileComplete = Boolean(
    finalName &&
    syncUser?.profileComplete !== false &&
    (syncUser as any)?.isProfileComplete !== false
  );

  syncUser.name = finalName;
  syncUser.email = finalEmail;
  syncUser.role = (syncUser?.role as any) || 'CUSTOMER';
  syncUser.profileComplete = isProfileComplete;
  (syncUser as any).isProfileComplete = isProfileComplete;

  if (finalName && cleanPhone) {
    authStore.saveRegisteredUserName(cleanPhone, finalName);
  }
  if (cleanPhone) {
    authStore.markPhoneRegistered(cleanPhone);
  }

  // Extract the HinchMart HS256 JWT returned by the backend (accessToken)
  const backendJwt = syncUser.accessToken || idToken;

  // Map to frontend User model
  const fName = finalName ? finalName.split(' ')[0] : '';
  const lName = finalName ? finalName.split(' ').slice(1).join(' ') : '';
  const resolvedUserId = String(syncUser.customer?.customerId || syncUser.userId || uid);

  const mappedUser: User = {
    id: resolvedUserId,
    email: finalEmail || '',
    phone: syncUser.phone || cleanPhone,
    firstName: fName,
    lastName: lName,
    fullName: finalName || '',
    avatar: photoURL || null,
    accountType: 'individual',
    role: (syncUser.role as any) || 'CUSTOMER',
    isVerified: true,
    isPhoneVerified: Boolean(cleanPhone),
    isEmailVerified: Boolean(finalEmail),
    companyName: meta?.companyName || '',
    businessProfile: meta?.companyName
      ? {
          id: `biz_${resolvedUserId}`,
          companyName: meta.companyName,
          companyLogo: null,
          registrationNumber: meta.panNumber ? `PAN-${meta.panNumber}` : '',
          taxId: meta.gstNumber || '',
          industry: meta.businessType || 'Retail',
          website: '',
          description: `${meta.businessType || 'Retail'} Buyer`,
          employeeCount: '1-10',
          annualRevenue: '',
          foundedYear: new Date().getFullYear(),
          certifications: ['Verified Member'],
          isVerified: true,
        }
      : null,
    language: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Persist session to MMKV storage and sync with Redux store using the internal HinchMart JWT
  authStore.saveSession({
    user: mappedUser,
    accessToken: backendJwt,
    refreshToken: refreshToken || '',
  });

  return {
    firebaseUser: firebaseUser || ({
      uid,
      phoneNumber: cleanPhone,
      displayName: finalName,
      email: finalEmail,
      getIdToken: async () => idToken,
    } as any),
    idToken,
    syncUser,
  };
}

/**
 * Sync Firebase user with HinchMart MySQL Database via POST /api/auth/sync
 */
export async function syncFirebaseUserWithBackend(
  firebaseUser: FirebaseUser,
  meta?: {
    name?: string;
    phone?: string;
    email?: string;
    role?: 'BUYER' | 'CUSTOMER' | 'SELLER' | 'ADMIN';
    companyName?: string;
    businessType?: string;
    gstNumber?: string;
    panNumber?: string;
  }
): Promise<FirebaseSyncResult> {
  const idToken = await firebaseUser.getIdToken(true);
  return syncUserWithBackendCore({
    idToken,
    refreshToken: firebaseUser.refreshToken || '',
    uid: firebaseUser.uid,
    phoneNumber: firebaseUser.phoneNumber,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    firebaseUser,
    meta,
  });
}

/**
 * Sign In with Email & Password + Sync with Live Backend
 */
export async function loginWithEmailAndPassword(
  email: string,
  pass: string
): Promise<FirebaseSyncResult> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return await syncFirebaseUserWithBackend(cred.user, { email: email.trim() });
}

/**
 * Register with Email & Password + Sync with Live Backend
 */
export async function registerWithEmailAndPassword(
  email: string,
  pass: string,
  meta?: {
    name?: string;
    phone?: string;
    email?: string;
    role?: 'BUYER' | 'CUSTOMER' | 'SELLER' | 'ADMIN';
    companyName?: string;
    businessType?: string;
    gstNumber?: string;
    panNumber?: string;
  }
): Promise<FirebaseSyncResult> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  return await syncFirebaseUserWithBackend(cred.user, { ...meta, email: email.trim(), role: 'BUYER' });
}

/**
 * Send Phone OTP via Firebase
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  containerIdOrVerifier?: any
): Promise<ConfirmationResult> {
  let verifier = containerIdOrVerifier;

  if (!verifier && Platform.OS === 'web' && typeof window !== 'undefined') {
    const win = window as any;
    if (!win.recaptchaVerifier) {
      win.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
    verifier = win.recaptchaVerifier;
  }

  if (!verifier) {
    // If running on Native without explicit verifier, attempt default RecaptchaVerifier if supported
    try {
      verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    } catch (e: any) {
      console.warn('[Firebase Phone Auth] Native verifier notice:', e?.message || e);
    }
  }

  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  setActiveConfirmationResult(confirmation);
  return confirmation;
}

/**
 * Confirm Phone OTP via Firebase + Sync with Live Backend
 */
export async function verifyFirebasePhoneOtp(
  otpCode: string,
  meta?: {
    name?: string;
    phone?: string;
    email?: string;
    role?: 'BUYER' | 'CUSTOMER' | 'SELLER' | 'ADMIN';
    companyName?: string;
    businessType?: string;
    gstNumber?: string;
    panNumber?: string;
  }
): Promise<FirebaseSyncResult> {
  const confirmation = getActiveConfirmationResult();
  if (!confirmation) {
    throw new Error('No active phone authentication session. Please request a new OTP.');
  }

  const result = await confirmation.confirm(otpCode.trim());
  setActiveConfirmationResult(null);

  return await syncFirebaseUserWithBackend(result.user, meta);
}

/**
 * Confirm Phone OTP via Firebase REST API using verificationId (sessionInfo) and otpCode
 */
export async function verifyPhoneOtpWithSessionInfo(
  sessionInfo: string,
  otpCode: string,
  meta?: {
    name?: string;
    phone?: string;
    email?: string;
    role?: 'BUYER' | 'CUSTOMER' | 'SELLER' | 'ADMIN';
    companyName?: string;
    businessType?: string;
    gstNumber?: string;
    panNumber?: string;
  }
): Promise<FirebaseSyncResult> {
  const apiKey = firebaseConfig.apiKey;
  const res = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
    {
      sessionInfo,
      code: otpCode.trim(),
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const { idToken, refreshToken, localId, phoneNumber } = res.data;

  return syncUserWithBackendCore({
    idToken,
    refreshToken: refreshToken || '',
    uid: localId,
    phoneNumber,
    displayName: meta?.name,
    photoURL: null,
    meta,
  });
}

/**
 * Log Out from backend & Firebase, then clear local session
 */
export async function logoutUser(): Promise<void> {
  try {
    await authApi.logout();
  } catch (error) {
    console.warn('[Firebase] Sign out error:', error);
  }
  authStore.clearSession();
}

export { getActiveConfirmationResult, setActiveConfirmationResult };

