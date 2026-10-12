/**
 * HINCH MART — Live Banner Type Definitions
 * Represents live promotional and hero banners from /api/banners
 */

export type BannerPosition =
  | 'HOME_HERO'
  | 'PROMO_STRIP'
  | 'POPUP'
  | 'CATEGORY_TOP'
  | 'OFFER_CARD'
  | 'HOME_VIDEO'
  | 'PROMO_VIDEO'
  | string;

export type BannerLinkType =
  | 'CATEGORY'
  | 'PRODUCT'
  | 'URL'
  | 'EXTERNAL'
  | 'SCREEN'
  | 'VIDEO'
  | string;

export interface ApiBanner {
  bannerId: number | string;
  id?: number | string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  image?: string;
  videoUrl?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | string;
  ctaText?: string;
  linkType?: BannerLinkType;
  linkValue?: string;
  position?: BannerPosition;
  sortOrder?: number;
  active?: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;

  // Frontend presentation enrichments
  badge?: string;
  gradient?: readonly [string, string, ...string[]];
  screen?: string;
  targetScreen?: string;
  actionParams?: Record<string, any>;
  isPromotionalVideo?: boolean;
}

export interface ActivePromotionalVideoData {
  id: number | string;
  videoUrl: string;
  posterUrl?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  ctaText?: string;
  targetScreen?: string;
  isActive: boolean;
}

export interface BannerCreateRequest {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | string;
  ctaText?: string;
  linkType?: BannerLinkType;
  linkValue?: string;
  position?: BannerPosition;
  sortOrder?: number;
  active?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface BannerUpdateRequest {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | string;
  ctaText?: string;
  linkType?: BannerLinkType;
  linkValue?: string;
  position?: BannerPosition;
  sortOrder?: number;
  active?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface BannerQueryParams {
  active?: boolean;
  position?: BannerPosition;
}

export interface BannerApiResponse<T = ApiBanner | ApiBanner[]> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp?: string;
}

