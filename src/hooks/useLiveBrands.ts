/**
 * HINCH MART — Live Brands Hook (Tier 3)
 * High-speed brand fetching with instant in-memory caching and zero-blocking execution.
 * 100% Dynamic — Zero hardcoding.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { brandsApi } from '../services/api/brands.api';
import { ApiBrand } from '../types/brand.types';

export function resolveBrandImage(brandOrName?: any, rawUrl?: string): string {
  let url =
    typeof brandOrName === 'string'
      ? (rawUrl || (brandOrName.startsWith('http') || brandOrName.startsWith('/') || brandOrName.startsWith('data:') ? brandOrName : ''))
      : (rawUrl ||
        brandOrName?.imageUrl ||
        brandOrName?.logoUrl ||
        brandOrName?.image ||
        brandOrName?.logo ||
        brandOrName?.brandLogo ||
        brandOrName?.brandImageUrl ||
        brandOrName?.mediaUrl ||
        brandOrName?.fileUrl ||
        brandOrName?.attachmentUrl ||
        brandOrName?.url ||
        '');

  if (url && typeof url === 'string') {
    const trimmed = url.trim();
    if (
      trimmed.length > 0 &&
      !trimmed.includes('example.com') &&
      !trimmed.includes('placeholder')
    ) {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        return trimmed;
      }
      const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return `https://api.hinchmart.com${cleanPath}`;
    }
  }

  return '';
}

let globalBrandsCache: Record<string, ApiBrand[]> = {};
let globalAllBrandsList: ApiBrand[] | null = null;

function getInitialBrands(cacheKey: string, subcategoryId?: string | number, categoryId?: string | number): ApiBrand[] {
  if (globalBrandsCache[cacheKey]?.length) {
    return globalBrandsCache[cacheKey];
  }
  if (globalAllBrandsList?.length) {
    if (subcategoryId && subcategoryId !== 'all') {
      const targetSub = String(subcategoryId).toLowerCase();
      const filtered = globalAllBrandsList.filter(
        (b) => String(b.subcategoryId || '').toLowerCase() === targetSub
      );
      if (filtered.length > 0) return filtered;
    } else if (categoryId && categoryId !== 'all') {
      const targetCat = String(categoryId).toLowerCase();
      const filtered = globalAllBrandsList.filter(
        (b) => String(b.categoryId || '').toLowerCase() === targetCat
      );
      if (filtered.length > 0) return filtered;
    } else {
      return globalAllBrandsList;
    }
  }
  return [];
}

export function useLiveBrands(subcategoryId?: string | number, categoryId?: string | number) {
  const cacheKey = `${subcategoryId ?? 'all'}_${categoryId ?? 'all'}`;
  const initialBrands = getInitialBrands(cacheKey, subcategoryId, categoryId);

  const [brands, setBrands] = useState<ApiBrand[]>(initialBrands);
  const [isLoading, setIsLoading] = useState<boolean>(() => initialBrands.length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isFetchingRef = useRef(false);

  const fetchLiveBrands = useCallback(
    async (isRefresh = false) => {
      if (isFetchingRef.current && !isRefresh) return;
      isFetchingRef.current = true;

      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!globalBrandsCache[cacheKey]?.length && !globalAllBrandsList?.length) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const liveApiBrands = await brandsApi.getBrands(subcategoryId, categoryId);

        if (Array.isArray(liveApiBrands) && liveApiBrands.length > 0) {
          const processedList: ApiBrand[] = liveApiBrands.map((b, idx) => {
            const bImg = resolveBrandImage(b, b.imageUrl || b.logoUrl || (b as any).image || (b as any).logo);
            return {
              ...b,
              brandId: b.brandId ?? b.id ?? idx + 1,
              name: b.name || (b as any).brandName || '',
              imageUrl: bImg || b.imageUrl,
              productCount: b.productCount,
            };
          });

          globalBrandsCache[cacheKey] = processedList;
          if (!subcategoryId || subcategoryId === 'all') {
            globalAllBrandsList = processedList;
          }
          setBrands(processedList);
        } else if (globalBrandsCache[cacheKey]?.length) {
          setBrands(globalBrandsCache[cacheKey]);
        }
      } catch (err: any) {
        if (__DEV__) {
          console.log('[useLiveBrands] Notice:', err?.message || err);
        }
        setError(err?.message || 'Failed to load brands');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [cacheKey, subcategoryId, categoryId]
  );

  useEffect(() => {
    fetchLiveBrands();
  }, [fetchLiveBrands]);

  const refetch = useCallback(() => {
    return fetchLiveBrands(true);
  }, [fetchLiveBrands]);

  return {
    brands,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
