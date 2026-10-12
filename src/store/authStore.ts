/**
 * HINCH MART — Persistent Session Storage Manager
 * Uses mmkvStorage with AsyncStorage fallback + syncs with Redux store
 */
import { mmkvStorage } from '../services/storage/mmkv';
import { store } from '../redux/store';
import { setCredentials, logout as logoutAction } from '../redux/slices/authSlice';
import { User } from '../types/auth.types';

const STORAGE_KEYS = {
  USER_PROFILE: 'hinchmart_user_profile',
  ACCESS_TOKEN: 'hinchmart_access_token',
  REFRESH_TOKEN: 'hinchmart_refresh_token',
  IS_AUTHENTICATED: 'hinchmart_is_authenticated',
  ONBOARDING_COMPLETED: 'hinchmart_onboarding_completed',
};

export interface SessionData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authStore = {
  /**
   * Save session data to storage and sync with Redux store
   */
  saveSession: ({ user, accessToken, refreshToken }: SessionData): void => {
    try {
      mmkvStorage.setObject(STORAGE_KEYS.USER_PROFILE, user);
      mmkvStorage.setString(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      mmkvStorage.setString(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      mmkvStorage.setBoolean(STORAGE_KEYS.IS_AUTHENTICATED, true);

      // Sync with Redux
      store?.dispatch?.(
        setCredentials({
          user,
          tokens: { accessToken, refreshToken },
        })
      );
    } catch (error) {
      console.error('Failed to save authentication session:', error);
    }
  },

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated: (): boolean => {
    try {
      const reduxState = store?.getState?.();
      if (reduxState?.auth?.isAuthenticated && reduxState?.auth?.user) {
        return true;
      }

      const storedAuthFlag = mmkvStorage.getBoolean(STORAGE_KEYS.IS_AUTHENTICATED);
      const storedUser = mmkvStorage.getObject<User>(STORAGE_KEYS.USER_PROFILE);
      const storedToken = mmkvStorage.getString(STORAGE_KEYS.ACCESS_TOKEN);

      return Boolean(storedAuthFlag && storedUser && storedToken);
    } catch {
      return false;
    }
  },

  /**
   * Get stored user profile
   */
  getUser: (): User | null => {
    try {
      const reduxUser = store?.getState?.()?.auth?.user;
      if (reduxUser) return reduxUser;

      return mmkvStorage.getObject<User>(STORAGE_KEYS.USER_PROFILE) || null;
    } catch {
      return null;
    }
  },

  /**
   * Get current access token
   */
  getToken: (): string | null => {
    try {
      const reduxToken = store?.getState?.()?.auth?.accessToken;
      if (reduxToken) return reduxToken;

      return mmkvStorage.getString(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  /**
   * Get current refresh token
   */
  getRefreshToken: (): string | null => {
    try {
      const reduxRefreshToken = store?.getState?.()?.auth?.refreshToken;
      if (reduxRefreshToken) return reduxRefreshToken;

      return mmkvStorage.getString(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  /**
   * Check onboarding status
   */
  hasCompletedOnboarding: (): boolean => {
    try {
      const reduxFlag = store?.getState?.()?.auth?.hasCompletedOnboarding;
      if (reduxFlag) return true;

      return mmkvStorage.getBoolean(STORAGE_KEYS.ONBOARDING_COMPLETED) ?? false;
    } catch {
      return false;
    }
  },

  /**
   * Set onboarding completed flag
   */
  setOnboardingCompleted: (completed = true): void => {
    try {
      mmkvStorage.setBoolean(STORAGE_KEYS.ONBOARDING_COMPLETED, completed);
    } catch {}
  },

  /**
   * Clear session and logout user
   */
  logout: async (): Promise<void> => {
    try {
      // Best-effort notify backend endpoint POST /api/auth/logout
      try {
        const { authApi } = require('../services/api/auth.api');
        authApi?.logoutBackendOnly?.().catch(() => {});
      } catch {}

      mmkvStorage.remove(STORAGE_KEYS.USER_PROFILE);
      mmkvStorage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      mmkvStorage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      mmkvStorage.setBoolean(STORAGE_KEYS.IS_AUTHENTICATED, false);
      mmkvStorage.remove('hinchmart_cart');
      mmkvStorage.remove('hinchmart_saved_checkout_draft');

      // Cancel pending cart debounces & invalidate in-flight network requests
      try {
        const { cartManager } = require('../services/cart/cartManager');
        cartManager?.cancelPendingOperations?.();
      } catch {}

      // Clear query client memory cache
      try {
        const { queryClient } = require('../services/api/queryClient');
        queryClient?.clear?.();
      } catch {}

      // Dispatch Redux cart clear first, then auth logout
      try {
        const { clearCart } = require('../redux/slices/cartSlice');
        store.dispatch(clearCart());
      } catch {}

      store.dispatch(logoutAction());
    } catch (error) {
      console.error('Error during logout session clearance:', error);
    }
  },

  /**
   * Alias for logout to clear session
   */
  clearSession: (): void => {
    try {
      mmkvStorage.remove(STORAGE_KEYS.USER_PROFILE);
      mmkvStorage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      mmkvStorage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      mmkvStorage.setBoolean(STORAGE_KEYS.IS_AUTHENTICATED, false);
      mmkvStorage.remove('hinchmart_cart');
      mmkvStorage.remove('hinchmart_saved_checkout_draft');

      try {
        const { cartManager } = require('../services/cart/cartManager');
        cartManager?.cancelPendingOperations?.();
      } catch {}

      try {
        const { queryClient } = require('../services/api/queryClient');
        queryClient?.clear?.();
      } catch {}

      try {
        const { clearCart } = require('../redux/slices/cartSlice');
        store.dispatch(clearCart());
      } catch {}

      store.dispatch(logoutAction());
    } catch (error) {
      console.error('Error during clearSession:', error);
    }
  },

  /**
   * Check if a phone number is registered in the database/app
   */
  isPhoneRegistered: (phone: string): boolean => {
    try {
      const clean = phone.replace(/[^0-9]/g, '');
      const full = phone.startsWith('+') ? phone : `+91${clean}`;
      if (clean === '9876543210' || full === '+919876543210') return true;

      const list = mmkvStorage.getObject<string[]>('hinchmart_registered_numbers') || [];
      return list.includes(clean) || list.includes(full);
    } catch {
      return false;
    }
  },

  /**
   * Mark a phone number as registered in the database/app
   */
  markPhoneRegistered: (phone: string): void => {
    try {
      const clean = phone.replace(/[^0-9]/g, '');
      const full = phone.startsWith('+') ? phone : `+91${clean}`;
      const list = mmkvStorage.getObject<string[]>('hinchmart_registered_numbers') || [];
      const updated = Array.from(new Set([...list, clean, full]));
      mmkvStorage.setObject('hinchmart_registered_numbers', updated);
    } catch (e) {
      console.error('Failed to mark phone as registered:', e);
    }
  },

  /**
   * Save a user's registered name linked to their phone number
   */
  saveRegisteredUserName: (phone: string, name: string): void => {
    try {
      if (!name || name === 'Customer User' || name === 'HinchMart Member' || name === 'User') return;
      const clean = phone.replace(/[^0-9]/g, '');
      const full = phone.startsWith('+') ? phone : `+91${clean}`;
      const map = mmkvStorage.getObject<Record<string, string>>('hinchmart_registered_names') || {};
      map[clean] = name.trim();
      map[full] = name.trim();
      mmkvStorage.setObject('hinchmart_registered_names', map);
    } catch (e) {
      console.error('Failed to save registered user name:', e);
    }
  },

  /**
   * Retrieve a user's registered name by phone number
   */
  getRegisteredUserName: (phone: string): string | null => {
    try {
      if (!phone) return null;
      const clean = phone.replace(/[^0-9]/g, '');
      const full = phone.startsWith('+') ? phone : `+91${clean}`;
      const map = mmkvStorage.getObject<Record<string, string>>('hinchmart_registered_names') || {};
      return map[clean] || map[full] || null;
    } catch {
      return null;
    }
  },
};
