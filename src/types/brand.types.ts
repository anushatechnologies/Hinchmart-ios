/**
 * HINCH MART — 4-Tier Catalog Hierarchy & Brand Types
 * Matches backend 4-tier drilldown: Category -> Subcategory -> Brand -> Product
 */

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  timestamp: string;
}

// 1. Tier 1: Category
export interface Category {
  categoryId: number | string;
  name: string;
  slug: string;
  imageUrl?: string;
  sortOrder?: number;
  active: boolean;
  productCount?: number;
  subcategories?: Subcategory[];
}

// 2. Tier 2: Subcategory
export interface Subcategory {
  subcategoryId: number | string;
  categoryId: number | string;
  categoryName?: string;
  name: string;
  slug: string;
  imageUrl?: string;
  sortOrder?: number;
  active: boolean;
  productCount?: number;
  brands?: Brand[];
}

// 3. Tier 3: Brand
export interface Brand {
  brandId: number | string;
  id?: number | string;
  subcategoryId?: number | string;
  subcategoryName?: string;
  categoryId?: number | string;
  categoryName?: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  logoUrl?: string;
  sortOrder?: number;
  productCount?: number | string;
  active: boolean;
  createdAt?: string;
  tagline?: string;
  badge?: string;
  gradient?: [string, string];
  iconName?: string;
}

export type ApiBrand = Brand;

export interface BrandFilterQuery {
  subcategoryId?: number | string;
  categoryId?: number | string;
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BrandCreateRequest {
  subcategoryId: number;
  name: string;
  slug: string;
  imageUrl?: string;
  active?: boolean;
  sortOrder?: number;
}

export interface BrandUpdateRequest {
  name?: string;
  slug?: string;
  imageUrl?: string;
  active?: boolean;
  sortOrder?: number;
}

// 4. Tier 4: Product
export interface BulkPricingTier {
  tierId?: number | string;
  minQty: number;
  maxQty?: number | null;
  price: number;
  discountPercentage?: number;
}

export interface VendorInfo {
  vendorId: number | string;
  companyName: string;
  city?: string;
  isVerified?: boolean;
  rating?: number;
}

export interface CatalogProduct {
  productId: number | string;
  brandId: number | string;
  brand: string;
  brandName?: string;
  subcategoryId: number | string;
  subcategoryName?: string;
  categoryId: number | string;
  categoryName?: string;
  title: string;
  slug?: string;
  sku?: string;
  description: string;
  imageUrl?: string;
  images?: string[];
  price: number;
  mrp?: number;
  unit: string;
  moq?: number;
  stockQty?: number;
  rating?: number;
  reviewCount?: number;
  gstRate?: number;
  hsnCode?: string;
  is24HourDelivery?: boolean;
  active?: boolean;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  specifications?: Record<string, string>;
  bulkPricingTiers?: BulkPricingTier[];
  vendor?: VendorInfo;
  createdAt?: string;
}
