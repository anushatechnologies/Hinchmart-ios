/**
 * HINCH MART — Platform Coupons & Cart Checkout Discounts API
 * Sources: CouponController.java, CartController.java, AdminCouponController.java
 */
import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  EligibleCoupon,
  EligibleCouponResponse,
  CouponResponse,
  ApplyCouponResponseData,
} from '../../types/coupon.types';

// Curated active platform coupons matching backend schema
export const DEFAULT_PLATFORM_COUPONS: Omit<EligibleCoupon, 'isApplicable' | 'estimatedDiscount' | 'shortfallAmount'>[] = [];

export const couponsApi = {
  /**
   * GET /api/coupons/eligible (or GET /api/coupons)
   * Fetches all coupons evaluated against the logged-in customer's active cart.
   */
  getEligibleCoupons: async (cartSubtotal: number = 0): Promise<EligibleCoupon[]> => {
    try {
      let res;
      try {
        res = await apiClient.get<EligibleCouponResponse>(API_ENDPOINTS.COUPONS.ELIGIBLE);
      } catch (err: any) {
        // Fallback to GET /api/coupons if /eligible returns 404
        if (err?.response?.status === 404) {
          res = await apiClient.get<EligibleCouponResponse>(API_ENDPOINTS.COUPONS.LIST);
        } else {
          throw err;
        }
      }

      const raw = res.data;
      let list: EligibleCoupon[] = [];
      if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) {
        list = (raw as any).data;
      } else if (Array.isArray(raw)) {
        list = raw;
      }

      if (list.length > 0) {
        return list;
      }
    } catch (err: any) {
      if (__DEV__) {
        console.log('[couponsApi] using evaluated fallback coupons:', err?.message || err);
      }
    }

    // No fallback mock coupons in production; return empty list
    return [];
  },

  /**
   * POST /api/cart/coupon
   * Applies a promo/coupon code to the active cart.
   * Body: { "code": "SAVE10" }
   */
  applyCoupon: async (couponCode: string): Promise<ApplyCouponResponseData> => {
    const cleanCode = couponCode.trim().toUpperCase();
    const payload = { code: cleanCode };

    const response = await apiClient.post<CouponResponse | any>(
      API_ENDPOINTS.COUPONS.APPLY,
      payload
    );

    const raw = response.data;
    if (raw && typeof raw === 'object' && 'data' in raw && raw.data) {
      return raw.data as ApplyCouponResponseData;
    }
    return raw as ApplyCouponResponseData;
  },

  /**
   * DELETE /api/cart/coupon
   * Removes the currently applied coupon from the cart and recalculates totals.
   */
  removeCoupon: async (): Promise<any> => {
    const response = await apiClient.delete(API_ENDPOINTS.COUPONS.REMOVE);
    const raw = response.data;
    if (raw && typeof raw === 'object' && 'data' in raw && raw.data) {
      return raw.data;
    }
    return raw;
  },
};

export default couponsApi;
