/**
 * HINCH MART — Complete CustomerBackend API Type Definitions
 * Covers all 21 API Controllers:
 * Customer, Addresses, Categories, Subcategories, Brands, Products,
 * Cart, Checkout, Orders, Reviews, Wishlist, Wallet, User Profile,
 * Banners, Chat, Support Tickets, Rentals, RFQ, Blog, News, Search.
 */

// ── 1. Standard Response Envelope ──────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  pagination?: ApiPagination;
  timestamp?: string;
  errors?: Array<{ field?: string; message: string }>;
}

export interface ApiPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ── 2. Customer (/api/customers) ───────────────────────────────────────────
export interface ApiCustomer {
  customerId: number | string;
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
}

export interface CustomerCreateRequest {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  gstNumber?: string;
  businessType?: string;
  address?: string;
}

// ── 2.5 Stores (/api/stores) ───────────────────────────────────────────────
export interface StoreResponse {
  storeId: number;
  sellerId: number;
  sellerName?: string;
  sellerCompanyName?: string | null;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  rating?: number;
  reviewCount?: number;
  totalReviews?: number;
  status: 'ACTIVE' | 'INACTIVE' | string;
  minOrderValue?: number;
  serviceRadiusKm?: number;
  latitude?: number | null;
  longitude?: number | null;
  commissionRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ── 3. Addresses (/api/addresses) ──────────────────────────────────────────
export interface ApiAddress {
  addressId: number | string;
  id?: number | string;
  siteName: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  houseFlatNo?: string;
  areaLocality?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  addressType?: 'WORK' | 'HOME' | string;
  isDefault: boolean;
  hasHeavyVehicleAccess: boolean;
  createdAt?: string;
}

export interface AddressCreateRequest {
  siteName: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  houseFlatNo?: string;
  areaLocality?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  addressType?: 'WORK' | 'HOME' | string;
  isDefault?: boolean;
  hasHeavyVehicleAccess?: boolean;
}

export type AddressUpdateRequest = AddressCreateRequest;

// ── 4. Checkout (/api/checkout) ────────────────────────────────────────────
export interface CheckoutPreviewRequest {
  addressId: number | string;
  deliverySlot?: string;
  requiresCraneUnloading?: boolean;
}

export interface CheckoutPreviewResponse {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  freightCharge: number;
  craneUnloadingCharge: number;
  grandTotal: number;
}

// ── 5. Orders & Invoices (/api/orders) ──────────────────────────────────────
export interface OrderTrackingCheckpoint {
  status: string;
  title: string;
  location: string;
  timestamp: string;
  description?: string;
}

export interface OrderTrackingResponse {
  orderId: number | string;
  orderNumber: string;
  carrierName?: string;
  vehicleNumber?: string;
  driverName?: string;
  trackingNumber?: string;
  currentStatus: string;
  estimatedDelivery?: string;
  checkpoints: OrderTrackingCheckpoint[];
}

export interface UpdateOrderStatusRequest {
  status: 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  location?: string;
  description?: string;
}

export interface CancelOrderRequest {
  location?: string;
  description?: string;
}

// ── 5.5 Payments (Razorpay) (/api/payments) ────────────────────────────────
export interface PaymentOrderRequest {
  // Option A: Direct from Cart/Checkout (Recommended)
  addressId?: number | string;
  deliverySlot?: string;
  requiresCraneUnloading?: boolean;
  // Option B: For an Existing Order (Retry/Post-order)
  orderId?: number | string;
  // Option C: Wallet Top-up
  amount?: number;
  purpose?: 'CHECKOUT' | 'ORDER_PAYMENT' | 'WALLET_TOPUP' | 'CART_PAYMENT' | string;
  currency?: string;
  orderForSomeoneElse?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
}

export interface PaymentOrderResponse {
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  amountInPaise?: number;
  currency: string;
  orderId?: number | string | null;
  orderNumber?: string | null;
  purpose?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  paymentId?: number | string;
  orderForSomeoneElse?: boolean;
  recipientName?: string;
  recipientPhone?: string;
}

export interface PaymentVerifyRequest {
  orderId?: number | string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaymentStatusResponse {
  paymentId: number | string;
  customerId?: number | string;
  customerName?: string;
  customerPhone?: string;
  orderId?: number | string;
  orderNumber?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  status: 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | string;
  amount: number;
  currency: string;
  purpose?: string;
  paymentMethod?: string;
  email?: string;
  contact?: string;
  vpa?: string | null;
  bank?: string | null;
  cardNetwork?: string | null;
  cardLast4?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export type PaymentVerifyResponse = PaymentStatusResponse;

// ── 6. Reviews (/api/reviews) ──────────────────────────────────────────────
export interface ApiReview {
  id: number | string;
  reviewId?: number | string;
  productId: number | string;
  productTitle?: string;
  customerId?: number | string;
  customerName?: string;
  orderId?: number | string;
  orderItemId?: number | string;
  rating: number;
  title: string;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  helpfulCount?: number;
  helpfulVotes?: number;
  verifiedPurchase?: boolean;
  imageUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReviewRequest {
  productId?: number | string;
  orderId?: number | string;
  orderItemId?: number | string;
  rating: number;
  title: string;
  comment: string;
  imageUrls?: string[];
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

export interface ProductReviewSummary {
  productId: number | string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [star: string]: number;
  };
}

export interface ApiWalletInfo {
  walletId: number | string;
  customerId?: number | string;
  userId?: number | string;
  balance: number;
  currency: string;
  rewardPoints?: number;
  loyaltyPoints?: number;
  tier?: string;
  active?: boolean;
  creditLimit?: number;
  availableCredit?: number;
  status?: string;
  updatedAt?: string;
}

export interface ApiWalletTransaction {
  id?: string | number;
  transactionId?: number | string;
  type: 'CREDIT' | 'DEBIT' | 'CASHBACK' | 'REFUND';
  amount: number;
  description: string;
  referenceId?: string;
  status?: string;
  createdAt: string;
}

export interface ApiWalletReward {
  voucherId?: number | string;
  code?: string;
  discountType?: 'FLAT' | 'PERCENT' | 'PERCENTAGE' | string;
  discountValue?: number;
  discountAmount?: number;
  minOrderValue?: number;
  expiresAt?: string;
  used?: boolean;
  isUsed?: boolean;
  points?: number;
  cashbackEarned?: number;
  tier?: string;
  expiringPoints?: number;
}
export type ApiWalletRewards = ApiWalletReward;

export interface WalletTopupRequest {
  amount: number;
  description?: string;
  paymentMethod?: string;
}

// ── 8. Chat (/api/chat) ────────────────────────────────────────────────────
export interface ApiChatConversation {
  conversationId: number | string;
  sellerId: number | string;
  sellerName?: string;
  topic?: 'PRODUCT' | 'ORDER' | 'RFQ' | 'GENERAL';
  referenceId?: string;
  title: string;
  lastMessage?: string;
  unreadCount: number;
  createdAt: string;
}

export interface ApiChatMessage {
  messageId: number | string;
  conversationId: number | string;
  senderId: number | string;
  senderRole: 'BUYER' | 'SELLER' | 'ADMIN';
  content: string;
  sentAt: string;
}

export interface StartConversationRequest {
  sellerId: number | string;
  topic?: 'PRODUCT' | 'ORDER' | 'RFQ' | 'GENERAL';
  referenceId?: string;
  title: string;
  initialMessage: string;
}

export interface SendMessageRequest {
  content: string;
}

// ── 9. Support Tickets (/api/help) ─────────────────────────────────────────
export type TicketCategory = 'DELIVERY' | 'PAYMENT' | 'QUALITY' | 'RFQ' | 'TECHNICAL' | 'GENERAL';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketSenderRole = 'USER' | 'SUPPORT_AGENT' | 'ADMIN' | 'SUPPORT' | 'CUSTOMER';

export interface TicketMessage {
  id?: number | string;
  messageId: number | string;
  ticketId?: number | string;
  senderId?: number | string;
  senderRole?: TicketSenderRole;
  senderType?: TicketSenderRole;
  senderName?: string;
  content: string;
  message?: string;
  attachmentUrl?: string | null;
  timestamp?: string;
  sentAt?: string;
  createdAt?: string;
}

export interface ApiSupportTicket {
  id?: number | string;
  ticketId: number | string;
  ticketNumber: string;
  userId: number | string;
  subject: string;
  description?: string;
  lastMessage?: string;
  category: TicketCategory | string;
  priority: TicketPriority | string;
  status: TicketStatus | string;
  orderId?: number | string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTicketRequest {
  subject: string;
  category: TicketCategory | string;
  priority?: TicketPriority;
  orderId?: number | string;
  message?: string;
  description?: string;
}

export interface ReplyTicketRequest {
  content: string;
  attachmentUrl?: string | null;
  message?: string;
}

// ── 10. Rentals (/api/rentals) ─────────────────────────────────────────────
export interface ApiRentalEquipment {
  equipmentId: number | string;
  name: string;
  category: string;
  description: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  location: string;
  available: boolean;
  imageUrl?: string;
}

export interface RentalAvailabilityResponse {
  equipmentId: number | string;
  available: boolean;
  totalDays: number;
  estimatedCost: number;
  conflictingBookings: any[];
}

export interface RentalBookingRequest {
  equipmentId: number | string;
  startDate: string;
  endDate: string;
  deliveryAddress?: string;
  siteAddress?: string;
  notes?: string;
  operatorRequired?: boolean;
  includeOperator?: boolean;
}

export interface RentalBookingResponse {
  bookingId: number | string;
  id?: number | string;
  bookingNumber?: string;
  bookingReference?: string;
  equipmentId: number | string;
  equipmentName?: string;
  customerId?: number | string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate?: number;
  totalCost: number;
  deliveryAddress?: string;
  siteAddress?: string;
  notes?: string;
  operatorRequired?: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | string;
  createdAt?: string;
}

// ── 11. Blog & Articles (/api/blog) ────────────────────────────────────────
export interface ApiBlogArticle {
  id: number | string;
  title: string;
  slug: string;
  category: string;
  tags?: string[];
  summary: string;
  content?: string;
  imageUrl?: string;
  publishedAt: string;
}

// ── 12. News Feed (/api/news) ──────────────────────────────────────────────
export interface ApiNewsItem {
  id?: number | string;
  newsId?: number | string;
  title: string;
  category: string;
  summary?: string;
  content: string;
  source?: string;
  priceChangePercentage?: number;
  trendDirection?: 'UP' | 'DOWN' | 'STABLE' | string;
  imageUrl?: string;
  publishedAt: string;
}

// ── 12.5 Customer Documents (KYC) (/api/customer/documents) ───────────────
export interface CustomerDocument {
  id?: number | string;
  documentId?: number | string;
  customerId?: number | string;
  documentType: 'GST_CERTIFICATE' | 'PAN_CARD' | 'TRADE_LICENSE' | string;
  documentUrl: string;
  documentNumber: string;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | string;
  createdAt?: string;
}
export type CustomerDocumentResponse = CustomerDocument;

// ── 13. Search Suggestions (/api/search) ───────────────────────────────────
export interface SearchSuggestionsResponse {
  products: Array<{
    productId: number | string;
    title: string;
    imageUrl?: string;
    category?: string;
    price?: number;
  }>;
  categories: Array<{
    categoryId: number | string;
    name: string;
  }>;
  brands: Array<{
    brandId: number | string;
    name: string;
  }>;
}

// ── 14. Hot Deals for Home Screen (/api/home/hot-deals) ─────────────────────
export interface HotDealProduct {
  productId: number | string;
  name?: string;
  productName?: string;
  description?: string;
  price: number;
  mrp?: number;
  stockQuantity?: number;
  imageUrl?: string;
  categoryName?: string;
  displayOrder?: number;
  active?: boolean;
  [key: string]: any;
}

export interface HotDealsResponse {
  section: string;
  products: HotDealProduct[];
}
