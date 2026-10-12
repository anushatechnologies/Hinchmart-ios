/**
 * HINCH MART — Razorpay Payment Gateway API Service (Stage 7)
 * Base URL: https://api.hinchmart.com/api/payments
 * Endpoints:
 * - 7.1 POST /api/payments/create-order — Initialize Razorpay payment session
 * - 7.2 POST /api/payments/verify       — Verify Razorpay HMAC signature after payment
 * - 7.3 GET  /api/payments/{id}/status  — Poll real-time payment status
 * - 7.4 GET  /api/payments/order/{orderId}/status — Get latest payment status for internal order
 * - 7.5 GET  /api/payments/customer/{customerId} — Get customer payment history
 * - 7.7 POST /api/payments/order/{orderId}/refund — Trigger refund for cancelled order
 */
import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import {
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentVerifyRequest,
  PaymentStatusResponse,
} from '../../types/backend.types';

export const paymentsApi = {
  /**
   * Step 7.1 — Initialize Razorpay payment session
   * POST /api/payments/create-order
   * Supports:
   * Option A (CHECKOUT): { addressId, deliverySlot, requiresCraneUnloading, purpose: "CHECKOUT" }
   * Option B (ORDER_PAYMENT): { orderId, purpose: "ORDER_PAYMENT" }
   * Option C (WALLET_TOPUP): { amount, purpose: "WALLET_TOPUP" }
   */
  createPaymentOrder: async (
    payload: PaymentOrderRequest
  ): Promise<PaymentOrderResponse> => {
    const body: Record<string, any> = {
      purpose: payload.purpose || (payload.orderId ? 'ORDER_PAYMENT' : 'CHECKOUT'),
    };
    if (payload.addressId !== undefined) {
      body.addressId = Number(payload.addressId) || payload.addressId;
    }
    if (payload.deliverySlot) {
      body.deliverySlot = payload.deliverySlot;
    }
    if (payload.requiresCraneUnloading !== undefined) {
      body.requiresCraneUnloading = Boolean(payload.requiresCraneUnloading);
    }
    if (payload.orderId !== undefined && payload.orderId !== null) {
      body.orderId = Number(payload.orderId) || payload.orderId;
    }
    if (payload.amount !== undefined && payload.amount !== null) {
      body.amount = Number(payload.amount);
    }
    if (payload.currency) {
      body.currency = payload.currency;
    }
    if (payload.orderForSomeoneElse) {
      body.orderForSomeoneElse = true;
      body.recipientName = payload.recipientName;
      body.recipientPhone = payload.recipientPhone;
    }
    if (payload.notes) {
      body.notes = payload.notes;
    }
    const response = await apiClient.post(API_ENDPOINTS.PAYMENTS.CREATE_ORDER, body);
    return unwrapApiResponse<PaymentOrderResponse>(response);
  },

  /**
   * Step 7.2 — Verify Razorpay HMAC signature after user pays
   * POST /api/payments/verify
   * Cryptographically verifies signature and updates order to PAID/CONFIRMED
   */
  verifyPayment: async (
    payload: PaymentVerifyRequest
  ): Promise<PaymentStatusResponse> => {
    const body: Record<string, any> = {
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      razorpaySignature: payload.razorpaySignature,
    };
    if (payload.orderId !== undefined && payload.orderId !== null && payload.orderId !== '') {
      body.orderId = Number(payload.orderId) || payload.orderId;
    }
    const response = await apiClient.post(API_ENDPOINTS.PAYMENTS.VERIFY, body);
    return unwrapApiResponse<PaymentStatusResponse>(response);
  },

  /**
   * Step 7.3 — Poll real-time payment status by payment ID
   * GET /api/payments/{paymentId}/status
   */
  getPaymentStatus: async (
    paymentId: string | number
  ): Promise<PaymentStatusResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.STATUS(paymentId));
    return unwrapApiResponse<PaymentStatusResponse>(response);
  },

  /**
   * Step 7.4 — Get latest payment status for an internal order
   * GET /api/payments/order/{orderId}/status
   */
  getOrderPaymentStatus: async (
    orderId: string | number
  ): Promise<PaymentStatusResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.ORDER_STATUS(orderId));
    return unwrapApiResponse<PaymentStatusResponse>(response);
  },

  /**
   * Step 7.5 — Get all payments made by a specific customer
   * GET /api/payments/customer/{customerId}
   */
  getCustomerPayments: async (
    customerId: string | number
  ): Promise<PaymentStatusResponse[]> => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.CUSTOMER_PAYMENTS(customerId));
    const data = unwrapApiResponse<any>(response);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  /**
   * Step 7.7 — Trigger refund for cancelled order
   * POST /api/payments/order/{orderId}/refund
   */
  refundOrder: async (
    orderId: string | number
  ): Promise<PaymentStatusResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.PAYMENTS.REFUND(orderId));
    return unwrapApiResponse<PaymentStatusResponse>(response);
  },
};
