/**
 * HINCH MART — Live Wishlist API Service
 * Base URL: https://api.hinchmart.com/api/wishlist
 */
import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { ApiProduct } from '../../types/product.types';

export interface WishlistItem {
  id: string | number;
  productId: string | number;
  product: ApiProduct;
  createdAt?: string;
}

export const wishlistApi = {
  /**
   * GET /api/wishlist — Fetch live user wishlist items
   */
  getWishlist: async (): Promise<WishlistItem[]> => {
    const response = await apiClient.get<WishlistItem[] | { data: WishlistItem[] }>(API_ENDPOINTS.WISHLIST.LIST);
    const payload: any = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  },

  /**
   * POST /api/wishlist/{productId} — Add a product to wishlist
   */
  addProduct: async (productId: string | number): Promise<any> => {
    const cleanId = String(productId).replace(/_default$/, '');
    const response = await apiClient.post(API_ENDPOINTS.WISHLIST.ADD(cleanId));
    return response.data;
  },

  /**
   * DELETE /api/wishlist/{productId} — Remove a product from wishlist
   */
  removeProduct: async (productId: string | number): Promise<any> => {
    const cleanId = String(productId).replace(/_default$/, '');
    const response = await apiClient.delete(API_ENDPOINTS.WISHLIST.REMOVE(cleanId));
    return response.data;
  },
};
