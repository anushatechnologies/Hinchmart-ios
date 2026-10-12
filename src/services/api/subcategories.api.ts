/**
 * HINCH MART — Subcategories API Service (Controller 5)
 * Base URL: /api/subcategories
 * Endpoints:
 * - GET    /api/subcategories        — List subcategories (optional ?categoryId=)
 * - POST   /api/subcategories        — Create subcategory
 * - GET    /api/subcategories/{id}   — Get subcategory details
 * - PUT    /api/subcategories/{id}   — Update subcategory
 * - DELETE /api/subcategories/{id}   — Delete subcategory
 */
import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  ApiSubcategory,
  SubcategoryCreateRequest,
  SubcategoryUpdateRequest,
} from '../../types/category.types';

export const subcategoriesApi = {
  /**
   * GET /api/subcategories — List subcategories, optionally filtered by categoryId
   */
  getSubcategories: async (params?: { categoryId?: string | number }): Promise<ApiSubcategory[]> => {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.SUBCATEGORIES.LIST, { params });
      const data = unwrapApiResponse<any>(res.data);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.subcategories)) return data.subcategories;
      if (Array.isArray(data?.items)) return data.items;
      return [];
    } catch (err: any) {
      if (__DEV__) {
        console.log('[subcategoriesApi] getSubcategories network fallback:', err?.message || err);
      }
      return [];
    }
  },

  /**
   * GET /api/subcategories/{id} — Get subcategory by ID
   */
  getSubcategoryDetail: async (id: string | number): Promise<ApiSubcategory> => {
    const res = await apiClient.get<any>(API_ENDPOINTS.SUBCATEGORIES.DETAIL(id));
    return unwrapApiResponse<ApiSubcategory>(res.data);
  },

  /**
   * POST /api/subcategories — Create new subcategory
   */
  createSubcategory: async (payload: SubcategoryCreateRequest): Promise<ApiSubcategory> => {
    const res = await apiClient.post<any>(API_ENDPOINTS.SUBCATEGORIES.CREATE, payload);
    return unwrapApiResponse<ApiSubcategory>(res.data);
  },

  /**
   * PUT /api/subcategories/{id} — Update existing subcategory
   */
  updateSubcategory: async (
    id: string | number,
    payload: SubcategoryUpdateRequest
  ): Promise<ApiSubcategory> => {
    const res = await apiClient.put<any>(API_ENDPOINTS.SUBCATEGORIES.UPDATE(id), payload);
    return unwrapApiResponse<ApiSubcategory>(res.data);
  },

  /**
   * DELETE /api/subcategories/{id} — Delete subcategory
   */
  deleteSubcategory: async (id: string | number): Promise<{ success: boolean; message?: string }> => {
    const res = await apiClient.delete<any>(API_ENDPOINTS.SUBCATEGORIES.DELETE(id));
    return unwrapApiResponse<{ success: boolean; message?: string }>(res.data);
  },
};
