/**
 * HINCH MART — Live Banners API Service
 * Base URL: /api/banners
 * Endpoints:
 * 1. POST   /api/banners         — Create banner
 * 2. GET    /api/banners/{id}    — Get banner by ID
 * 3. GET    /api/banners         — Get banners (filtered by active=true & position)
 * 4. PUT    /api/banners/{id}    — Update banner
 * 5. POST   /api/banners/{id}/image — Upload banner image (multipart/form-data: file)
 * 6. DELETE /api/banners/{id}    — Delete banner
 */
import apiClient from './client';
import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';
import {
  ApiBanner,
  BannerCreateRequest,
  BannerUpdateRequest,
  BannerQueryParams,
  BannerApiResponse,
  BannerPosition,
  ActivePromotionalVideoData,
} from '../../types/banner.types';

/**
 * Normalizes image URL to absolute path if relative
 */
export function normalizeBannerImageUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Extracts array of banner objects from any backend response envelope
 */
function extractBannersArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.banners)) return payload.banners;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.banners)) return payload.data.banners;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.content)) return payload.data.content;
    if (Array.isArray(payload.data.result)) return payload.data.result;
    if (Array.isArray(payload.data.rows)) return payload.data.rows;
  }
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (payload.id || payload.bannerId || payload.imageUrl || payload.image || payload.title) {
    return [payload];
  }
  return [];
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.m3u8', '.mov', '.ogg', '.m4v'];

/**
 * Checks if a given media URL points to a video stream or file
 */
export function isVideoMediaUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase().split('?')[0];
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

/**
 * Determines whether a banner represents a promotional video
 */
export function isPromotionalVideoBanner(banner?: Partial<ApiBanner> | null): boolean {
  if (!banner) return false;
  const pos = String(banner.position || '').toUpperCase();
  if (
    pos === 'HOME_VIDEO' ||
    pos === 'PROMO_VIDEO' ||
    pos === 'PROMOTIONAL_VIDEO' ||
    pos === 'VIDEO'
  ) {
    return true;
  }
  if (banner.videoUrl && banner.videoUrl.trim().length > 0) {
    return true;
  }
  if (isVideoMediaUrl(banner.imageUrl) || isVideoMediaUrl(banner.image)) {
    return true;
  }
  if (String(banner.linkType || '').toUpperCase() === 'VIDEO') {
    return true;
  }
  return false;
}

/**
 * Normalizes raw backend banner item into typed ApiBanner
 */
export function normalizeApiBanner(raw: any, index = 0): ApiBanner {
  const bannerId = raw.bannerId || raw.id || raw.banner_id || raw._id || index + 1;
  const rawImg =
    raw.imageUrl ||
    raw.image ||
    raw.bannerUrl ||
    raw.bannerImage ||
    raw.fileUrl ||
    raw.mediaUrl ||
    raw.url ||
    raw.photo ||
    raw.path ||
    raw.image_url ||
    '';
  const resolvedImg = normalizeBannerImageUrl(rawImg);

  const rawVideo =
    raw.videoUrl ||
    raw.video_url ||
    raw.video ||
    (isVideoMediaUrl(rawImg) ? rawImg : '') ||
    '';
  const resolvedVideo = rawVideo ? normalizeBannerImageUrl(rawVideo) : '';

  const rawPoster =
    raw.posterUrl ||
    raw.poster ||
    raw.thumbnailUrl ||
    raw.thumbnail ||
    raw.previewUrl ||
    (!isVideoMediaUrl(rawImg) ? resolvedImg : '') ||
    '';
  const resolvedPoster = rawPoster ? normalizeBannerImageUrl(rawPoster) : '';

  const rawPosition = String(
    raw.position || raw.bannerPosition || raw.placement || raw.type || raw.location || 'HOME_HERO'
  ).toUpperCase();

  const isVideoPos =
    rawPosition.includes('VIDEO') ||
    rawPosition.includes('DISPATCH') ||
    Boolean(resolvedVideo) ||
    isVideoMediaUrl(rawImg);

  const normalizedPosition: BannerPosition = isVideoPos
    ? 'HOME_VIDEO'
    : rawPosition.includes('HERO') ||
      rawPosition === 'MAIN' ||
      rawPosition === 'TOP' ||
      rawPosition === 'BANNER' ||
      rawPosition === 'HOME'
    ? 'HOME_HERO'
    : rawPosition.includes('PROMO') || rawPosition.includes('STRIP') || rawPosition.includes('DEAL')
    ? 'PROMO_STRIP'
    : rawPosition.includes('POP')
    ? 'POPUP'
    : rawPosition.includes('CAT')
    ? 'CATEGORY_TOP'
    : rawPosition.includes('OFFER')
    ? 'OFFER_CARD'
    : 'HOME_HERO';

  const rawActive = raw.active ?? raw.isActive ?? raw.is_active ?? raw.status;
  let isActive = true;
  if (
    rawActive === false ||
    rawActive === 0 ||
    rawActive === '0' ||
    rawActive === 'false' ||
    rawActive === 'INACTIVE' ||
    rawActive === 'DISABLED' ||
    rawActive === 'PAUSED'
  ) {
    isActive = false;
  }

  const isPromoVid = isVideoPos || Boolean(resolvedVideo);

  return {
    ...raw,
    id: String(bannerId),
    bannerId,
    title: raw.title || raw.name || raw.heading || raw.bannerTitle || 'Special Promotion',
    subtitle: raw.subtitle || raw.subTitle || raw.sub_title || raw.description || '',
    imageUrl: resolvedImg,
    image: resolvedImg,
    videoUrl: resolvedVideo || (isVideoMediaUrl(resolvedImg) ? resolvedImg : undefined),
    posterUrl: resolvedPoster || undefined,
    thumbnailUrl: resolvedPoster || undefined,
    mediaType: isPromoVid ? 'VIDEO' : 'IMAGE',
    isPromotionalVideo: isPromoVid,
    ctaText: raw.ctaText || raw.buttonText || raw.actionText || 'Explore 24H Catalog',
    position: normalizedPosition,
    linkType: (raw.linkType || raw.link_type || raw.actionType || 'CATEGORY').toUpperCase(),
    linkValue: raw.linkValue || raw.link_value || raw.actionValue || raw.target || raw.targetUrl || '',
    sortOrder:
      typeof raw.sortOrder === 'number'
        ? raw.sortOrder
        : parseInt(raw.sort_order ?? raw.order ?? '0', 10) || 0,
    active: isActive,
    isActive,
    badge: raw.badge || raw.tag || raw.discountText || raw.offerText || '',
    targetScreen: raw.targetScreen || (raw.linkType === 'SCREEN' ? raw.linkValue : undefined) || 'TwentyFourHourDelivery',
    startDate: raw.startDate || raw.start_date,
    endDate: raw.endDate || raw.end_date,
  };
}

export const bannersApi = {
  /**
   * GET /api/banners — Retrieve banners from live backend with envelope extraction & multi-endpoint fallbacks
   */
  getBanners: async (params?: BannerQueryParams | string): Promise<ApiBanner[]> => {
    let queryPosition: string | undefined;
    let queryActive: boolean | undefined;

    if (typeof params === 'string') {
      queryPosition = params;
      queryActive = true;
    } else if (params) {
      if (params.active === true) queryActive = true;
      if (params.position) queryPosition = params.position;
    }

    let rawList: any[] = [];

    // Attempt 1: Fetch with query params from /api/banners
    try {
      const qParams: Record<string, any> = {};
      if (queryActive) qParams.active = true;
      if (queryPosition) qParams.position = queryPosition;

      const response = await apiClient.get(API_ENDPOINTS.BANNERS.LIST, {
        params: Object.keys(qParams).length > 0 ? qParams : undefined,
      });
      rawList = extractBannersArray(response.data);
    } catch (err: any) {
      if (__DEV__) {
        console.log('[bannersApi] Fetch with params notice:', err?.message || err);
      }
    }

    // Attempt 2: If 0 items or error, fetch /api/banners without query params
    if (rawList.length === 0) {
      try {
        const response = await apiClient.get(API_ENDPOINTS.BANNERS.LIST);
        rawList = extractBannersArray(response.data);
      } catch (err: any) {
        if (__DEV__) {
          console.log('[bannersApi] Fetch without params notice:', err?.message || err);
        }
      }
    }

    // Attempt 3: If still 0 items, try /home/banners or /banners
    if (rawList.length === 0) {
      try {
        const response = await apiClient.get(API_ENDPOINTS.HOME.BANNERS || '/home/banners');
        rawList = extractBannersArray(response.data);
      } catch {}
    }

    if (rawList.length === 0) {
      return [];
    }

    // Normalize all items
    const normalized = rawList.map((item, idx) => normalizeApiBanner(item, idx));

    // Client-side filter if position or active was requested
    if (queryPosition) {
      const targetPos = queryPosition.toUpperCase();
      const filtered = normalized.filter((b) => {
        if (queryActive && !b.active) return false;
        if (targetPos === 'HOME_HERO') {
          return (b.position === 'HOME_HERO' || !b.position) && !isPromotionalVideoBanner(b);
        }
        if (targetPos === 'HOME_VIDEO' || targetPos === 'PROMO_VIDEO') {
          return b.position === 'HOME_VIDEO' || isPromotionalVideoBanner(b);
        }
        if (targetPos === 'PROMO_STRIP') {
          return b.position === 'PROMO_STRIP' || b.position === 'OFFER_CARD';
        }
        return b.position === targetPos;
      });

      if (filtered.length > 0) return filtered;
      if (targetPos === 'HOME_HERO') {
        return normalized.filter((b) => (!queryActive || b.active) && !isPromotionalVideoBanner(b));
      }
      return [];
    }

    return normalized.filter((b) => !queryActive || b.active);
  },

  /**
   * GET /api/banners/{id} — Retrieve banner by ID
   */
  getBannerDetail: async (id: string | number): Promise<ApiBanner> => {
    const response = await apiClient.get<BannerApiResponse<ApiBanner>>(
      API_ENDPOINTS.BANNERS.DETAIL(id)
    );
    return response.data?.data ?? (response.data as unknown as ApiBanner);
  },

  /**
   * POST /api/banners — Create new banner (Admin Only)
   * title is required and cannot be blank. Defaults: sortOrder: 0, active: true
   */
  createBanner: async (data: BannerCreateRequest): Promise<ApiBanner> => {
    const payload: BannerCreateRequest = {
      sortOrder: 0,
      active: true,
      ...data,
      title: data.title.trim(),
    };

    const response = await apiClient.post<BannerApiResponse<ApiBanner>>(
      API_ENDPOINTS.BANNERS.CREATE,
      payload
    );
    return response.data?.data ?? (response.data as unknown as ApiBanner);
  },

  /**
   * PUT /api/banners/{id} — Update banner (Admin Only)
   */
  updateBanner: async (
    id: string | number,
    data: BannerUpdateRequest
  ): Promise<ApiBanner> => {
    const response = await apiClient.put<BannerApiResponse<ApiBanner>>(
      API_ENDPOINTS.BANNERS.UPDATE(id),
      data
    );
    return response.data?.data ?? (response.data as unknown as ApiBanner);
  },

  /**
   * POST /api/banners/{id}/image — Upload banner image to S3 (Admin Only)
   * Content type: multipart/form-data, Form field: file
   */
  uploadBannerImage: async (
    id: string | number,
    file: { uri: string; name?: string; type?: string } | FormData
  ): Promise<ApiBanner> => {
    let formData: FormData;

    if (file instanceof FormData) {
      formData = file;
    } else {
      formData = new FormData();
      const filename = file.name || file.uri.split('/').pop() || `banner_${id}_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = file.type || (match ? `image/${match[1]}` : 'image/jpeg');

      formData.append('file', {
        uri: file.uri,
        name: filename,
        type: mimeType,
      } as any);
    }

    const response = await apiClient.post<BannerApiResponse<ApiBanner>>(
      API_ENDPOINTS.BANNERS.UPLOAD_IMAGE(id),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data?.data ?? (response.data as unknown as ApiBanner);
  },

  /**
   * DELETE /api/banners/{id} — Delete banner from DB and S3 (Admin Only)
   */
  deleteBanner: async (
    id: string | number
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete<BannerApiResponse<null>>(
      API_ENDPOINTS.BANNERS.DELETE(id)
    );
    return {
      success: response.data?.success ?? true,
      message: response.data?.message,
    };
  },
};

/**
 * HINCH MART — Live Promotional Video Service
 * Fully implements the backend team's official API specifications:
 * 1. Dedicated Endpoint: GET /api/promotions/video/active
 * 2. Banner API Endpoint: GET /api/banners?active=true&position=HOME_VIDEO
 */
export const promotionsApi = {
  /**
   * Retrieves the live active promotional video from the backend.
   * Prioritizes dedicated endpoint /api/promotions/video/active,
   * with seamless fallback to /api/banners?active=true&position=HOME_VIDEO.
   */
  getActivePromotionalVideo: async (): Promise<ActivePromotionalVideoData | null> => {
    // ── APPROACH 1: Dedicated Endpoint (GET /api/promotions/video/active) ──
    try {
      const response = await apiClient.get<BannerApiResponse<ActivePromotionalVideoData | null>>(
        API_ENDPOINTS.PROMOTIONS.VIDEO_ACTIVE
      );

      if (response.data) {
        // If data is null or empty, backend explicitly reports no active video
        if (response.data.data === null || response.data.data === undefined) {
          return null;
        }

        const item = response.data.data;
        if (item && item.videoUrl && item.isActive !== false) {
          return {
            id: item.id,
            videoUrl: normalizeBannerImageUrl(item.videoUrl),
            posterUrl: item.posterUrl ? normalizeBannerImageUrl(item.posterUrl) : undefined,
            title: item.title || 'Need Materials Urgently on Site?',
            subtitle: item.subtitle || '',
            badge: item.badge || '24-HOUR DISPATCH',
            ctaText: item.ctaText || 'Explore 24H Catalog',
            targetScreen: item.targetScreen || 'TwentyFourHourDelivery',
            isActive: true,
          };
        }
      }
    } catch (err: any) {
      if (__DEV__) {
        console.log('[promotionsApi] Dedicated endpoint notice:', err?.message || err);
      }
    }

    // ── APPROACH 2: Banner List Endpoint (GET /api/banners?active=true&position=HOME_VIDEO) ──
    try {
      const banners = await bannersApi.getBanners({
        active: true,
        position: 'HOME_VIDEO',
      });

      if (Array.isArray(banners) && banners.length > 0) {
        const active = banners.find(
          (b) => (b.active !== false && b.isActive !== false) && Boolean(b.videoUrl)
        );

        if (active && active.videoUrl) {
          return {
            id: active.id || active.bannerId,
            videoUrl: active.videoUrl,
            posterUrl: active.posterUrl || active.thumbnailUrl || active.imageUrl,
            title: active.title || 'Need Materials Urgently on Site?',
            subtitle: active.subtitle || '',
            badge: active.badge || '24-HOUR DISPATCH',
            ctaText: active.ctaText || 'Explore 24H Catalog',
            targetScreen: active.targetScreen || (active.linkType === 'SCREEN' ? active.linkValue : undefined) || 'TwentyFourHourDelivery',
            isActive: true,
          };
        }
      }
    } catch (err: any) {
      if (__DEV__) {
        console.log('[promotionsApi] Banner list fallback notice:', err?.message || err);
      }
    }

    return null;
  },
};

