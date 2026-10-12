/**
 * HINCH MART — Centralized Axios API Client
 * Features: Auth interceptor, refresh token, retry, error handling, network detection
 */
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../../constants/api';
import { STORAGE_KEYS } from '../../constants/app';
import { mmkvStorage } from '../storage/mmkv';
import { ApiError, TokenPair } from '../../types/api.types';
import { auth } from '../../config/firebase';

import { authStore } from '../../store/authStore';

// Event emitter for global state changes
type AuthEventHandler = () => void;
let onSessionExpired: AuthEventHandler | null = null;
let onNetworkError: AuthEventHandler | null = null;

export function setAuthEventHandlers(handlers: {
  onSessionExpired?: AuthEventHandler;
  onNetworkError?: AuthEventHandler;
}) {
  onSessionExpired = handlers.onSessionExpired ?? null;
  onNetworkError = handlers.onNetworkError ?? null;
}

// Track refresh token state to prevent concurrent refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Create the main API client
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request interceptor — inject HinchMart JWT auth token
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth for explicitly public endpoints
    const isPublicAuthEndpoint =
      config.url?.includes('/api/auth/check-phone') ||
      config.url?.includes('/api/auth/sync') ||
      config.url?.includes('/api/auth/send-otp') ||
      config.url?.includes('/api/auth/verify-otp') ||
      config.url?.includes('/api/auth/login') ||
      config.url?.includes('/api/auth/register') ||
      (config.headers as any)?.skipAuth;

    if (isPublicAuthEndpoint) {
      if (config.headers) {
        delete (config.headers as any).skipAuth;
        delete config.headers.Authorization;
      }
      return config;
    }

    // Inject persisted HinchMart JWT (accessToken issued by backend)
    const token =
      authStore.getToken() ||
      mmkvStorage.getString(STORAGE_KEYS.ACCESS_TOKEN) ||
      mmkvStorage.getString('hinchmart_access_token');
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add language & currency headers
    const language = mmkvStorage.getString(STORAGE_KEYS.LANGUAGE) ?? 'en';
    const currency = mmkvStorage.getString(STORAGE_KEYS.CURRENCY) ?? 'INR';
    if (config.headers) {
      config.headers['Accept-Language'] = language;
      config.headers['X-Currency'] = currency;
    }

    // Auto-inject authenticated user's ID via X-User-Id header as required by CustomerBackend
    const user = authStore.getUser();
    const userId = user?.id || (user as any)?.userId || (user as any)?.customerId;
    if (userId && config.headers && !config.headers['X-User-Id']) {
      config.headers['X-User-Id'] = String(userId);
    }

    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Helper to unwrap standard backend envelope { success: true, data: ... }
 */
export function unwrapApiResponse<T = any>(response: any): T {
  if (!response) return response as T;
  const body = response?.data !== undefined ? response.data : response;
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

/**
 * Response interceptor — handle 401 (Phase 3 silent refresh) + 403 + network errors
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number });

    // Retry transient network errors for idempotent GET requests (up to 2 retries)
    if (
      originalRequest &&
      (!error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') &&
      originalRequest.method?.toLowerCase() === 'get'
    ) {
      const currentRetry = originalRequest._retryCount || 0;
      const MAX_RETRIES = 2;
      if (currentRetry < MAX_RETRIES) {
        originalRequest._retryCount = currentRetry + 1;
        const delayMs = currentRetry === 0 ? 600 : 1200;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return apiClient(originalRequest);
      }
    }

    // Network error
    if (!error.response) {
      onNetworkError?.();
      return Promise.reject({
        success: false,
        message: 'Network error. Please check your internet connection.',
        statusCode: 0,
      } as ApiError);
    }

    // HTTP 403 Forbidden: unauthorized role action - do NOT clear login credentials
    if (error.response.status === 403) {
      const forbiddenError: ApiError = {
        success: false,
        message: error.response?.data?.message ?? 'Access Denied: You do not have permission to access this resource.',
        statusCode: 403,
        status: 403,
        response: error.response,
        errors: error.response?.data?.errors,
      };
      return Promise.reject(forbiddenError);
    }

    // HTTP 401 Unauthorized — Phase 3: Silent Refresh Token Exchange Flow
    // Do not attempt refresh on auth sync or check-phone itself to prevent recursive loops
    const isSyncOrPublicRequest =
      originalRequest?.url?.includes('/api/auth/sync') ||
      originalRequest?.url?.includes('/api/auth/check-phone') ||
      originalRequest?.url?.includes('/api/auth/login');

    if (error.response.status === 401 && originalRequest && !originalRequest._retry && !isSyncOrPublicRequest) {
      // If user is not authenticated and has no token, reject immediately without attempting refresh or clearing session
      if (!authStore.isAuthenticated() && !authStore.getToken()) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request and wait for the refresh to complete
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: AxiosError) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let newAccessToken: string | null = null;

        // Step 1: Silently retrieve fresh Firebase ID token from identity provider session
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const freshFirebaseIdToken = await currentUser.getIdToken(true);
            if (freshFirebaseIdToken) {
              // Step 2: Call POST /api/auth/sync to exchange for fresh HinchMart accessToken
              const syncResponse = await axios.post(
                `${API_BASE_URL}/api/auth/sync`,
                { firebaseIdToken: freshFirebaseIdToken },
                {
                  headers: { 'Content-Type': 'application/json' },
                  timeout: 15000,
                }
              );

              const syncData = syncResponse.data?.data || syncResponse.data;
              const exchangedToken = syncData?.accessToken;
              if (typeof exchangedToken === 'string' && exchangedToken.length > 0) {
                newAccessToken = exchangedToken;
                mmkvStorage.setString(STORAGE_KEYS.ACCESS_TOKEN, exchangedToken);
                mmkvStorage.setString('hinchmart_access_token', exchangedToken);

                const currentStoredUser = authStore.getUser();
                if (currentStoredUser) {
                  authStore.saveSession({
                    user: currentStoredUser,
                    accessToken: exchangedToken,
                    refreshToken: authStore.getRefreshToken() || '',
                  });
                }
              }
            }
          }
        } catch (fbSyncErr) {
          console.warn('[API Client] Silent Firebase token refresh exchange notice:', fbSyncErr);
        }

        // Step 2b: Fallback to POST /api/auth/refresh-token if silent exchange didn't yield token
        if (!newAccessToken) {
          const storedToken = authStore.getToken() || mmkvStorage.getString(STORAGE_KEYS.ACCESS_TOKEN);
          const storedRefreshToken = authStore.getRefreshToken() || mmkvStorage.getString(STORAGE_KEYS.REFRESH_TOKEN);

          if (storedToken || storedRefreshToken) {
            try {
              const refreshResponse = await axios.post(
                `${API_BASE_URL}/api/auth/refresh-token`,
                { refreshToken: storedRefreshToken },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
                  },
                  timeout: 10000,
                }
              );
              const rData = refreshResponse.data?.data || refreshResponse.data;
              const refreshedToken = rData?.accessToken;
              if (typeof refreshedToken === 'string' && refreshedToken.length > 0) {
                newAccessToken = refreshedToken;
                mmkvStorage.setString(STORAGE_KEYS.ACCESS_TOKEN, refreshedToken);
                mmkvStorage.setString('hinchmart_access_token', refreshedToken);
              }
            } catch (rErr) {
              console.warn('[API Client] Session refresh-token endpoint fallback notice:', rErr);
            }
          }
        }

        if (!newAccessToken) {
          throw new Error('Unable to refresh HinchMart authentication token');
        }

        // Retry original request with new accessToken
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);

        // If silent refresh fails, purge the saved session and redirect to Login screen
        authStore.clearSession();
        onSessionExpired?.();

        return Promise.reject({
          success: false,
          message: 'Session expired. Please login again.',
          statusCode: 401,
        } as ApiError);
      } finally {
        isRefreshing = false;
      }
    }

    // Standard error response
    const apiError: ApiError = {
      success: false,
      message: error.response?.data?.message ?? 'Something went wrong',
      statusCode: error.response?.status ?? 500,
      status: error.response?.status,
      response: error.response,
      errors: error.response?.data?.errors,
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;

/**
 * Helper to upload files with FormData
 */
export function createFormData(files: Array<{ uri: string; name: string; type: string }>, data?: Record<string, string>): FormData {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  });

  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  return formData;
}
