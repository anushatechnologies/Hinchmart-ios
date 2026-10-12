/**
 * HINCH MART — Auth Redux Slice
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState } from '../../types/auth.types';

const initialState: AuthState = {
  user: null,
  token: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  biometricEnabled: false,
  hasCompletedOnboarding: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<any | null>) => {
      if (!action.payload) {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        return;
      }
      const p = action.payload;
      const id = String(p.userId || p.id || state.user?.id || 'user-1');
      const name = p.name || p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || state.user?.fullName || 'User';
      state.user = {
        ...state.user,
        ...p,
        id,
        fullName: name,
        name,
        email: p.email || state.user?.email || '',
        phone: p.phone || state.user?.phone || '',
        role: p.role || state.user?.role || 'CUSTOMER',
      };
      state.isAuthenticated = true;
      state.error = null;
    },
    setToken: (
      state,
      action: PayloadAction<{ token: string; refreshToken: string } | { accessToken: string; refreshToken: string }>
    ) => {
      const tok = 'token' in action.payload ? action.payload.token : action.payload.accessToken;
      state.token = tok;
      state.accessToken = tok;
      state.refreshToken = action.payload.refreshToken;
    },
    setCredentials: (
      state,
      action: PayloadAction<
        | { user: User; tokens: { accessToken: string; refreshToken: string } }
        | { user: User; accessToken: string; refreshToken: string }
        | any
      >
    ) => {
      const p = action.payload || {};
      const tokens = p.tokens || {};
      const token = p.accessToken || p.token || tokens.accessToken || tokens.token || null;
      const refreshToken = p.refreshToken || tokens.refreshToken || null;
      state.user = p.user || null;
      state.token = token;
      state.accessToken = token;
      state.refreshToken = refreshToken;
      state.isAuthenticated = Boolean(p.user && token);
      state.hasCompletedOnboarding = true;
      state.isLoading = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      } else {
        state.user = {
          id: 'user-1',
          email: action.payload.email || '',
          phone: action.payload.phone || '',
          firstName: action.payload.firstName || '',
          lastName: action.payload.lastName || '',
          fullName: action.payload.fullName || '',
          avatar: null,
          accountType: 'business',
          isVerified: true,
          isPhoneVerified: true,
          isEmailVerified: true,
          language: 'en',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...action.payload,
        };
      }
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.token = action.payload.accessToken;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    setOnboardingComplete: (state) => {
      state.hasCompletedOnboarding = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
  },
});

export const {
  setUser,
  setToken,
  setCredentials,
  setError,
  updateUser,
  setTokens,
  setLoading,
  setBiometricEnabled,
  setOnboardingComplete,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
