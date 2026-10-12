import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { ApiBlogArticle } from '../../types/backend.types';

export const blogApi = {
  /**
   * GET /api/blog/articles — List educational and industry blog articles
   */
  listArticles: async (params?: {
    category?: string;
    tag?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiBlogArticle[]> => {
    const response = await apiClient.get(API_ENDPOINTS.BLOG.ARTICLES, { params });
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * GET /api/blog/articles/{slugOrId} — Get article by ID or slug
   */
  getArticle: async (slugOrId: string | number): Promise<ApiBlogArticle> => {
    const response = await apiClient.get(API_ENDPOINTS.BLOG.DETAIL(slugOrId));
    return unwrapApiResponse<ApiBlogArticle>(response);
  },
};
