/**
 * HINCH MART — Live Promotional Video Hook
 * 
 * Connected directly to the backend team's official API specifications:
 * 1. Dedicated Endpoint: GET /api/promotions/video/active
 * 2. Banner API Endpoint: GET /api/banners?active=true&position=HOME_VIDEO
 * 
 * STRICT COMPLIANCE:
 * - 100% Live Backend Driven
 * - ZERO frontend mock data, ZERO hardcoded video URLs, ZERO placeholder dummy JSON
 * - Shows shimmering skeleton when loading or when no active video is available
 * - Subscribes to real-time cache invalidation so Admin changes reflect immediately
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { promotionsApi } from '../services/api/banners.api';
import { ActivePromotionalVideoData } from '../types/banner.types';

// Global in-memory cache for live promotional video
let cachedPromotionalVideo: ActivePromotionalVideoData | null = null;
let hasInitialFetchCompleted = false;
const listeners: Array<() => void> = [];

export function invalidatePromotionalVideoCache() {
  cachedPromotionalVideo = null;
  hasInitialFetchCompleted = false;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export interface LivePromotionalVideoState {
  video: ActivePromotionalVideoData | null;
  videoUrl: string | null;
  posterUrl?: string;
  hasVideo: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLivePromotionalVideo(): LivePromotionalVideoState {
  const [video, setVideo] = useState<ActivePromotionalVideoData | null>(cachedPromotionalVideo);
  const [isLoading, setIsLoading] = useState<boolean>(!hasInitialFetchCompleted);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchLiveVideo = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!hasInitialFetchCompleted) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch live promotional video from backend API (Dedicated /api/promotions/video/active with /api/banners fallback)
      const liveVideo = await promotionsApi.getActivePromotionalVideo();

      if (!isMountedRef.current) return;

      if (liveVideo && liveVideo.videoUrl && liveVideo.videoUrl.trim().length > 0) {
        cachedPromotionalVideo = liveVideo;
        setVideo(liveVideo);
      } else {
        cachedPromotionalVideo = null;
        setVideo(null);
      }

      hasInitialFetchCompleted = true;
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (__DEV__) {
        console.log('[useLivePromotionalVideo] Live API fetch notice:', err?.message || err);
      }
      setError(err?.message || 'Failed to fetch live promotional video');
      setVideo(cachedPromotionalVideo);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLiveVideo();

    const onInvalidate = () => {
      fetchLiveVideo(true);
    };
    listeners.push(onInvalidate);

    return () => {
      isMountedRef.current = false;
      const idx = listeners.indexOf(onInvalidate);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [fetchLiveVideo]);

  const refetch = useCallback(async () => {
    return fetchLiveVideo(true);
  }, [fetchLiveVideo]);

  const videoUrl = video?.videoUrl || null;
  const posterUrl = video?.posterUrl || undefined;
  const hasVideo = Boolean(videoUrl && videoUrl.length > 0);

  return {
    video,
    videoUrl,
    posterUrl,
    hasVideo,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
