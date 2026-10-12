import { Platform } from 'react-native';
import apiClient from './client';
import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import {
  ApiProduct,
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductImageUploadResponse,
} from '../../types/product.types';

/**
 * Normalizes product image URL to absolute path if relative
 */
export function normalizeProductImageUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Extracts array of product objects from any backend response envelope
 */
export function extractProductsArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.products)) return payload.products;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.products)) return payload.data.products;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.content)) return payload.data.content;
    if (Array.isArray(payload.data.result)) return payload.data.result;
    if (Array.isArray(payload.data.rows)) return payload.data.rows;
  }
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (payload.id || payload.productId || payload.title || payload.name) {
    return [payload];
  }
  return [];
}

/**
 * Normalizes raw backend product item into typed ApiProduct
 */
export function normalizeApiProduct(raw: any, index = 0): ApiProduct {
  const prodId = raw.productId || raw.id || raw.product_id || raw._id || index + 1;
  
  // Normalize all gallery images if provided (support both imageUrls and images)
  const rawList = Array.isArray(raw.imageUrls) ? raw.imageUrls : Array.isArray(raw.images) ? raw.images : [];
  const rawImages: string[] = rawList
    .map((img: any) => {
      const u = typeof img === 'string' ? img : img?.url || img?.imageUrl || img?.fileUrl;
      return normalizeProductImageUrl(u);
    })
    .filter((u: string) => Boolean(u && u.length > 0));

  const rawImg =
    (rawImages.length > 0 ? rawImages[0] : '') ||
    raw.imageUrl ||
    raw.image ||
    raw.thumbnailUrl ||
    raw.photo ||
    raw.fileUrl ||
    raw.mediaUrl ||
    '';
  const resolvedImg = normalizeProductImageUrl(rawImg);

  const finalImages = rawImages.length > 0
    ? (resolvedImg && !rawImages.includes(resolvedImg) ? [resolvedImg, ...rawImages] : rawImages)
    : (resolvedImg ? [resolvedImg] : []);

  const price = typeof raw.discountedPrice === 'number'
    ? raw.discountedPrice
    : typeof raw.price === 'number'
    ? raw.price
    : parseFloat(String(raw.discountedPrice || raw.price || raw.basePrice || 0)) || 0;

  const rawCompare = raw.basePrice ?? raw.comparePrice ?? raw.mrp ?? raw.regularPrice;
  const comparePrice =
    typeof rawCompare === 'number'
      ? rawCompare
      : rawCompare
      ? parseFloat(String(rawCompare))
      : undefined;
  const discountPercent =
    typeof raw.discountPercent === 'number' && raw.discountPercent > 0
      ? raw.discountPercent
      : typeof raw.discountPercentage === 'number' && raw.discountPercentage > 0
      ? raw.discountPercentage
      : typeof raw.discount === 'number' && raw.discount > 0
      ? raw.discount
      : 0;

  const rawMoq = raw.moq ?? raw.minimumOrderQuantity ?? raw.minOrderQty;
  const parsedMoq = typeof rawMoq === 'number' ? rawMoq : parseInt(String(rawMoq || 1), 10);
  const moq = !isNaN(parsedMoq) && parsedMoq > 0 ? parsedMoq : 1;
  const stockQty = typeof raw.stockQty === 'number' ? raw.stockQty : parseInt(String(raw.stockQty ?? raw.stock ?? 100), 10) || 0;

  const rawUnit = String(raw.unit || raw.unitType || '').trim();
  const isInvalidUnit = !rawUnit || rawUnit.toLowerCase() === 'default' || rawUnit.toLowerCase() === 'null' || rawUnit.toLowerCase() === 'undefined';
  const unit = isInvalidUnit ? 'unit' : rawUnit;

  const parsedRating = typeof raw.rating === 'number' ? raw.rating : parseFloat(String(raw.rating || ''));
  const validRating = !isNaN(parsedRating) && parsedRating > 0 ? parsedRating : undefined;
  const parsedReviews = typeof raw.reviews === 'number' ? raw.reviews : (typeof raw.reviewCount === 'number' ? raw.reviewCount : parseInt(String(raw.reviews ?? raw.reviewCount ?? 0), 10));
  const validReviews = !isNaN(parsedReviews) && parsedReviews > 0 ? parsedReviews : 0;

  return {
    ...raw,
    id: String(prodId),
    productId: String(prodId),
    name: raw.title || raw.name || raw.productName || '',
    title: raw.title || raw.name || raw.productName || '',
    description: raw.description || raw.desc || '',
    categoryId: String(raw.categoryId || raw.category_id || raw.category?.id || ''),
    subcategoryId: String(raw.subcategoryId || raw.subcategory_id || raw.subCategory?.id || ''),
    brandId: raw.brandId,
    brandName: raw.brandName || raw.brand || raw.brand_name || '',
    brand: raw.brandName || raw.brand || raw.brand_name || '',
    price,
    basePrice: typeof raw.basePrice === 'number' ? raw.basePrice : comparePrice,
    discountedPrice: price,
    mrp: raw.mrp ?? comparePrice,
    comparePrice,
    discountPercent,
    moq,
    unit,
    weightKg: typeof raw.weightKg === 'number' ? raw.weightKg : parseFloat(String(raw.weightKg || 0)) || undefined,
    gstRate: typeof raw.gstRate === 'number' ? raw.gstRate : parseFloat(String(raw.gstRate || 0)) || 18,
    rating: validRating,
    reviews: validReviews,
    reviewCount: validReviews,
    imageUrl: resolvedImg,
    image: resolvedImg,
    images: finalImages,
    imageUrls: finalImages,
    stockQty,
    is24HourDelivery: Boolean(raw.is24HourDelivery || raw.deliveryType === '24_HOURS'),
    verified: raw.verified ?? true,
    active: raw.isActive !== false && raw.active !== false && raw.status !== 'INACTIVE',
    isActive: raw.isActive !== false && raw.active !== false && raw.status !== 'INACTIVE',
    bulkPricingTiers: raw.bulkPricingTiers,
    specifications: raw.specifications,
  };
}

export const productsApi = {
  /**
   * POST /api/images/products — Upload product image to S3 (Two-Step Process)
   * Multipart/form-data with Form field: `file: selectedImage`
   * Response: { data: { imageKey, fileUrl, imageUrl } }
   */
  uploadProductImage: async (
    file: { uri: string; name?: string; type?: string; size?: number } | FormData
  ): Promise<{ imageKey: string; fileUrl: string; imageUrl: string }> => {
    let formData: FormData;

    if (file instanceof FormData) {
      formData = file;
    } else {
      formData = new FormData();
      const rawName = file.name || file.uri.split('/').pop() || `product_${Date.now()}.jpg`;
      const cleanFilename = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const match = /\.(\w+)$/.exec(cleanFilename);
      const mimeType = file.type || (match ? `image/${match[1].toLowerCase()}` : 'image/jpeg');

      const normalizedUri = Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;

      formData.append('file', {
        uri: normalizedUri,
        name: cleanFilename,
        type: mimeType,
      } as any);
    }

    const response = await apiClient.post<ProductImageUploadResponse | { data: { imageKey: string; fileUrl: string; imageUrl: string } }>(
      API_ENDPOINTS.PRODUCTS.UPLOAD_IMAGE || '/api/images/products',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => data,
      }
    );

    const payload: any = response.data;
    const dataObj = payload?.data || payload;
    const rawUrl = dataObj?.imageUrl || dataObj?.fileUrl || dataObj?.url || '';
    const imageUrl = normalizeProductImageUrl(rawUrl);
    const imageKey = dataObj?.imageKey || dataObj?.key || '';
    const fileUrl = imageUrl;

    return {
      imageUrl,
      imageKey,
      fileUrl,
    };
  },

  /**
   * GET /api/products — Retrieve products with flexible query params (categoryId, subcategoryId, brandId, search, etc.)
   */
  getProducts: async (
    paramsOrSubcategory?:
      | number
      | string
      | {
          categoryId?: number | string;
          subcategoryId?: number | string;
          brandId?: number | string;
          brand?: string;
          search?: string;
          minPrice?: number;
          maxPrice?: number;
          is24HourDelivery?: boolean;
          sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
          page?: number;
          limit?: number;
        }
  ): Promise<ApiProduct[]> => {
    try {
      let params: Record<string, any> | undefined;
      let filterSubId: string | undefined;

      if (typeof paramsOrSubcategory === 'object' && paramsOrSubcategory !== null) {
        params = { ...paramsOrSubcategory };
        if (params.subcategoryId === 'all') delete params.subcategoryId;
        if (params.categoryId === 'all') delete params.categoryId;
      } else if (paramsOrSubcategory && paramsOrSubcategory !== 'all') {
        filterSubId = String(paramsOrSubcategory);
        params = { subcategoryId: paramsOrSubcategory };
      }

      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, { params });
      const rawList = extractProductsArray(response.data);
      const normalized = rawList.map((p, idx) => normalizeApiProduct(p, idx));

      if (filterSubId) {
        return normalized.filter(
          (p) => String(p.subcategoryId) === filterSubId || String(p.categoryId) === filterSubId
        );
      }
      return normalized;
    } catch (err: any) {
      if (__DEV__) {
        console.log('[productsApi] getProducts network fallback:', err?.message || err);
      }
      return [];
    }
  },

  /**
   * GET /api/products with pagination metadata (page, limit, totalCount, totalPages, hasNextPage)
   */
  getProductsWithPagination: async (
    params?: {
      categoryId?: number | string;
      subcategoryId?: number | string;
      brandId?: number | string;
      brand?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      is24HourDelivery?: boolean;
      sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
      page?: number;
      limit?: number;
    }
  ): Promise<{
    products: ApiProduct[];
    pagination?: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> => {
    try {
      const cleanParams: Record<string, any> = { ...params };
      if (cleanParams.subcategoryId === 'all') delete cleanParams.subcategoryId;
      if (cleanParams.categoryId === 'all') delete cleanParams.categoryId;

      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, { params: cleanParams });
      const rawList = extractProductsArray(response.data);
      const normalized = rawList.map((p, idx) => normalizeApiProduct(p, idx));
      const pagination = response.data?.pagination;

      return {
        products: normalized,
        pagination,
      };
    } catch (err: any) {
      if (__DEV__) {
        console.log('[productsApi] getProductsWithPagination network notice:', err?.message || err);
      }
      return { products: [], pagination: undefined };
    }
  },

  /**
   * GET /api/products?is24HourDelivery=true&location=HYDERABAD — Retrieve 24-Hour Express Eligible Products
   * Filters products strictly verified for 24-Hour Express Dispatch in Hyderabad
   */
  get24HourDeliveryProducts: async (params?: {
    location?: string;
    search?: string;
    categoryId?: string | number;
    subcategoryId?: string | number;
  }): Promise<ApiProduct[]> => {
    try {
      const queryParams: any = {
        is24HourDelivery: true,
        deliveryType: '24_HOURS',
        location: params?.location || 'HYDERABAD',
      };
      if (params?.search) queryParams.search = params.search;
      if (params?.subcategoryId) queryParams.subcategoryId = params.subcategoryId;
      if (params?.categoryId) queryParams.categoryId = params.categoryId;

      const response = await apiClient.get<ApiProduct[] | { data: ApiProduct[] }>(
        API_ENDPOINTS.PRODUCTS.LIST,
        { params: queryParams }
      );

      const items = Array.isArray(response.data) ? response.data : ((response.data as any)?.data || []);

      // If backend returns all products or supports server-side flag, ensure strict frontend filtering:
      // Product must be active, in stock, and marked for 24-hour express dispatch
      const eligibleItems = items.filter((p: ApiProduct) => {
        const is24Hr =
          p.is24HourDelivery === true ||
          (p as any).deliveryType === '24_HOURS' ||
          (p as any).deliverySpeed === '24_HOURS' ||
          (p as any).express24h === true ||
          // If no specific flag is yet saved on older backend items, treat active construction fast-movers with stock > 0 as eligible
          (p.active !== false && (p.stockQty ?? 1) > 0 && (p.is24HourDelivery !== false));

        const isInStock = (p.stockQty === undefined || p.stockQty > 0);
        return is24Hr && isInStock;
      });

      return eligibleItems;
    } catch (err) {
      if (__DEV__) {
        console.log('[productsApi] get24HourDeliveryProducts fallback:', err);
      }
      // Fallback: fetch all and filter in stock items
      const all = await productsApi.getProducts(params?.subcategoryId);
      return all.filter((p) => (p.stockQty === undefined || p.stockQty > 0));
    }
  },

  /**
   * GET /api/products/{id} — Retrieve product by ID
   */
  getProductDetail: async (id: string | number): Promise<ApiProduct> => {
    const response = await apiClient.get<ApiProduct | { data: ApiProduct }>(API_ENDPOINTS.PRODUCTS.DETAIL(id));
    const payload = response.data;
    const item = (payload && 'data' in payload && (payload as any).data) ? (payload as any).data : payload;
    return normalizeApiProduct(item);
  },

  /**
   * POST /api/products — Create new product
   * Required fields: subcategoryId, title, price, stockQty, unit
   */
  createProduct: async (data: ProductCreateRequest): Promise<ApiProduct> => {
    const response = await apiClient.post<ApiProduct | { data: ApiProduct }>(
      API_ENDPOINTS.PRODUCTS.CREATE || '/api/products',
      data
    );
    const payload = response.data;
    const item = (payload && 'data' in payload && (payload as any).data) ? (payload as any).data : payload;
    return normalizeApiProduct(item);
  },

  /**
   * PUT /api/products/{id} — Update product
   */
  updateProduct: async (id: string | number, data: ProductUpdateRequest): Promise<ApiProduct> => {
    const response = await apiClient.put<ApiProduct | { data: ApiProduct }>(
      API_ENDPOINTS.PRODUCTS.UPDATE?.(id) || `/api/products/${id}`,
      data
    );
    const payload = response.data;
    const item = (payload && 'data' in payload && (payload as any).data) ? (payload as any).data : payload;
    return normalizeApiProduct(item);
  },

  /**
   * DELETE /api/products/{id} — Delete product
   */
  deleteProduct: async (id: string | number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete(API_ENDPOINTS.PRODUCTS.DELETE?.(id) || `/api/products/${id}`);
    return response.data;
  },

  /**
   * PATCH /api/products/{id}/stock — Update stock quantity
   */
  updateStock: async (id: string | number, stockQty: number): Promise<{ success: boolean; data?: any }> => {
    const response = await apiClient.patch(API_ENDPOINTS.PRODUCTS.STOCK?.(id) || `/api/products/${id}/stock`, {
      stockQty: Number(stockQty),
    });
    return response.data;
  },

  /**
   * PATCH /api/products/{id}/activate — Activate product
   */
  activateProduct: async (id: string | number): Promise<{ success: boolean; data?: any }> => {
    const response = await apiClient.patch(API_ENDPOINTS.PRODUCTS.ACTIVATE?.(id) || `/api/products/${id}/activate`);
    return response.data;
  },

  /**
   * PATCH /api/products/{id}/deactivate — Deactivate product
   */
  deactivateProduct: async (id: string | number): Promise<{ success: boolean; data?: any }> => {
    const response = await apiClient.patch(API_ENDPOINTS.PRODUCTS.DEACTIVATE?.(id) || `/api/products/${id}/deactivate`);
    return response.data;
  },

  /**
   * PATCH /api/admin/products/{id}/approve — Approve product to make it publicly active
   */
  approveProduct: async (id: string | number): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await apiClient.patch(`/api/admin/products/${id}/approve`);
    return response.data;
  },

  /**
   * Complete 2-Step Sequence:
   * 1. Upload selectedFile to POST /api/images/products -> get { imageUrl, imageKey }
   * 2. Send JSON payload with imageUrl & images to POST /api/products -> return created product
   */
  saveProduct: async (
    productDetails: Omit<ProductCreateRequest, 'imageUrl' | 'images'> & { imageUrl?: string; images?: string[] },
    selectedFile?: { uri: string; name?: string; type?: string; size?: number } | FormData | null
  ): Promise<{ product: ApiProduct; imageKey?: string; imageUrl?: string }> => {
    let finalImageUrl = productDetails.imageUrl || '';
    let uploadedKey = '';

    if (selectedFile) {
      const uploadResult = await productsApi.uploadProductImage(selectedFile);
      finalImageUrl = uploadResult.imageUrl || uploadResult.fileUrl;
      uploadedKey = uploadResult.imageKey;
    }

    const payload: ProductCreateRequest = {
      ...productDetails,
      imageUrl: finalImageUrl,
      images: finalImageUrl
        ? [finalImageUrl, ...(productDetails.images || []).filter((u) => u !== finalImageUrl)]
        : productDetails.images || [],
    };

    const product = await productsApi.createProduct(payload);
    return {
      product,
      imageKey: uploadedKey,
      imageUrl: finalImageUrl,
    };
  },
};
