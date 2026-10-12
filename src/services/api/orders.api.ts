/**
 * HINCH MART — Live Orders & Checkout API Service
 * Base URL: https://api.hinchmart.com/api
 */
import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  Order,
  CheckoutPreview,
  CheckoutPreviewRequest,
  CreateOrderRequest,
  TrackingInfo,
  InvoiceInfo,
} from '../../types/order.types';

export const ordersApi = {
  /**
   * POST /api/checkout/preview — Live checkout pricing preview calculation
   */
  previewCheckout: async (data: CheckoutPreviewRequest): Promise<CheckoutPreview> => {
    const payload = {
      addressId: Number(data.addressId) || data.addressId,
      deliverySlot: data.deliverySlot || '09:00 AM - 01:00 PM',
      requiresCraneUnloading: Boolean(data.requiresCraneUnloading),
    };
    const response = await apiClient.post<CheckoutPreview | { data: CheckoutPreview }>(
      API_ENDPOINTS.CHECKOUT.PREVIEW,
      payload
    );
    return ((response.data as any)?.data || response.data) as CheckoutPreview;
  },

  /**
   * POST /api/customer/orders — Place a live order
   */
  placeOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const addressIdVal =
      Number(data.addressId || data.deliveryAddressId) || data.addressId || data.deliveryAddressId;
    const paymentMethodVal =
      data.paymentMethod === 'CASH_ON_DELIVERY' || data.paymentMethod === 'COD'
        ? 'COD'
        : data.paymentMethod || 'COD';
    const payload: any = {
      addressId: addressIdVal,
      deliveryAddressId: addressIdVal,
      paymentMethod: paymentMethodVal,
      deliverySlot: data.deliverySlot || 'Morning (9 AM - 1 PM)',
      deliveryInstructions: data.deliveryInstructions || '',
      requiresCraneUnloading: Boolean(data.requiresCraneUnloading),
    };
    if (data.poNumber) {
      payload.poNumber = data.poNumber;
    }
    if (data.couponCode) {
      payload.couponCode = data.couponCode;
    }
    if (data.orderForSomeoneElse) {
      payload.orderForSomeoneElse = true;
      payload.recipientName = data.recipientName;
      payload.recipientPhone = data.recipientPhone;
    }
    if (data.notes) {
      payload.notes = data.notes;
    }

    // If ordering for someone else, attempt dedicated endpoint first
    if (data.orderForSomeoneElse && (API_ENDPOINTS.ORDERS as any).ORDER_FOR_SOMEONE_ELSE) {
      try {
        const response = await apiClient.post<Order | { data: Order }>(
          (API_ENDPOINTS.ORDERS as any).ORDER_FOR_SOMEONE_ELSE,
          payload
        );
        return ((response.data as any)?.data || response.data) as Order;
      } catch (err: any) {
        if (__DEV__) {
          console.warn('[ordersApi] Dedicated /api/orders/for-someone-else failed, falling back to /api/orders:', err?.message);
        }
      }
    }

    try {
      const response = await apiClient.post<Order | { data: Order }>(API_ENDPOINTS.ORDERS.CREATE, payload);
      return ((response.data as any)?.data || response.data) as Order;
    } catch (err: any) {
      if (API_ENDPOINTS.ORDERS.LEGACY_CREATE) {
        try {
          const response = await apiClient.post<Order | { data: Order }>(
            API_ENDPOINTS.ORDERS.LEGACY_CREATE,
            payload
          );
          return ((response.data as any)?.data || response.data) as Order;
        } catch (legacyErr: any) {
          throw legacyErr?.response?.data?.message ? legacyErr : err;
        }
      }
      throw err;
    }
  },

  /**
   * Dedicated Endpoint: POST /api/orders/for-someone-else (alias /api/orders/for-other)
   * Place an order designated for another recipient
   */
  placeOrderForSomeoneElse: async (data: {
    addressId: number | string;
    paymentMethod: string;
    recipientName: string;
    recipientPhone: string;
    notes?: string;
    deliverySlot?: string;
    requiresCraneUnloading?: boolean;
    couponCode?: string;
    [key: string]: any;
  }): Promise<Order> => {
    return ordersApi.placeOrder({
      ...data,
      orderForSomeoneElse: true,
    });
  },

  /**
   * GET /api/customer/checkout/summary — Payout breakdown
   */
  getCheckoutSummary: async (): Promise<any> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.CHECKOUT_SUMMARY);
      return (response.data as any)?.data || response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const cartRes = await apiClient.get(API_ENDPOINTS.CART.GET);
        return (cartRes.data as any)?.data || cartRes.data;
      }
      throw err;
    }
  },

  /**
   * POST /api/customer/payments/verify — Online payment verification
   */
  verifyPayment: async (data: { orderId: number | string; [key: string]: any }): Promise<any> => {
    const response = await apiClient.post(API_ENDPOINTS.ORDERS.VERIFY_PAYMENT, data);
    return (response.data as any)?.data || response.data;
  },

  /**
   * GET /api/customer/orders (or /api/orders) — Fetch list of live orders
   */
  getOrders: async (params?: { page?: number; limit?: number; status?: string }): Promise<Order[]> => {
    try {
      const response = await apiClient.get<Order[] | { data: Order[] }>(API_ENDPOINTS.ORDERS.LIST, { params });
      const payload: any = response.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.orders)) return payload.orders;
      return [];
    } catch (err: any) {
      if (err?.response?.status === 404 && API_ENDPOINTS.ORDERS.LEGACY_LIST) {
        const response = await apiClient.get<Order[] | { data: Order[] }>(
          API_ENDPOINTS.ORDERS.LEGACY_LIST,
          { params }
        );
        const payload: any = response.data;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.orders)) return payload.orders;
      }
      return [];
    }
  },

  /**
   * GET /api/customer/orders/{id} (or /api/orders/{id}) — Fetch single order details
   */
  getOrderDetail: async (id: string | number): Promise<Order> => {
    const cleanId = String(id).replace(/^#/, '');
    try {
      const response = await apiClient.get<Order | { data: Order }>(API_ENDPOINTS.ORDERS.DETAIL(cleanId));
      return ((response.data as any)?.data || response.data) as Order;
    } catch (err: any) {
      if (err?.response?.status === 404 && API_ENDPOINTS.ORDERS.LEGACY_DETAIL) {
        const response = await apiClient.get<Order | { data: Order }>(
          API_ENDPOINTS.ORDERS.LEGACY_DETAIL(cleanId)
        );
        return ((response.data as any)?.data || response.data) as Order;
      }
      throw err;
    }
  },

  /**
   * GET /api/orders/{id}/tracking — Fetch live tracking timeline
   */
  getTracking: async (id: string | number): Promise<TrackingInfo> => {
    const cleanId = String(id).replace(/^#/, '');
    const response = await apiClient.get<TrackingInfo | { data: TrackingInfo }>(API_ENDPOINTS.ORDERS.TRACKING(cleanId));
    return ((response.data as any)?.data || response.data) as TrackingInfo;
  },

  /**
   * GET /api/orders/{id}/invoice — Fetch live invoice URL
   */
  getInvoice: async (id: string | number): Promise<InvoiceInfo> => {
    const cleanId = String(id).replace(/^#/, '');
    const response = await apiClient.get<InvoiceInfo | { data: InvoiceInfo }>(API_ENDPOINTS.ORDERS.INVOICE(cleanId));
    return ((response.data as any)?.data || response.data) as InvoiceInfo;
  },

  /**
   * GET /api/orders/{id}/invoice/pdf — Preview Invoice PDF URL
   */
  getInvoicePdfUrl: (id: string | number): string => {
    const cleanId = String(id).replace(/^#/, '');
    return `${apiClient.defaults.baseURL || 'https://api.hinchmart.com'}/api/orders/${cleanId}/invoice/pdf`;
  },

  /**
   * GET /api/orders/{id}/invoice/download — Download Invoice PDF URL
   */
  getInvoiceDownloadUrl: (id: string | number): string => {
    const cleanId = String(id).replace(/^#/, '');
    return `${apiClient.defaults.baseURL || 'https://api.hinchmart.com'}/api/orders/${cleanId}/invoice/download`;
  },

  /**
   * PUT /api/orders/{id}/status — Update order status (Admin/Logistics)
   */
  updateOrderStatus: async (
    id: string | number,
    data: { status: string; location?: string; description?: string } | string,
    reason?: string
  ): Promise<Order> => {
    const cleanId = String(id).replace(/^#/, '');
    const payload = typeof data === 'string' ? { status: data, description: reason } : data;
    const response = await apiClient.put<Order | { data: Order }>(API_ENDPOINTS.ORDERS.STATUS(cleanId), payload);
    return ((response.data as any)?.data || response.data) as Order;
  },

  /**
   * PATCH /api/orders/{id}/cancel — Cancel order on live backend
   */
  cancelOrder: async (
    id: string | number,
    data?: { location?: string; description?: string } | string
  ): Promise<Order> => {
    const cleanId = String(id).replace(/^#/, '');
    const payload = typeof data === 'string' ? { description: data } : data || {};
    try {
      const response = await apiClient.patch<Order | { data: Order }>(
        API_ENDPOINTS.ORDERS.CANCEL(cleanId),
        payload
      );
      return ((response.data as any)?.data || response.data) as Order;
    } catch {
      return ordersApi.updateOrderStatus(cleanId, {
        status: 'CANCELLED',
        description: typeof data === 'string' ? data : data?.description || 'Cancelled by customer',
      });
    }
  },
};
