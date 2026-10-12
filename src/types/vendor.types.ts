/**
 * HINCH MART — Vendor Types
 */

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  address: VendorAddress;
  rating: number;
  reviewCount: number;
  productCount: number;
  orderCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  categories: string[];
  certifications: string[];
  minimumOrder: number;
  currency: string;
  responseTime: string;
  memberSince: string;
  performance: VendorPerformance;
}

export interface VendorAddress {
  city: string;
  state: string;
  country: string;
  fullAddress: string;
}

export interface VendorPerformance {
  onTimeDelivery: number;
  qualityScore: number;
  responseRate: number;
  fulfillmentRate: number;
  returnRate: number;
}

export interface VendorDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  activeProducts: number;
  averageRating: number;
  revenueChange: number;
  ordersChange: number;
  chartData: ChartDataPoint[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface VendorPayment {
  id: string;
  orderId: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paidAt: string | null;
  createdAt: string;
}
