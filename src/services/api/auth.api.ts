/**
 * HINCH MART — Live Buyer Authentication & OTP API Service
 * Connects directly to live backend endpoints:
 * 1. POST /auth/send-otp
 * 2. POST /auth/verify-otp
 * 3. POST /auth/login
 * 4. POST /auth/signup
 * 5. POST /auth/logout
 * 6. POST /auth/refresh-token
 */
import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { ApiResponse, TokenPair } from '../../types/api.types';
import { authStore } from '../../store/authStore';
import {
  User,
  LoginRequest,
  SignupRequest,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SyncUserRequest,
  AuthSyncUser,
  CheckPhoneResponse,
  CheckPhoneData,
} from '../../types/auth.types';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from '../../config/firebase';

export const authApi = {
  /**
   * STEP 1: Send OTP to Email or 10-digit Phone
   * Endpoint: POST /auth/send-otp
   */
  sendOtp: async (data: SendOtpRequest): Promise<SendOtpResponse> => {
    const response = await apiClient.post<SendOtpResponse>(
      API_ENDPOINTS.AUTH.SEND_OTP,
      {
        identifier: data.identifier.trim(),
        purpose: data.purpose || 'LOGIN',
      }
    );
    return response.data;
  },

  /**
   * STEP 2: Verify OTP & Issue Buyer JWT Session Tokens
   * Endpoint: POST /auth/verify-otp
   */
  verifyOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    const response = await apiClient.post<VerifyOtpResponse>(
      API_ENDPOINTS.AUTH.VERIFY_OTP,
      {
        identifier: data.identifier.trim(),
        otpCode: data.otpCode.trim(),
        purpose: data.purpose || 'LOGIN',
      }
    );
    return response.data;
  },

  /**
   * Firebase Direct Email/Password Sign-In
   */
  signInWithFirebase: async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const idToken = await cred.user.getIdToken();
    return { user: cred.user, idToken };
  },

  /**
   * Firebase Direct Email/Password Sign-Up
   */
  signUpWithFirebase: async (email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const idToken = await cred.user.getIdToken();
    return { user: cred.user, idToken };
  },

  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<{ user: User; tokens: TokenPair }>>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    ),

  signup: (data: SignupRequest) =>
    apiClient.post<ApiResponse<{ user: User; tokens: TokenPair }>>(
      API_ENDPOINTS.AUTH.SIGNUP,
      data
    ),

  logout: async () => {
    try {
      await apiClient.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {}
    try {
      await signOut(auth);
    } catch {}
    return { success: true, message: 'Logged out successfully' };
  },

  logoutBackendOnly: async () => {
    try {
      await apiClient.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {}
  },

  resendOTP: (data: { email?: string; phone?: string; type: string }) =>
    apiClient.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.RESEND_OTP, data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.RESET_PASSWORD, data),

  /**
   * Endpoint 4: Session Refresh / Token Re-evaluation
   * Method: POST /api/auth/refresh-token
   * Access: Authenticated (or supply token in header/body)
   * Headers: Authorization: Bearer <accessToken>
   */
  refreshToken: async (tokenOrRefresh?: string): Promise<any> => {
    const body: Record<string, any> = {};
    if (tokenOrRefresh) {
      body.refreshToken = tokenOrRefresh;
    }
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, body);
    return unwrapApiResponse<any>(response);
  },

  /**
   * Endpoint 2: Login & Token Exchange (User Sync)
   * Primary login endpoint. Exchanges the Firebase ID Token for the internal HinchMart JWT (accessToken)
   * and provisions/syncs the customer record in MySQL.
   * Method: POST /api/auth/sync
   * Access: Public
   * Payload: { firebaseIdToken: string, name?: string, phone?: string, email?: string, role?: string }
   */
  syncUser: async (data?: SyncUserRequest, customFirebaseToken?: string): Promise<AuthSyncUser> => {
    const payload: SyncUserRequest = {
      ...(data || {}),
      firebaseIdToken: data?.firebaseIdToken || customFirebaseToken,
    };
    const response = await apiClient.post(API_ENDPOINTS.AUTH.SYNC, payload, {
      headers: {
        skipAuth: 'true',
      },
    });
    return unwrapApiResponse<AuthSyncUser>(response);
  },

  /**
   * Endpoint 3: Current Authenticated User Profile
   * Fetch current user session details and permissions.
   * Method: GET /api/auth/me
   * Access: Authenticated (Authorization: Bearer <accessToken>)
   */
  getMe: async (customToken?: string): Promise<AuthSyncUser> => {
    const headers: Record<string, string> = {};
    if (customToken) {
      headers.Authorization = `Bearer ${customToken}`;
    }
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ME, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return unwrapApiResponse<AuthSyncUser>(response);
  },

  /**
   * Endpoint: Complete / Update Profile
   * Method: PUT /api/user/profile
   * Auth: Authorization: Bearer <accessToken>
   */
  updateAuthProfile: async (data: { name: string; email: string; phone?: string }, customToken?: string): Promise<any> => {
    const headers: Record<string, string> = {};
    if (customToken) {
      headers.Authorization = `Bearer ${customToken}`;
    }
    const response = await apiClient.put(API_ENDPOINTS.USER.PROFILE, data, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return unwrapApiResponse<any>(response);
  },

  /**
   * Endpoint 6: Claim Admin Role (Admin Portal Only)
   * Upgrade an authorized admin email to the ADMIN role in MySQL and Firebase Custom Claims.
   * Method: POST /api/auth/claim-admin
   * Access: Bearer token of an authorized admin user.
   */
  claimAdmin: async (): Promise<any> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.CLAIM_ADMIN);
    return unwrapApiResponse<any>(response);
  },

  /**
   * Endpoint 1: Pre-Login Phone Verification
   * Check if a user/seller profile already exists for the given phone number prior to sending an OTP.
   * Method: GET /api/auth/check-phone?phone={phoneNumber}
   * Access: Public (No auth headers required)
   */
  checkPhone: async (phone: string): Promise<CheckPhoneResponse> => {
    const formattedPhone = phone.trim();
    const response = await apiClient.get<CheckPhoneResponse>(
      API_ENDPOINTS.AUTH.CHECK_PHONE,
      {
        params: { phone: formattedPhone },
        headers: { skipAuth: 'true' },
        validateStatus: (status) => status < 500,
      }
    );
    return response.data;
  },

  /**
   * Check if a mobile number is registered in the database
   * Queries GET /api/auth/check-phone?phone={phoneNumber}
   * If live backend returns 404 (e.g. pending deployment), falls back gracefully
   * to the local persistent registry.
   */
  checkUserExists: async (phone: string): Promise<boolean> => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = phone.startsWith('+') ? phone : `+91${cleanPhone}`;

    try {
      // 1. Live backend check using exact GET /api/auth/check-phone?phone={phoneNumber}
      const res = await authApi.checkPhone(fullPhone);

      // Check specification response: res.data.exists
      if (res && res.success && res.data && typeof res.data.exists === 'boolean') {
        return res.data.exists;
      }
      if (res && typeof (res as any).exists === 'boolean') {
        return (res as any).exists;
      }
    } catch {
      // Endpoint error or network issue
    }

    // 2. Persistent registered numbers database fallback
    return authStore.isPhoneRegistered(fullPhone);
  },
};
