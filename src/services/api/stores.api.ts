/**
 * HINCH MART — Stores API Service (Stage 2: Browse Stores)
 * Base URL: https://api.hinchmart.com/api/stores
 * Endpoints:
 * - GET /api/stores — Browse all active seller stores
 * - GET /api/stores/{slugOrId} — Get store landing page
 * - GET /api/stores/{slugOrId}/categories — Get categories available in a store
 * - GET /api/stores/{slugOrId}/products — Browse products in a specific store
 */
import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { StoreResponse } from '../../types/backend.types';
import { ApiProduct } from '../../types/product.types';
import { extractProductsArray, normalizeApiProduct } from './products.api';

export const storesApi = {
  /**
   * GET /api/stores — Browse all active seller stores
   */
  getStores: async (params?: {
    search?: string;
    name?: string;
    page?: number;
    limit?: number;
  }): Promise<StoreResponse[]> => {
    const response = await apiClient.get(API_ENDPOINTS.STORES.LIST, { params });
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  },

  /**
   * GET /api/stores/{slugOrId} — Get store details by numeric ID or slug
   */
  getStoreDetail: async (slugOrId: string | number): Promise<StoreResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.STORES.DETAIL(slugOrId));
    return unwrapApiResponse<StoreResponse>(response);
  },

  /**
   * GET /api/stores/{slugOrId}/categories — Get categories available in a store
   */
  getStoreCategories: async (slugOrId: string | number): Promise<any[]> => {
    const response = await apiClient.get(API_ENDPOINTS.STORES.CATEGORIES(slugOrId));
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.categories && Array.isArray(data.categories)) return data.categories;
    return [];
  },

  /**
   * GET /api/stores/{slugOrId}/products — Browse products in a specific store
   */
  getStoreProducts: async (
    slugOrId: string | number,
    params?: {
      search?: string;
      categoryId?: string | number;
      subcategoryId?: string | number;
      page?: number;
      limit?: number;
      sortBy?: string;
    }
  ): Promise<ApiProduct[]> => {
    const response = await apiClient.get(API_ENDPOINTS.STORES.PRODUCTS(slugOrId), { params });
    const rawList = extractProductsArray(response.data);
    return rawList.map((p, idx) => normalizeApiProduct(p, idx));
  },
};
