/**
 * HINCH MART — Platform Coupons & Cart Checkout Discounts Data Models
 * Sources: CouponController.java, CartController.java, AdminCouponController.java
 */

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FLAT' | string;

export interface EligibleCoupon {
  code: string;
  title: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  expiryDate: string;
  isApplicable: boolean;
  estimatedDiscount: number;
  shortfallAmount: number;
}

export interface EligibleCouponResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: EligibleCoupon[];
  timestamp?: string;
}

export interface CouponRequest {
  code: string;
}

export interface ApplyCouponResponseData {
  couponCode: string;
  discountAmount: number;
  cartSubtotal: number;
  taxAmount: number;
  deliveryCharge: number;
  newGrandTotal: number;
  grandTotal: number;
}

export interface CouponResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApplyCouponResponseData;
  timestamp?: string;
}
