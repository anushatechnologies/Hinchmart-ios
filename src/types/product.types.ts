/**
 * HINCH MART — Product Types
 */

export interface ApiProduct {
  productId: number | string;
  subcategoryId: number | string;
  categoryId?: number | string;
  title: string;
  description: string;
  price: number;
  mrp?: number;
  stockQty: number;
  unit: string;
  imageUrl: string;
  images?: string[];
  slug?: string;
  sku?: string;
  brand?: string;
  moq?: number;
  is24HourDelivery?: boolean;
  reviewCount?: number;
  gstRate?: number;
  hsnCode?: string;
  specifications?: Record<string, string>;
  bulkPricingTiers?: Array<{
    tierId: number | string;
    minQty: number;
    maxQty: number | null;
    price: number;
    discountPercentage?: number;
  }>;
  vendor?: {
    vendorId: number | string;
    companyName: string;
    city?: string;
    isVerified?: boolean;
    rating?: number;
  };
  active: boolean;
  createdAt?: string;
  // UI helper fields
  id?: string | number;
  name?: string;
  image?: string;
  rating?: number;
  reviews?: number;
  discountPercent?: number;
  savingsText?: string;
  comparePrice?: number;
  verified?: boolean;
}

export interface ProductImageUploadResponse {
  data: {
    imageKey: string;
    fileUrl: string;
    imageUrl: string;
  };
}

export interface ProductCreateRequest {
  subcategoryId: number;
  categoryId?: number;
  title: string;
  price: number;
  stockQty: number;
  unit: string;
  imageUrl?: string;
  images?: string[];
  active?: boolean;
  is24HourDelivery?: boolean;
  slug?: string;
  sku?: string;
  brand?: string;
  description?: string;
  mrp?: number;
  moq?: number;
  rating?: number;
  reviewCount?: number;
  gstRate?: number;
  hsnCode?: string;
  specifications?: Record<string, string>;
  bulkPricingTiers?: ApiProduct['bulkPricingTiers'];
}

export interface ProductUpdateRequest {
  subcategoryId?: number;
  categoryId?: number;
  title?: string;
  price?: number;
  stockQty?: number;
  unit?: string;
  imageUrl?: string;
  images?: string[];
  active?: boolean;
  is24HourDelivery?: boolean;
  slug?: string;
  sku?: string;
  brand?: string;
  description?: string;
  mrp?: number;
  moq?: number;
  rating?: number;
  reviewCount?: number;
  gstRate?: number;
  hsnCode?: string;
  specifications?: Record<string, string>;
  bulkPricingTiers?: ApiProduct['bulkPricingTiers'];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image: string;
  description: string;
  productCount: number;
  parentId: string | null;
  subCategories: SubCategory[];
  order: number;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  parentId: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  images: ProductImage[];
  category: Category;
  subCategory: SubCategory;
  brand: Brand;
  vendor: VendorInfo;
  price: ProductPrice;
  variants: ProductVariant[];
  specifications: ProductSpecification[];
  rating: ProductRating;
  reviewCount: number;
  stock: StockInfo;
  tags: string[];
  isFeatured: boolean;
  isTrending: boolean;
  isDealOfDay: boolean;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  unit: string;
  weight: number;
  weightUnit: 'kg' | 'lb';
  dimensions: ProductDimensions;
  warranty: string;
  returnPolicy: string;
  buyingGuide: string;
  faqs: ProductFAQ[];
  relatedProducts: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  thumbnail: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductPrice {
  amount: number;
  compareAtPrice: number | null;
  currency: string;
  discount: number | null;
  discountType: 'percentage' | 'fixed' | null;
  bulkPricing: BulkPrice[];
}

export interface BulkPrice {
  minQuantity: number;
  maxQuantity: number;
  price: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  attributes: VariantAttribute[];
  price: ProductPrice;
  stock: StockInfo;
  images: ProductImage[];
}

export interface VariantAttribute {
  name: string;
  value: string;
}

export interface ProductSpecification {
  group: string;
  items: SpecificationItem[];
}

export interface SpecificationItem {
  label: string;
  value: string;
}

export interface ProductRating {
  average: number;
  count: number;
  distribution: RatingDistribution;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface StockInfo {
  available: number;
  isInStock: boolean;
  lowStockThreshold: number;
  isLowStock: boolean;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface ProductFAQ {
  id: string;
  question: string;
  answer: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  slug: string;
  description: string;
  productCount: number;
  isVerified: boolean;
}

export interface VendorInfo {
  id: string;
  name: string;
  logo: string;
  rating: number;
  isVerified: boolean;
  location: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
}
