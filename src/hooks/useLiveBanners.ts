/**
 * HINCH MART — Live Banners Hook
 * Seamlessly fetches, caches, and enriches live banner promotions from backend
 * with guaranteed resilient fallback data and high-definition images.
 */
import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { bannersApi, normalizeBannerImageUrl } from '../services/api/banners.api';
import { ApiBanner, BannerPosition } from '../types/banner.types';

export const DEFAULT_HERO_BANNERS: ApiBanner[] = [];

export function resolveBannerImage(bannerObjOrTitle: any, imageUrl?: string): string {
  if (typeof bannerObjOrTitle === 'object' && bannerObjOrTitle !== null) {
    const rawUrl =
      bannerObjOrTitle.imageUrl ||
      bannerObjOrTitle.image ||
      bannerObjOrTitle.bannerUrl ||
      bannerObjOrTitle.bannerImage ||
      bannerObjOrTitle.fileUrl ||
      bannerObjOrTitle.mediaUrl ||
      bannerObjOrTitle.url ||
      bannerObjOrTitle.photo ||
      bannerObjOrTitle.image_url ||
      '';
    const normalized = normalizeBannerImageUrl(rawUrl);
    if (normalized) return normalized;
  }
  if (imageUrl && typeof imageUrl === 'string') {
    const normalized = normalizeBannerImageUrl(imageUrl);
    if (normalized) return normalized;
  }
  return '';
}

const GRADIENTS_PALETTE: ReadonlyArray<readonly [string, string, ...string[]]> = [
  ['#152238', '#1F3456', '#2A4774'],
  ['#0F172A', '#1E293B', '#3B82F6'],
  ['#78350F', '#9A3412', '#C2410C'],
  ['#1E1B4B', '#312E81', '#4338CA'],
  ['#14532D', '#166534', '#15803D'],
  ['#4C1D95', '#6D28D9', '#7C3AED'],
];

import { invalidatePromotionalVideoCache } from './useLivePromotionalVideo';

let globalBannersCache: Record<string, ApiBanner[]> = {};
const listeners: Array<() => void> = [];

export function invalidateBannerCache(position?: string) {
  if (position) {
    delete globalBannersCache[position];
  } else {
    globalBannersCache = {};
  }
  listeners.forEach((fn) => fn());
  invalidatePromotionalVideoCache();
}

/**
 * Helper to handle navigation on banner tap
 */
export function handleBannerPress(banner: ApiBanner, navigation: any) {
  if (!banner) return;
  const linkType = (banner.linkType || '').toUpperCase();
  const linkValue = banner.linkValue || '';

  if (linkType === 'CATEGORY' || linkType === 'CAT') {
    navigation.navigate('MainTabs', {
      screen: 'CategoriesTab',
      params: { categoryId: linkValue || 'all', categoryName: banner.title, navKey: Date.now() },
    });
  } else if (linkType === 'PRODUCT') {
    if (linkValue) {
      navigation.navigate('ProductDetail', { productId: linkValue });
    } else {
      navigation.navigate('ProductList', { title: banner.title });
    }
  } else if (linkType === 'URL' || linkType === 'EXTERNAL') {
    if (linkValue && (linkValue.startsWith('http://') || linkValue.startsWith('https://'))) {
      Linking.openURL(linkValue).catch((err) => console.warn('Could not open banner URL:', err));
    }
  } else if (linkType === 'SCREEN') {
    if (linkValue) {
      navigation.navigate(linkValue, banner.actionParams);
    }
  } else {
    // Default fallback to ProductList with banner title
    navigation.navigate('ProductList', { title: banner.title, categoryId: linkValue || undefined });
  }
}

export function useLiveBanners(position?: BannerPosition, activeOnly = true) {
  const cacheKey = `${position || 'ALL'}_${activeOnly ? 'ACTIVE' : 'ALL'}`;
  const [banners, setBanners] = useState<ApiBanner[]>(() => globalBannersCache[cacheKey] || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !globalBannersCache[cacheKey]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveBanners = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!globalBannersCache[cacheKey]) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const rawBanners = await bannersApi.getBanners({
        active: activeOnly ? true : undefined,
        position: position || undefined,
      }).catch((err) => {
        if (__DEV__) {
          console.log('[Banners API] Fetch notice:', err?.message || err);
        }
        return [];
      });

      const effectiveBanners: any[] = Array.isArray(rawBanners) ? rawBanners : [];

      const enriched: ApiBanner[] = effectiveBanners.map((b, idx) => {
        const rawImg =
          b.imageUrl ||
          b.image ||
          b.bannerUrl ||
          b.bannerImage ||
          b.fileUrl ||
          b.mediaUrl ||
          b.url ||
          b.photo ||
          b.image_url ||
          '';
        const resolvedImg = normalizeBannerImageUrl(rawImg);

        const gradient = b.gradient || GRADIENTS_PALETTE[idx % GRADIENTS_PALETTE.length];

        // Determine route target based on linkType
        let screen = 'ProductList';
        let actionParams: Record<string, any> = {};

        if (b.linkType === 'CATEGORY') {
          screen = 'ProductList';
          actionParams = { categoryId: b.linkValue, categoryName: b.title };
        } else if (b.linkType === 'PRODUCT') {
          screen = 'ProductDetail';
          actionParams = { productId: b.linkValue };
        } else if (b.linkType === 'RENTAL') {
          screen = 'RentalList';
        } else if (b.linkType === 'SCREEN') {
          screen = b.linkValue;
        }

        return {
          ...b,
          id: String(b.bannerId || b.id || `banner_${idx + 1}`),
          bannerId: b.bannerId || b.id || idx + 1,
          title: b.title || 'Special Promotion',
          image: resolvedImg,
          imageUrl: resolvedImg,
          subtitle: b.subtitle || '',
          badge: b.badge || '',
          gradient,
          screen,
          actionParams,
          active: b.active !== false && b.isActive !== false,
          isActive: b.active !== false && b.isActive !== false,
        };
      });

      globalBannersCache[cacheKey] = enriched;
      setBanners(enriched);
    } catch (err: any) {
      if (__DEV__) {
        console.log('[useLiveBanners] Fallback notice:', err?.message || err);
      }
      setError(err?.message || 'Failed to load banners');
      setBanners(globalBannersCache[cacheKey] || []);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [cacheKey, position, activeOnly]);

  useEffect(() => {
    fetchLiveBanners();
  }, [fetchLiveBanners]);

  // Subscribe to cache invalidations
  useEffect(() => {
    const onInvalidate = () => {
      fetchLiveBanners(true);
    };
    listeners.push(onInvalidate);
    return () => {
      const idx = listeners.indexOf(onInvalidate);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [fetchLiveBanners]);

  const refetch = useCallback(() => {
    return fetchLiveBanners(true);
  }, [fetchLiveBanners]);

  return {
    banners,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
