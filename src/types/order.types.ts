/**
 * HINCH MART — Order Types
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded'
  | 'PAID'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'PAID' | 'PENDING';
export type PaymentMethod = string;

export interface CheckoutPreviewRequest {
  addressId: number | string;
  deliverySlot?: string;
  requiresCraneUnloading?: boolean;
}

export interface CheckoutPreview {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  freightCharge: number;
  craneUnloadingCharge?: number;
  grandTotal: number;
}

export interface CreateOrderRequest {
  deliveryAddressId?: number | string;
  addressId?: number | string;
  paymentMethod: string;
  couponCode?: string;
  deliverySlot?: string;
  deliveryInstructions?: string;
  poNumber?: string;
  requiresCraneUnloading?: boolean;
  orderForSomeoneElse?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
}

export interface CheckoutSummaryResponse {
  subtotal: number;
  discountAmount?: number;
  deliveryFee?: number;
  taxAmount?: number;
  totalAmount: number;
  storeId?: number;
  [key: string]: any;
}

export interface VerifyPaymentRequest {
  orderId: number | string;
  paymentId?: string;
  signature?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  [key: string]: any;
}

export interface LiveOrderItem {
  orderItemId: number | string;
  productId: number | string;
  title: string;
  imageUrl?: string;
  quantity: number;
  unit: string;
  weightKg?: number;
  unitPrice: number;
  originalPrice?: number;
  appliedTier?: string;
  gstRate?: number;
  lineTotal: number;
  lineGst?: number;
}

export interface Order {
  id?: string | number;
  orderId?: string | number;
  orderNumber?: string;
  storeId?: number;
  storeName?: string;
  storeSlug?: string;
  storeInvoiceNumber?: string;
  commissionRate?: number;
  commissionAmount?: number;
  userId?: string;
  totalAmount?: number;
  subtotal?: number;
  discount?: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalGst?: number;
  freightCharge?: number;
  craneUnloadingCharge?: number;
  totalWeightKg?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  status?: string;
  poNumber?: string;
  deliverySlot?: string;
  deliveryInstructions?: string;
  requiresCraneUnloading?: boolean;
  itemCount?: number;
  firstItemTitle?: string;
  firstItemImage?: string;
  items?: any[];
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingCost?: number;
  tax?: number;
  walletUsed?: number;
  total?: number;
  grandTotal?: number;
  currency?: string;
  couponCode?: string | null;
  tracking?: TrackingInfo | null;
  timeline?: OrderTimeline[];
  notes?: string;
  orderForSomeoneElse?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  invoice?: InvoiceInfo | null;
  createdAt?: string;
  updatedAt?: string;
  estimatedDelivery?: string;
}

export interface OrderItem {
  id?: string | number;
  orderItemId?: string | number;
  productId: string | number;
  productName?: string;
  title?: string;
  productImage?: string;
  imageUrl?: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  lineTotal?: number;
  unit?: string;
  originalPrice?: number;
  appliedTier?: string;
  gstRate?: number;
  lineGst?: number;
  sku?: string;
}

export interface Address {
  id: string | number;
  label?: string;
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface TrackingInfo {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  currentStatus?: string;
  currentLocation?: string;
  estimatedDelivery?: string;
  updates?: TrackingUpdate[];
  status?: string;
}

export interface TrackingUpdate {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface InvoiceInfo {
  id?: string | number;
  invoiceNumber?: string;
  url: string;
  generatedAt?: string;
}

export interface ReturnRequest {
  orderId: string | number;
  itemIds: string[];
  reason: string;
  description: string;
  images: string[];
  refundMethod: 'original' | 'wallet';
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  estimatedDays: string;
  cost: number;
  isFree: boolean;
  icon: string;
}
