/**
 * HINCH MART — Shipping & Delivery Charges API Service
 * 
 * Provides dynamic shipping and freight calculation based on:
 * 1. Admin panel configuration / live backend settings
 * 2. Store-level delivery rules
 * 3. Free delivery minimum order threshold
 * 4. Item weight / category classification (Retail vs Heavy Industrial Freight)
 */
import apiClient from './client';
import { mmkvStorage } from '../storage/mmkv';

export interface ShippingSettings {
  /** Minimum subtotal to qualify for 100% free delivery */
  freeDeliveryThreshold: number;
  /** Standard shipping fee for orders below threshold (₹) */
  standardDeliveryFee: number;
  /** Express 24-Hour delivery fee (₹) */
  express24HourFee: number;
  /** Heavy industrial freight fee for bulk steel, cement, aggregate (₹) */
  heavyFreightFee: number;
  /** Whether free shipping threshold is active */
  isFreeDeliveryEnabled: boolean;
}

const STORAGE_KEY = 'hm_shipping_settings';

/**
 * Default fallback shipping configuration
 * (Used if backend settings are unreachable or unconfigured)
 */
export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  freeDeliveryThreshold: 999, // Orders above ₹999 get free delivery
  standardDeliveryFee: 0,     // Default free delivery promotion or flat ₹0
  express24HourFee: 149,      // Express 24-hr Hyderabad fee
  heavyFreightFee: 2500,      // Heavy truckload/crane logistics for bulk MT
  isFreeDeliveryEnabled: true,
};

export const shippingApi = {
  /**
   * Get cached or default shipping settings synchronously
   */
  getSettingsSync: (): ShippingSettings => {
    try {
      const cached = mmkvStorage.getObject<ShippingSettings>(STORAGE_KEY);
      if (cached && typeof cached.freeDeliveryThreshold === 'number') {
        return cached;
      }
    } catch {}
    return DEFAULT_SHIPPING_SETTINGS;
  },

  /**
   * Fetch live shipping configuration from backend API
   */
  fetchSettings: async (): Promise<ShippingSettings> => {
    try {
      const response = await apiClient.get('/api/settings/shipping').catch(async () => {
        // Fallback to store/platform config endpoint if /settings/shipping is not directly mapped
        return await apiClient.get('/api/stores/1');
      });

      const data: any = response?.data?.data || response?.data;
      if (data) {
        const settings: ShippingSettings = {
          freeDeliveryThreshold: Number(data.freeDeliveryThreshold ?? data.minOrderValue ?? DEFAULT_SHIPPING_SETTINGS.freeDeliveryThreshold),
          standardDeliveryFee: Number(data.standardDeliveryFee ?? data.deliveryFee ?? 0),
          express24HourFee: Number(data.express24HourFee ?? DEFAULT_SHIPPING_SETTINGS.express24HourFee),
          heavyFreightFee: Number(data.heavyFreightFee ?? DEFAULT_SHIPPING_SETTINGS.heavyFreightFee),
          isFreeDeliveryEnabled: Boolean(data.isFreeDeliveryEnabled ?? true),
        };
        mmkvStorage.setObject(STORAGE_KEY, settings);
        return settings;
      }
    } catch {
      // Graceful fallback to cached or default
    }
    return shippingApi.getSettingsSync();
  },

  /**
   * Save updated shipping settings (admin/local cache)
   */
  saveSettings: (settings: ShippingSettings): void => {
    try {
      mmkvStorage.setObject(STORAGE_KEY, settings);
    } catch {}
  },

  /**
   * Calculate real shipping charge for a cart or order
   * Filters out bogus/mock 4500 dummy charges returned by unconfigured backends.
   *
   * @param subtotal Cart subtotal amount (₹)
   * @param itemCount Number of items in cart
   * @param backendCharge Raw deliveryCharge or freightCharge returned from API (if any)
   * @param isExpress24Hour Whether 24-hr express delivery is requested
   * @param isHeavyCargo Whether cart contains bulk industrial cargo (MT cement/steel)
   */
  calculateShipping: (
    subtotal: number,
    itemCount: number,
    backendCharge?: number | null,
    isExpress24Hour?: boolean,
    isHeavyCargo?: boolean
  ): {
    shippingCost: number;
    isFreeShipping: boolean;
    remainingForFreeShipping: number;
    label: string;
  } => {
    if (itemCount === 0 || subtotal <= 0) {
      return {
        shippingCost: 0,
        isFreeShipping: true,
        remainingForFreeShipping: 0,
        label: 'FREE',
      };
    }

    const settings = shippingApi.getSettingsSync();

    // 1. Check if backend charge is a legitimate custom charge OR a bogus mock (4500 dummy)
    // Note: The backend previously had a hardcoded 4500.0 in CartService mock response.
    // We ignore that dummy 4500 for normal retail/sub-bulk items unless explicitly heavy cargo.
    const isMockBackendCharge = backendCharge === 4500 && !isHeavyCargo && subtotal < 50000;
    const validBackendCharge = (backendCharge != null && !isMockBackendCharge && backendCharge >= 0)
      ? Number(backendCharge)
      : null;

    // 2. Heavy industrial bulk cargo check (e.g. 10-50 Metric Tons steel/aggregate)
    if (isHeavyCargo) {
      const charge = validBackendCharge ?? settings.heavyFreightFee;
      return {
        shippingCost: charge,
        isFreeShipping: charge === 0,
        remainingForFreeShipping: 0,
        label: charge === 0 ? 'FREE B2B FREIGHT' : `₹${charge.toLocaleString('en-IN')}`,
      };
    }

    // 3. Free delivery threshold check
    if (settings.isFreeDeliveryEnabled && subtotal >= settings.freeDeliveryThreshold) {
      return {
        shippingCost: 0,
        isFreeShipping: true,
        remainingForFreeShipping: 0,
        label: 'FREE',
      };
    }

    // 4. If valid backend charge provided, use it
    if (validBackendCharge !== null) {
      return {
        shippingCost: validBackendCharge,
        isFreeShipping: validBackendCharge === 0,
        remainingForFreeShipping: Math.max(0, settings.freeDeliveryThreshold - subtotal),
        label: validBackendCharge === 0 ? 'FREE' : `₹${validBackendCharge.toLocaleString('en-IN')}`,
      };
    }

    // 5. Express delivery surcharge
    if (isExpress24Hour) {
      const charge = settings.express24HourFee;
      return {
        shippingCost: charge,
        isFreeShipping: false,
        remainingForFreeShipping: 0,
        label: `₹${charge.toLocaleString('en-IN')}`,
      };
    }

    // 6. Standard configured delivery fee
    const standardFee = settings.standardDeliveryFee;
    const remaining = Math.max(0, settings.freeDeliveryThreshold - subtotal);

    return {
      shippingCost: standardFee,
      isFreeShipping: standardFee === 0,
      remainingForFreeShipping: remaining,
      label: standardFee === 0 ? 'FREE' : `₹${standardFee.toLocaleString('en-IN')}`,
    };
  },
};
