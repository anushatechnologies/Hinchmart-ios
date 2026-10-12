/**
 * HINCH MART — Cart Types
 */
import { Product, ProductVariant } from './product.types';

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string | null;
  variant?: ProductVariant | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  appliedTier?: string;
  gstRate?: number;
  lineGst?: number;
  unit?: string;
  originalPrice?: number;
  /** Server-assigned cart item ID used for PUT/DELETE mutations */
  cartItemId?: string | number;
}

export interface BackendCartItem {
  cartItemId: string | number;
  productId: string | number;
  title: string;
  productName?: string;
  imageUrl?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  originalPrice?: number;
  appliedTier?: string;
  gstRate?: number;
  lineTotal: number;
  totalPrice?: number;
  lineGst?: number;
  storeId?: number;
}

export interface BackendCart {
  cartId: string | number;
  storeId?: number;
  storeName?: string;
  storeSlug?: string;
  totalItems?: number;
  items: BackendCartItem[];
  subtotal: number;
  couponDiscount: number;
  discountAmount?: number;
  totalGst: number;
  deliveryCharge: number;
  grandTotal: number;
  totalAmount?: number;
  appliedCoupon?: string | null;
}

export interface CartState {
  items: CartItem[];
  storeId?: number | null;
  storeName?: string | null;
  storeSlug?: string | null;
  couponCode: string | null;
  couponDiscount: number;
  walletBalance: number;
  useWallet: boolean;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
  deliveryEstimate: string | null;
  deliveryCharge?: number;
  totalGst?: number;
  grandTotal?: number;
  appliedCoupon?: string | null;
}

export interface CouponValidation {
  isValid: boolean;
  code: string;
  discount: number;
  discountAmount?: number;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed' | 'PERCENTAGE' | 'FLAT' | string;
  maxDiscount?: number;
  message?: string;
}

export interface AddToCartRequest {
  productId: string | number;
  quantity: number;
  variantId?: string;
  storeId?: number | string;
}

export interface UpdateCartItemRequest {
  cartItemId?: string | number;
  productId?: string | number;
  quantity: number;
}
