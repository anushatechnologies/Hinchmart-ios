import apiClient from './client';
import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import { ApiCategory, CategoryCreateRequest, CategoryUpdateRequest } from '../../types/category.types';

export function normalizeCategoryImageUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function extractCategoriesArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.categories)) return payload.categories;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.categories)) return payload.data.categories;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.content)) return payload.data.content;
    if (Array.isArray(payload.data.result)) return payload.data.result;
    if (Array.isArray(payload.data.rows)) return payload.data.rows;
  }
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (payload.id || payload.categoryId || payload.name || payload.title) {
    return [payload];
  }
  return [];
}

export function normalizeApiCategory(raw: any, index = 0): ApiCategory {
  const catId = raw.categoryId || raw.id || raw.category_id || raw._id || index + 1;
  const rawImg =
    raw.imageUrl ||
    raw.image ||
    raw.icon ||
    raw.thumbnailUrl ||
    raw.photo ||
    raw.fileUrl ||
    raw.mediaUrl ||
    '';
  const resolvedImg = normalizeCategoryImageUrl(rawImg);

  return {
    ...raw,
    id: String(catId),
    categoryId: String(catId),
    name: raw.name || raw.title || raw.categoryName || '',
    slug: raw.slug || (raw.name ? raw.name.toLowerCase().replace(/\s+/g, '-') : `cat_${catId}`),
    imageUrl: resolvedImg,
    active: raw.active !== false && raw.status !== 'INACTIVE',
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : parseInt(raw.sort_order ?? raw.order ?? '0', 10) || 0,
    iconName: raw.iconName || raw.icon || 'shape-outline',
    color: raw.color || '#E31E24',
    gradient: raw.gradient || ['#E31E24', '#991B1B'],
    productCount: raw.productCount || (raw.subCategories ? `${raw.subCategories.length} Subcategories` : undefined),
    subCategories: raw.subCategories,
  };
}

export const categoriesApi = {
  /**
   * GET /api/categories — Retrieve all categories from live backend
   */
  getCategories: async (): Promise<ApiCategory[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.LIST);
      const rawList = extractCategoriesArray(response.data);
      return rawList.map((c, idx) => normalizeApiCategory(c, idx));
    } catch (err: any) {
      if (__DEV__) {
        console.log('[categoriesApi] getCategories network fallback:', err?.message || err);
      }
      return [];
    }
  },

  /**
   * GET /api/categories/{id} — Retrieve category by ID
   */
  getCategoryDetail: async (id: string | number): Promise<ApiCategory> => {
    const response = await apiClient.get<ApiCategory>(API_ENDPOINTS.CATEGORIES.DETAIL(id));
    const payload = response.data;
    const item = (payload as any)?.data || payload;
    return normalizeApiCategory(item);
  },

  /**
   * POST /api/categories — Create new category
   */
  createCategory: async (data: CategoryCreateRequest): Promise<ApiCategory> => {
    const response = await apiClient.post<ApiCategory>(API_ENDPOINTS.CATEGORIES.CREATE, data);
    const item = (response.data as any)?.data || response.data;
    return normalizeApiCategory(item);
  },

  /**
   * PUT /api/categories/{id} — Update category
   */
  updateCategory: async (id: string | number, data: CategoryUpdateRequest): Promise<ApiCategory> => {
    const response = await apiClient.put<ApiCategory>(API_ENDPOINTS.CATEGORIES.UPDATE(id), data);
    const item = (response.data as any)?.data || response.data;
    return normalizeApiCategory(item);
  },

  /**
   * DELETE /api/categories/{id} — Delete category
   */
  deleteCategory: async (id: string | number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete(API_ENDPOINTS.CATEGORIES.DELETE(id));
    return response.data;
  },
};
