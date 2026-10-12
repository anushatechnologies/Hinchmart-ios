/**
 * HINCH MART — Discount & Coupon Data Models
 * Matches backend GET /api/customer/discounts schema
 */

export type DiscountType = 'PERCENTAGE' | 'FIXED' | 'FLAT' | string;

export interface CustomerDiscount {
  discountId: number;
  sellerId?: number | null;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscountAmount?: number | null;
  startDate?: string;
  endDate?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  active: boolean;
}

export interface DiscountsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: CustomerDiscount[];
  timestamp?: string;
}

export interface DiscountValidationResult {
  isValid: boolean;
  message: string;
  discountAmount: number;
  discount?: CustomerDiscount;
}
