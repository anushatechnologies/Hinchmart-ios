/**
 * HINCH MART — Customer Discounts & Offers API Service
 * Endpoint: GET /api/customer/discounts
 */
import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  CustomerDiscount,
  DiscountsResponse,
  DiscountValidationResult,
} from '../../types/discount.types';

// Curated active, admin-approved fallback discounts
export const DEFAULT_CUSTOMER_DISCOUNTS: CustomerDiscount[] = [];

let cachedDiscounts: CustomerDiscount[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const discountsApi = {
  /**
   * GET /api/customer/discounts
   * Fetches all active, admin-approved discounts available to customers
   */
  getCustomerDiscounts: async (forceRefresh = false): Promise<CustomerDiscount[]> => {
    const now = Date.now();
    if (!forceRefresh && cachedDiscounts && now - lastFetchTime < CACHE_TTL_MS) {
      return cachedDiscounts;
    }

    try {
      const response = await apiClient.get<DiscountsResponse | CustomerDiscount[]>(
        API_ENDPOINTS.DISCOUNTS.CUSTOMER_DISCOUNTS
      );

      const raw = response.data;
      let list: CustomerDiscount[] = [];

      if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data)) {
        list = (raw as any).data;
      } else if (Array.isArray(raw)) {
        list = raw;
      }

      // Filter to only active and approved discounts
      const activeApproved = list.filter(
        (d) => d && d.active !== false && (d.status === 'APPROVED' || !d.status)
      );

      if (activeApproved.length > 0) {
        cachedDiscounts = activeApproved;
        lastFetchTime = now;
        return activeApproved;
      }

      return [];
    } catch (err: any) {
      return [];
    }
  },

  /**
   * Find discount by coupon code
   */
  getDiscountByCode: async (code: string): Promise<CustomerDiscount | null> => {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    const discounts = await discountsApi.getCustomerDiscounts();
    return discounts.find((d) => d.code.trim().toUpperCase() === clean) || null;
  },

  /**
   * Calculate discount amount and validate eligibility against order subtotal
   */
  calculateDiscount: (
    discount: CustomerDiscount,
    orderSubtotal: number
  ): DiscountValidationResult => {
    if (!discount) {
      return {
        isValid: false,
        message: 'Invalid discount coupon',
        discountAmount: 0,
      };
    }

    const minOrder = Number(discount.minimumOrderAmount || 0);
    if (orderSubtotal < minOrder) {
      const diff = minOrder - orderSubtotal;
      return {
        isValid: false,
        message: `Add ₹${diff.toLocaleString('en-IN')} more to unlock this discount (Min. order: ₹${minOrder.toLocaleString('en-IN')})`,
        discountAmount: 0,
        discount,
      };
    }

    let calculated = 0;
    const discountVal = Number(discount.discountValue || 0);

    if (discount.discountType?.toUpperCase() === 'PERCENTAGE') {
      calculated = (orderSubtotal * discountVal) / 100;
      const maxDiscount = Number(discount.maxDiscountAmount);
      if (maxDiscount > 0 && calculated > maxDiscount) {
        calculated = maxDiscount;
      }
    } else {
      // FIXED or FLAT
      calculated = discountVal;
    }

    calculated = Math.round(calculated);

    return {
      isValid: true,
      message: `Discount of ₹${calculated.toLocaleString('en-IN')} applicable`,
      discountAmount: calculated,
      discount,
    };
  },
};

export default discountsApi;
