/**
 * HINCH MART — Category & Subcategory Live API Types
 * Matches backend endpoints at https://api.hinchmart.com/api/categories & /api/subcategories
 */

export interface ApiCategory {
  categoryId: number | string;
  id?: number | string;
  name: string;
  slug: string;
  imageUrl: string;
  description?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  // UI helper fields
  subCategories?: ApiSubcategory[];
  productCount?: number | string;
  iconName?: string;
  color?: string;
  gradient?: [string, string];
}

export interface CategoryCreateRequest {
  name: string;
  slug: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
}

export interface CategoryUpdateRequest {
  name?: string;
  slug?: string;
  imageUrl?: string;
  active?: boolean;
  sortOrder?: number;
}

export interface ApiSubcategory {
  subcategoryId?: number | string;
  id?: number | string;
  categoryId: number | string;
  name: string;
  slug: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  // UI helper fields
  productCount?: number | string;
}

export interface SubcategoryCreateRequest {
  categoryId: number;
  name: string;
  slug: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
}

export interface SubcategoryUpdateRequest {
  categoryId?: number;
  name?: string;
  slug?: string;
  imageUrl?: string;
  active?: boolean;
  sortOrder?: number;
}
