import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { ApiNewsItem } from '../../types/backend.types';

export const newsApi = {
  /**
   * GET /api/news — Get live construction and commodity news feed
   */
  getNewsFeed: async (params?: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiNewsItem[]> => {
    const response = await apiClient.get(API_ENDPOINTS.NEWS.LIST, { params });
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * GET /api/news/{id} — Get single news article
   */
  getNewsDetail: async (id: string | number): Promise<ApiNewsItem> => {
    const response = await apiClient.get(API_ENDPOINTS.NEWS.DETAIL(id));
    return unwrapApiResponse<ApiNewsItem>(response);
  },
};
