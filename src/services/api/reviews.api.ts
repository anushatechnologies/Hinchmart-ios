/**
 * HINCH MART — Live Product Reviews API Service
 * Base Route: /api/reviews
 */
import apiClient from './client';
import { API_ENDPOINTS } from '../../constants/api';

export interface CreateReviewRequestPayload {
  productId?: number | string;
  orderId?: number | string;
  orderItemId?: number | string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  imageUrls?: string[];
}

export interface ReviewResponseData {
  id: number | string;
  reviewId?: number | string;
  productId?: number | string;
  productTitle?: string;
  customerId?: number | string;
  customerName?: string;
  orderId?: number | string;
  orderItemId?: number | string;
  rating: number;
  title?: string;
  comment: string;
  status?: string;
  helpfulCount?: number;
  helpfulVotes?: number;
  verifiedPurchase?: boolean;
  imageUrls?: string[];
  createdAt?: string;
}

export const reviewsApi = {
  /**
   * GET /api/reviews — List reviews (filter by status, pagination)
   */
  getReviews: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ReviewResponseData[]> => {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.REVIEWS.LIST, { params });
      const payload: any = response.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.reviews)) return payload.reviews;
      if (Array.isArray(payload?.items)) return payload.items;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * GET /api/reviews/{id} — Get review details
   */
  getReviewById: async (id: string | number): Promise<ReviewResponseData> => {
    const response = await apiClient.get<any>(API_ENDPOINTS.REVIEWS.DETAIL(id));
    return ((response.data as any)?.data || response.data) as ReviewResponseData;
  },

  /**
   * POST /api/reviews — Submit rating & review for an item
   */
  createReview: async (
    data: CreateReviewRequestPayload,
    userId?: string | number
  ): Promise<ReviewResponseData> => {
    const headers: Record<string, any> = {};
    if (userId) {
      headers['X-User-Id'] = String(userId);
    }

    const response = await apiClient.post<ReviewResponseData | { data: ReviewResponseData }>(
      API_ENDPOINTS.REVIEWS.CREATE,
      data,
      { headers: Object.keys(headers).length > 0 ? headers : undefined }
    );
    return ((response.data as any)?.data || response.data) as ReviewResponseData;
  },

  /**
   * PUT /api/reviews/{id} — Edit review
   */
  updateReview: async (
    id: string | number,
    data: Partial<CreateReviewRequestPayload>,
    userId?: string | number
  ): Promise<ReviewResponseData> => {
    const headers: Record<string, any> = {};
    if (userId) {
      headers['X-User-Id'] = String(userId);
    }

    const response = await apiClient.put<ReviewResponseData | { data: ReviewResponseData }>(
      API_ENDPOINTS.REVIEWS.UPDATE(id),
      data,
      { headers: Object.keys(headers).length > 0 ? headers : undefined }
    );
    return ((response.data as any)?.data || response.data) as ReviewResponseData;
  },

  /**
   * DELETE /api/reviews/{id} — Delete review
   */
  deleteReview: async (
    id: string | number,
    userId?: string | number
  ): Promise<{ success: boolean; message?: string }> => {
    const headers: Record<string, any> = {};
    if (userId) {
      headers['X-User-Id'] = String(userId);
    }

    const response = await apiClient.delete(API_ENDPOINTS.REVIEWS.DELETE(id), {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return response.data;
  },

  /**
   * POST /api/reviews/{id}/helpful — Upvote review as helpful
   */
  markReviewHelpful: async (
    id: string | number,
    userId?: string | number
  ): Promise<{ success: boolean; message?: string }> => {
    const headers: Record<string, any> = {};
    if (userId) {
      headers['X-User-Id'] = String(userId);
    }

    const response = await apiClient.post(API_ENDPOINTS.REVIEWS.HELPFUL(id), {}, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return response.data;
  },

  /**
   * GET /api/reviews/product/{productId} — Fetch all reviews for a product with optional rating & pagination
   */
  getProductReviews: async (
    productId: string | number,
    params?: { rating?: number; page?: number; limit?: number }
  ): Promise<ReviewResponseData[]> => {
    const response = await apiClient.get<ReviewResponseData[] | { data: ReviewResponseData[] }>(
      API_ENDPOINTS.REVIEWS.PRODUCT_REVIEWS(productId),
      { params }
    );
    const payload: any = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.reviews)) return payload.reviews;
    return [];
  },

  /**
   * GET /api/reviews/product/{productId}/summary — Rating Summary & Distribution
   */
  getProductReviewSummary: async (
    productId: string | number
  ): Promise<{ productId: number | string; averageRating: number; totalReviews: number; ratingDistribution: Record<string, number> }> => {
    const response = await apiClient.get(API_ENDPOINTS.REVIEWS.PRODUCT_SUMMARY(productId));
    const data = (response.data as any)?.data || response.data;
    return data;
  },

  /**
   * PATCH /api/reviews/{reviewId}/status — Moderate review (Admin)
   */
  moderateReview: async (
    reviewId: string | number,
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.patch(API_ENDPOINTS.REVIEWS.MODERATE(reviewId), null, {
      params: { status },
    });
    return response.data;
  },
};
