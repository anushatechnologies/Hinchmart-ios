import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { BackendCart, BackendCartItem, AddToCartRequest, CouponValidation } from '../../types/cart.types';

function normalizeCart(raw: any): BackendCart {
  if (!raw) {
    return {
      cartId: 0,
      totalItems: 0,
      items: [],
      subtotal: 0,
      couponDiscount: 0,
      discountAmount: 0,
      totalGst: 0,
      deliveryCharge: 0,
      grandTotal: 0,
      totalAmount: 0,
      appliedCoupon: null,
    };
  }

  let data: any = raw?.data !== undefined ? raw.data : raw;
  if (data?.cart !== undefined) {
    data = data.cart;
  }
  if (data?.data !== undefined && (data.data.items || Array.isArray(data.data))) {
    data = data.data;
  }

  const rawItems: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.cartItems)
    ? data.cartItems
    : [];

  const items: BackendCartItem[] = rawItems.map((item: any) => {
    const pId = item.productId ?? item.id ?? (item.product?.id || item.product?.productId);
    const title = item.title || item.productName || item.name || item.product?.title || item.product?.name || 'Product';
    const img = item.imageUrl || item.productImage || item.image || item.product?.imageUrl || item.product?.image || '';
    const unitPrice = Number(item.unitPrice ?? item.price ?? item.product?.price ?? 0);
    const quantity = Number(item.quantity) || 1;
    const lineTotal = Number(item.lineTotal ?? item.totalPrice ?? (unitPrice * quantity));
    const cartItemId = item.cartItemId ?? item.id ?? pId;

    return {
      cartItemId: cartItemId,
      productId: pId,
      title: title,
      productName: title,
      imageUrl: img,
      quantity: quantity,
      unit: item.unit || item.product?.unit || 'pcs',
      unitPrice: unitPrice,
      originalPrice: item.originalPrice !== undefined ? Number(item.originalPrice) : undefined,
      appliedTier: item.appliedTier,
      gstRate: item.gstRate !== undefined ? Number(item.gstRate) : undefined,
      lineTotal: lineTotal,
      totalPrice: lineTotal,
      lineGst: item.lineGst !== undefined ? Number(item.lineGst) : undefined,
      storeId: item.storeId || item.product?.storeId,
    };
  });

  const subtotal = data.subtotal !== undefined
    ? Number(data.subtotal)
    : items.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
  const discountAmount = Number(data.discountAmount ?? data.couponDiscount ?? data.discount ?? 0);
  const totalGst = Number(data.totalGst ?? data.gst ?? 0);
  const deliveryCharge = Number(data.deliveryFee ?? data.deliveryCharge ?? data.shippingFee ?? 0);
  const grandTotal = Number(
    data.totalAmount ?? data.grandTotal ?? Math.max(0, subtotal - discountAmount + totalGst + deliveryCharge)
  );

  return {
    cartId: data.cartId ?? 0,
    storeId: data.storeId,
    storeName: data.storeName,
    storeSlug: data.storeSlug,
    totalItems: data.totalItems ?? items.reduce((acc, it) => acc + (it.quantity || 1), 0),
    items,
    subtotal,
    couponDiscount: discountAmount,
    discountAmount,
    totalGst,
    deliveryCharge,
    grandTotal,
    totalAmount: grandTotal,
    appliedCoupon: data.appliedCoupon ?? data.couponCode ?? null,
  };
}

function is404(err: any): boolean {
  const status = err?.statusCode ?? err?.status ?? err?.response?.status;
  return status === 404 || String(err?.message || '').toLowerCase().includes('not found');
}

export const cartApi = {
  /**
   * GET /api/cart (or /api/customer/cart) — Fetch live cart details & item list
   */
  getCart: async (): Promise<BackendCart> => {
    try {
      const response = await apiClient.get<BackendCart | { data: BackendCart }>(API_ENDPOINTS.CART.GET);
      return normalizeCart(response.data);
    } catch (err: any) {
      if (is404(err) && API_ENDPOINTS.CART.LEGACY_GET) {
        const response = await apiClient.get<BackendCart | { data: BackendCart }>(API_ENDPOINTS.CART.LEGACY_GET);
        return normalizeCart(response.data);
      }
      throw err;
    }
  },

  /**
   * POST /api/cart/items (or /api/customer/cart/items) — Add or update an item in the live cart
   */
  addToCart: async (data: AddToCartRequest): Promise<any> => {
    const payload: any = {
      productId: Number(data.productId) || data.productId,
      quantity: Number(data.quantity) || 1,
    };
    if (data.storeId) {
      payload.storeId = Number(data.storeId) || data.storeId;
    }
    try {
      const response = await apiClient.post(API_ENDPOINTS.CART.ADD, payload);
      return unwrapApiResponse<any>(response);
    } catch (err: any) {
      if (is404(err) && API_ENDPOINTS.CART.LEGACY_ADD) {
        const response = await apiClient.post(API_ENDPOINTS.CART.LEGACY_ADD, payload);
        return unwrapApiResponse<any>(response);
      }
      throw err;
    }
  },

  /**
   * PUT /api/cart/items/{cartItemId} — Update quantity of an existing cart item.
   * Sending quantity: 0 deletes the item.
   */
  updateCartItem: async (cartItemId: string | number, quantity: number): Promise<any> => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.CART.UPDATE_ITEM(cartItemId),
        { quantity }
      );
      return unwrapApiResponse<any>(response);
    } catch (err: any) {
      if (is404(err) && API_ENDPOINTS.CART.LEGACY_UPDATE_ITEM) {
        const response = await apiClient.put(
          API_ENDPOINTS.CART.LEGACY_UPDATE_ITEM(cartItemId),
          { quantity }
        );
        return unwrapApiResponse<any>(response);
      }
      throw err;
    }
  },

  /**
   * DELETE /api/cart/items/{cartItemId} — Remove an item by cartItemId from live cart
   */
  removeCartItem: async (cartItemId: string | number): Promise<any> => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.CART.REMOVE(cartItemId));
      return unwrapApiResponse<any>(response);
    } catch (err: any) {
      if (is404(err) && API_ENDPOINTS.CART.LEGACY_REMOVE) {
        const response = await apiClient.delete(API_ENDPOINTS.CART.LEGACY_REMOVE(cartItemId));
        return unwrapApiResponse<any>(response);
      }
      throw err;
    }
  },

  /**
   * POST /api/cart/sync — Merge guest cart items into the authenticated user's server cart.
   * Optionally pass targetStoreId.
   */
  syncGuestCart: async (
    items: Array<{ productId: string | number; quantity: number }>,
    targetStoreId?: number | string
  ): Promise<BackendCart> => {
    const payload: any = {
      items: items.map(item => ({
        productId: Number(item.productId) || item.productId,
        quantity: Number(item.quantity) || 1,
      })),
    };
    if (targetStoreId !== undefined && targetStoreId !== null) {
      payload.targetStoreId = Number(targetStoreId) || targetStoreId;
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.CART.SYNC, payload);
      return normalizeCart(response.data);
    } catch (err: any) {
      if (is404(err) && API_ENDPOINTS.CART.LEGACY_SYNC) {
        const response = await apiClient.post(API_ENDPOINTS.CART.LEGACY_SYNC, payload);
        return normalizeCart(response.data);
      }
      throw err;
    }
  },

  /**
   * POST /api/cart/switch-store — Switch active store
   */
  switchStore: async (storeId: number | string): Promise<any> => {
    const payload = {
      storeId: Number(storeId) || storeId,
      targetStoreId: Number(storeId) || storeId,
    };
    try {
      const response = await apiClient.post(API_ENDPOINTS.CART.SWITCH_STORE, payload);
      return unwrapApiResponse<any>(response);
    } catch (err: any) {
      if (is404(err) && (API_ENDPOINTS.CART as any).LEGACY_SWITCH_STORE) {
        const response = await apiClient.post((API_ENDPOINTS.CART as any).LEGACY_SWITCH_STORE, payload);
        return unwrapApiResponse<any>(response);
      }
      throw err;
    }
  },

  /**
   * DELETE /api/cart — Clear the entire live cart
   */
  clearCart: async (): Promise<any> => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.CART.CLEAR);
      return unwrapApiResponse<any>(response);
    } catch (err: any) {
      if ((API_ENDPOINTS.CART as any).LEGACY_CLEAR) {
        try {
          const response = await apiClient.delete((API_ENDPOINTS.CART as any).LEGACY_CLEAR);
          return unwrapApiResponse<any>(response);
        } catch {
          // fall through
        }
      }

      // Backend self-healing fallback: if DELETE /api/cart fails with Spring transaction rollback (500),
      // remove each live item individually via DELETE /api/cart/items/{id}
      try {
        const liveCart = await cartApi.getCart();
        if (liveCart && Array.isArray(liveCart.items) && liveCart.items.length > 0) {
          await Promise.allSettled(
            liveCart.items.map((item: any) => {
              const itemId = item.cartItemId || item.id;
              return cartApi.removeCartItem(itemId);
            })
          );
          return { success: true, message: 'Cart cleared' };
        }
      } catch {
        // Fallback failed
      }

      throw err;
    }
  },

  /**
   * POST /api/cart/coupon — Validate and apply coupon code
   */
  applyCoupon: async (couponCode: string): Promise<CouponValidation | any> => {
    const cleanCode = couponCode.trim().toUpperCase();
    const payload = {
      code: cleanCode,
      couponCode: cleanCode,
    };
    try {
      const response = await apiClient.post(API_ENDPOINTS.CART.APPLY_COUPON, payload);
      return unwrapApiResponse<CouponValidation | any>(response);
    } catch (err: any) {
      if (is404(err) && (API_ENDPOINTS.CART as any).LEGACY_APPLY_COUPON) {
        const response = await apiClient.post((API_ENDPOINTS.CART as any).LEGACY_APPLY_COUPON, payload);
        return unwrapApiResponse<CouponValidation | any>(response);
      }
      throw err;
    }
  },

  /**
   * DELETE /api/cart/coupon — Remove applied coupon
   */
  removeCoupon: async (): Promise<any> => {
    try {
      const response = await apiClient.delete(API_ENDPOINTS.CART.REMOVE_COUPON);
      return unwrapApiResponse<any>(response);
    } catch (err: any) {
      if (is404(err) && (API_ENDPOINTS.CART as any).LEGACY_REMOVE_COUPON) {
        const response = await apiClient.delete((API_ENDPOINTS.CART as any).LEGACY_REMOVE_COUPON);
        return unwrapApiResponse<any>(response);
      }
      throw err;
    }
  },
};
