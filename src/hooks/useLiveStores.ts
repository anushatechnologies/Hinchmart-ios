/**
 * HINCH MART — Live Stores Hook
 * Fetches, caches, and manages live marketplace stores and branches from:
 * - GET https://api.hinchmart.com/api/stores
 * 100% Dynamic — Zero mock data.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { storesApi } from '../services/api/stores.api';
import { StoreResponse } from '../types/backend.types';

let globalStoresCache: StoreResponse[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 60 seconds

export function useLiveStores() {
  const [stores, setStores] = useState<StoreResponse[]>(() => globalStoresCache || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !globalStoresCache);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveStores = useCallback(async (isRefresh = false) => {
    const now = Date.now();
    if (!isRefresh && globalStoresCache && now - lastFetchTime < CACHE_TTL_MS) {
      setStores(globalStoresCache);
      setIsLoading(false);
      return;
    }

    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!globalStoresCache) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const rawStores = await storesApi.getStores();
      // Filter for active stores based on real backend status field
      const activeStores = Array.isArray(rawStores)
        ? rawStores.filter((s) => s && s.status === 'ACTIVE')
        : [];

      globalStoresCache = activeStores;
      lastFetchTime = Date.now();
      setStores(activeStores);
    } catch (err: any) {
      const errMsg = err?.message || 'Unable to load Hinch Stores';
      if (__DEV__) {
        console.log('[useLiveStores] Fetch error:', errMsg);
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStores();
  }, [fetchLiveStores]);

  const refetch = useCallback(() => {
    return fetchLiveStores(true);
  }, [fetchLiveStores]);

  return {
    stores,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
