import apiClient from './client';
import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import { ApiBrand, BrandCreateRequest, BrandUpdateRequest, BrandFilterQuery } from '../../types/brand.types';

export function normalizeBrandImageUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function extractBrandsArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.brands)) return payload.brands;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.brands)) return payload.data.brands;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.content)) return payload.data.content;
    if (Array.isArray(payload.data.result)) return payload.data.result;
    if (Array.isArray(payload.data.rows)) return payload.data.rows;
  }
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (payload.id || payload.brandId || payload.name || payload.title) {
    return [payload];
  }
  return [];
}

export function normalizeApiBrand(raw: any, index = 0): ApiBrand {
  const brandId = raw.brandId || raw.id || raw.brand_id || raw._id || index + 1;
  const rawImg =
    raw.imageUrl ||
    raw.image ||
    raw.logoUrl ||
    raw.logo ||
    raw.brandLogo ||
    raw.brandImageUrl ||
    raw.icon ||
    raw.iconUrl ||
    raw.thumbnailUrl ||
    raw.photo ||
    raw.fileUrl ||
    raw.mediaUrl ||
    raw.attachmentUrl ||
    raw.url ||
    '';
  const resolvedImg = normalizeBrandImageUrl(rawImg);

  const subId =
    raw.subcategoryId ??
    raw.subCategoryId ??
    raw.subcategory_id ??
    raw.subCategory?.id ??
    raw.subCategory?.subcategoryId ??
    raw.subcategory?.id ??
    raw.subcategory?.subcategoryId ??
    '';

  const catId =
    raw.categoryId ??
    raw.category_id ??
    raw.category?.id ??
    raw.category?.categoryId ??
    '';

  const subName =
    raw.subcategoryName ||
    raw.subCategoryName ||
    raw.subCategory?.name ||
    raw.subcategory?.name ||
    '';

  const catName =
    raw.categoryName ||
    raw.category?.name ||
    '';

  return {
    ...raw,
    id: String(brandId),
    brandId: String(brandId),
    name: raw.name || raw.brandName || raw.brand_name || raw.title || '',
    slug: raw.slug || (raw.name ? raw.name.toLowerCase().replace(/\s+/g, '-') : `brand_${brandId}`),
    imageUrl: resolvedImg,
    logoUrl: resolvedImg,
    subcategoryId: subId ? String(subId) : undefined,
    categoryId: catId ? String(catId) : undefined,
    subcategoryName: subName || undefined,
    categoryName: catName || undefined,
    active: raw.active !== false && raw.status !== 'INACTIVE',
    tagline: raw.tagline || raw.description || 'Verified direct manufacturer & OEM supplier',
    badge: raw.badge || 'OEM VERIFIED',
    productCount: typeof raw.productCount === 'number' ? raw.productCount : undefined,
  };
}

let brandsMemoryCache: { key: string; data: ApiBrand[]; timestamp: number } | null = null;
const BRANDS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export const brandsApi = {
  /**
   * GET /api/brands — Retrieve all brands from live backend
   */
  getBrands: async (subcategoryId?: string | number, categoryId?: string | number): Promise<ApiBrand[]> => {
    try {
      const cacheKey = `${subcategoryId ?? 'all'}_${categoryId ?? 'all'}`;
      if (
        brandsMemoryCache &&
        brandsMemoryCache.key === cacheKey &&
        Date.now() - brandsMemoryCache.timestamp < BRANDS_CACHE_TTL
      ) {
        return brandsMemoryCache.data;
      }

      const params: Record<string, any> = {};
      if (subcategoryId !== undefined && subcategoryId !== null && subcategoryId !== 'all') {
        params.subcategoryId = subcategoryId;
      }
      if (categoryId !== undefined && categoryId !== null && categoryId !== 'all') {
        params.categoryId = categoryId;
      }

      // 1. Direct fetch with params
      const response = await apiClient.get(API_ENDPOINTS.BRANDS.LIST, { params });
      let rawList = extractBrandsArray(response.data);

      // If filtered params returned empty, fallback to full list
      if (rawList.length === 0 && (params.subcategoryId || params.categoryId)) {
        const fullRes = await apiClient.get(API_ENDPOINTS.BRANDS.LIST);
        rawList = extractBrandsArray(fullRes.data);
      }

      const normalized = rawList.map((b, idx) => normalizeApiBrand(b, idx));

      let result = normalized;
      if (params.subcategoryId) {
        const targetSub = String(params.subcategoryId).toLowerCase();
        const filtered = normalized.filter(
          (b) => String(b.subcategoryId || '').toLowerCase() === targetSub
        );
        if (filtered.length > 0) result = filtered;
      } else if (params.categoryId) {
        const targetCat = String(params.categoryId).toLowerCase();
        const filtered = normalized.filter(
          (b) => String(b.categoryId || '').toLowerCase() === targetCat
        );
        if (filtered.length > 0) result = filtered;
      }

      brandsMemoryCache = {
        key: cacheKey,
        data: result,
        timestamp: Date.now(),
      };

      return result;
    } catch (err: any) {
      if (__DEV__) {
        console.log('[brandsApi] getBrands notice:', err?.message || err);
      }
      return brandsMemoryCache?.data || [];
    }
  },

  /**
   * GET /api/brands/{id} — Retrieve brand by ID
   */
  getBrandDetail: async (id: string | number): Promise<ApiBrand> => {
    const response = await apiClient.get<ApiBrand>(API_ENDPOINTS.BRANDS.DETAIL(id));
    const payload = response.data;
    const item = (payload as any)?.data || payload;
    return normalizeApiBrand(item);
  },

  /**
   * POST /api/brands — Create new brand
   */
  createBrand: async (data: BrandCreateRequest): Promise<ApiBrand> => {
    const response = await apiClient.post<ApiBrand>(API_ENDPOINTS.BRANDS.CREATE, data);
    const item = (response.data as any)?.data || response.data;
    return normalizeApiBrand(item);
  },

  /**
   * PUT /api/brands/{id} — Update brand
   */
  updateBrand: async (id: string | number, data: BrandUpdateRequest): Promise<ApiBrand> => {
    const response = await apiClient.put<ApiBrand>(API_ENDPOINTS.BRANDS.UPDATE(id), data);
    const item = (response.data as any)?.data || response.data;
    return normalizeApiBrand(item);
  },

  /**
   * DELETE /api/brands/{id} — Delete brand
   */
  deleteBrand: async (id: string | number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete(API_ENDPOINTS.BRANDS.DELETE(id));
    return response.data;
  },
};
