/**
 * HINCH MART — User Types (Profile, Wallet, Notifications)
 */
import { Address } from './order.types';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string | null;
  addresses: Address[];
  defaultAddressId: string | null;
  language: string;
  currency: string;
  timezone: string;
  measurementUnit: 'metric' | 'imperial';
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  priceAlerts: boolean;
  rfqUpdates: boolean;
  chatMessages: boolean;
  newsletter: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface WalletInfo {
  balance: number;
  currency: string;
  totalEarned: number;
  totalSpent: number;
  pendingCashback: number;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  reference: string;
  category: 'cashback' | 'reward' | 'refund' | 'purchase' | 'topup';
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  points: number;
  type: 'discount' | 'cashback' | 'freeShipping' | 'gift';
  expiresAt: string;
  isRedeemed: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'promotion' | 'rfq' | 'chat' | 'system' | 'price_alert';
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
  image?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  participantType: 'vendor' | 'support';
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface RentalProduct {
  id: string;
  name: string;
  description: string;
  images: string[];
  category: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  currency: string;
  availability: RentalAvailability[];
  location: string;
  vendor: { id: string; name: string; logo: string };
  specifications: Record<string, string>;
  rating: number;
  reviewCount: number;
}

export interface RentalAvailability {
  date: string;
  isAvailable: boolean;
}

export interface RentalBooking {
  id: string;
  rentalProductId: string;
  productName: string;
  productImage: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalCost: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  deliveryAddress: string;
  notes: string;
  createdAt: string;
}

export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: { name: string; avatar: string };
  category: string;
  tags: string[];
  readTime: number;
  publishedAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  source: string;
  url: string;
  category: string;
  publishedAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  isStaff: boolean;
  content: string;
  attachments: string[];
  createdAt: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'acknowledged' | 'completed';
  approvalFlow: ApprovalStep[];
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface ApprovalStep {
  id: string;
  approverName: string;
  approverRole: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
  actionAt: string | null;
}
