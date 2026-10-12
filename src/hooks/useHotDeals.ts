/**
 * HINCH MART — Dedicated Hot Deals Hook
 * Fetches exclusively from the backend Hot Deals API (/api/home/hot-deals).
 * Manages caching, loading skeleton state, error handling, and pull-to-refresh.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  hotDealsApi,
  NormalizedHotDealProduct,
  globalHotDealsSectionTitle,
  globalHotDealsSectionIcon,
} from '../services/api/hotDeals.api';

let globalHotDealsCache: NormalizedHotDealProduct[] | null = null;
let globalHotDealsLastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 60s cache alignment with Home Screen

export function useHotDeals() {
  const [hotDeals, setHotDeals] = useState<NormalizedHotDealProduct[]>(() => globalHotDealsCache || []);
  const [sectionTitle, setSectionTitle] = useState<string>(() => globalHotDealsSectionTitle);
  const [sectionIcon, setSectionIcon] = useState<string | null>(() => globalHotDealsSectionIcon);
  const [isLoading, setIsLoading] = useState<boolean>(() => !globalHotDealsCache);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHotDeals = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!globalHotDealsCache) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const deals = await hotDealsApi.getHotDeals();
      globalHotDealsCache = deals;
      globalHotDealsLastFetchTime = Date.now();
      setHotDeals(deals);
      setSectionTitle(globalHotDealsSectionTitle);
      setSectionIcon(globalHotDealsSectionIcon);
    } catch (err: any) {
      if (__DEV__) {
        console.log('[useHotDeals] Fetch notice:', err?.message || err);
      }
      setError(err?.message || 'Unable to load Hot Deals');
      // STRICT REQUIREMENT: Do NOT fall back to All Products or mock data
      if (isRefresh || !globalHotDealsCache) {
        setHotDeals([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const isCacheStale = Date.now() - globalHotDealsLastFetchTime > CACHE_TTL_MS;
    if (!globalHotDealsCache || isCacheStale) {
      fetchHotDeals();
    }
  }, [fetchHotDeals]);

  const refetch = useCallback(async () => {
    return fetchHotDeals(true);
  }, [fetchHotDeals]);

  return {
    hotDeals,
    sectionTitle,
    sectionIcon,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
