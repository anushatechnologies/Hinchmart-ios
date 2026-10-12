import apiClient, { unwrapApiResponse } from './client';
import { API_ENDPOINTS } from '../../constants/api';
import { CheckoutPreviewRequest, CheckoutPreviewResponse } from '../../types/backend.types';

export const checkoutApi = {
  /**
   * POST /api/checkout/preview — Preview Checkout Totals with GST, freight, and crane unloading
   */
  previewCheckout: async (payload: CheckoutPreviewRequest): Promise<CheckoutPreviewResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.CHECKOUT.PREVIEW, payload);
    return unwrapApiResponse<CheckoutPreviewResponse>(response);
  },
};
