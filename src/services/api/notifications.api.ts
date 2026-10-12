/**
 * HINCH MART — Notifications API Service
 */
import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';

export interface ApiNotification {
  id: string | number;
  title: string;
  body: string;
  type?: 'order' | 'rfq' | 'wallet' | 'promo' | string;
  read?: boolean;
  isRead?: boolean;
  createdAt?: string;
  orderId?: string;
  rfqId?: string;
}

export const notificationsApi = {
  getNotifications: async (): Promise<ApiNotification[]> => {
    try {
      const response = await apiClient.get<ApiNotification[] | { data: ApiNotification[] }>(
        API_ENDPOINTS.NOTIFICATIONS.LIST
      );
      const items = Array.isArray(response.data)
        ? response.data
        : (response.data as any)?.data || [];
      return items;
    } catch {
      return [];
    }
  },

  markAsRead: async (id: string | number): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(String(id)));
    } catch {}
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    } catch {}
  },
};
