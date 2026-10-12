/**
 * HINCH MART — Dynamic Live Promotional Video Card
 * 
 * Connected directly to the Live Backend (/api/promotions/video/active).
 * 
 * FEATURES & BUG FIXES:
 * - 100% Live Backend Driven via official Expo SDK 57 expo-video (AndroidX Media3 / ExoPlayer)
 * - Android Hardware Rendering: Uses surfaceType="surfaceView" (avoids TextureView frame freeze on Android)
 * - Immediate Playback: Starts playback automatically once readyToPlay is emitted
 * - In-Place Playback: Navigation to another screen is REMOVED.
 * - Removed heavy text overlays (headline & subheadline) so the video is 100% visible.
 * - Dedicated Play/Pause button in place of the old CTA ("Play Video" / "Pause Video").
 * - Prominent center Play button when paused.
 * - Tap anywhere on the card to toggle Play / Pause.
 * - Sound mute/unmute toggle & Fullscreen button.
 * - Auto-pauses on screen blur to conserve memory and bandwidth.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { useLivePromotionalVideo } from '../../../hooks/useLivePromotionalVideo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = 210;

interface HomePromotionalVideoCardProps {
  navigation?: any;
  isDark?: boolean;
}

/**
 * Validates video URLs before passing them to native media players
 */
function isValidVideoUrl(url: any): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 8) return false;
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}

/**
 * Shimmering Skeleton Loader for promotional card
 */
function PromotionalCardSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.75,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardSurface, styles.skeletonSurface]}
      >
        <Animated.View style={[styles.skeletonPulseOverlay, { opacity: pulseAnim }]} />

        {/* Top Badges Skeleton */}
        <View style={styles.topBadgesRow}>
          <View style={styles.skeletonBadgeLeft} />
          <View style={styles.skeletonBadgeRight} />
        </View>

        {/* Center Play Icon Placeholder */}
        <View style={styles.skeletonCenterIconWrap}>
          <View style={styles.skeletonCenterPlayIcon} />
        </View>

        {/* Footer Skeleton */}
        <View style={styles.skeletonFooter}>
          <View style={styles.skeletonCtaBtn} />
          <View style={styles.skeletonStatusDot} />
        </View>
      </LinearGradient>
    </View>
  );
}

/**
 * Fallback Card when a video encounters a playback error or network failure
 */
interface PromotionalCardFallbackProps {
  onRetry: () => void;
}

function PromotionalCardFallback({
  onRetry,
}: PromotionalCardFallbackProps) {
  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardSurface, styles.fallbackSurface]}
      >
        <View style={styles.topBadgesRow}>
          <View />
        </View>

        <View style={styles.fallbackCenterWrap}>
          <Ionicons name="videocam-off-outline" size={38} color="#94A3B8" />
          <Text style={styles.fallbackMsg}>Video stream unavailable</Text>
          <TouchableOpacity
            onPress={onRetry}
            activeOpacity={0.8}
            style={styles.retryBtn}
            accessibilityLabel="Retry Video"
          >
            <Ionicons name="reload" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry Playback</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.liveStatusWrap}>
            <View style={[styles.liveDot, styles.liveDotPaused]} />
            <Text style={styles.liveStatusText}>Offline</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/**
 * Dedicated Native Video Player component using Expo SDK 57 expo-video
 */
/**
 * Dedicated Native Video Player component using Expo SDK 57 expo-video
 */
interface ActiveExpoVideoProps {
  videoUrl: string;
  isMuted: boolean;
  isPlaying: boolean;
  isFocused: boolean;
  videoViewRef: React.RefObject<VideoView | null>;
  onPlaybackError: (err: any) => void;
}

function ActiveExpoVideo({
  videoUrl,
  isMuted,
  isPlaying,
  isFocused,
  videoViewRef,
  onPlaybackError,
}: ActiveExpoVideoProps) {
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;

  const onErrorRef = useRef(onPlaybackError);
  onErrorRef.current = onPlaybackError;

  // Initialize expo-video player with live video URL — autoplay immediately
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    try {
      p.play();
    } catch {}
  });

  // Keep volume/mute in sync
  useEffect(() => {
    if (!player) return;
    try {
      player.muted = isMuted;
    } catch {}
  }, [player, isMuted]);

  // Keep play/pause in sync with user state and screen focus
  useEffect(() => {
    if (!player) return;
    try {
      if (isFocused && isPlaying) {
        player.play();
      } else {
        player.pause();
      }
    } catch {}
  }, [player, isPlaying, isFocused]);

  // Attach status listener ONCE per player instance — never pause on cleanup
  useEffect(() => {
    if (!player) return;

    const subStatus = player.addListener('statusChange', (payload) => {
      if (payload.status === 'readyToPlay') {
        if (isPlayingRef.current && isFocusedRef.current) {
          try {
            player.play();
          } catch {}
        }
      } else if (payload.status === 'error') {
        if (__DEV__) {
          console.warn('[HomePromotionalVideoCard] expo-video status error:', payload.error);
        }
        onErrorRef.current(payload.error);
      }
    });

    return () => {
      try {
        subStatus.remove();
      } catch {}
    };
  }, [player]);

  return (
    <VideoView
      ref={videoViewRef as any}
      style={styles.nativeVideo}
      player={player}
      contentFit="cover"
      nativeControls={false}
      surfaceType="textureView"
    />
  );
}

export function HomePromotionalVideoCard({
  navigation,
  isDark = false,
}: HomePromotionalVideoCardProps) {
  const isFocused = useIsFocused();
  const { video, videoUrl, hasVideo, isLoading, error, refetch } =
    useLivePromotionalVideo();

  const videoViewRef = useRef<VideoView | null>(null);

  // Playback States — autoplay by default
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackError, setPlaybackError] = useState<boolean>(false);
  const [showPlayPauseFeedback, setShowPlayPauseFeedback] = useState<boolean>(false);

  const feedbackFadeAnim = useRef(new Animated.Value(0)).current;

  // Trigger visual feedback icon in the center when tapped
  const triggerPlayPauseFeedback = useCallback(() => {
    feedbackFadeAnim.setValue(1);
    setShowPlayPauseFeedback(true);
    Animated.timing(feedbackFadeAnim, {
      toValue: 0,
      duration: 650,
      useNativeDriver: true,
    }).start(() => {
      setShowPlayPauseFeedback(false);
    });
  }, [feedbackFadeAnim]);

  // Handle Pause / Play toggle — plays/pauses directly right here
  const handleTogglePlay = useCallback(() => {
    if (playbackError || !hasVideo) return;
    setIsPlaying((prev) => !prev);
    triggerPlayPauseFeedback();
  }, [playbackError, hasVideo, triggerPlayPauseFeedback]);

  // Handle Sound Toggle (Mute / Unmute)
  const handleToggleSound = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Handle Fullscreen Video View
  const handleEnterFullscreen = useCallback(() => {
    try {
      videoViewRef.current?.enterFullscreen();
    } catch (err) {
      if (__DEV__) {
        console.warn('[HomePromotionalVideoCard] enterFullscreen error:', err);
      }
    }
  }, []);

  const handlePlaybackError = useCallback((err: any) => {
    setPlaybackError(true);
  }, []);

  // Reset playback errors if videoUrl changes
  useEffect(() => {
    setPlaybackError(false);
    setIsPlaying(true);
  }, [videoUrl]);

  const handleRetry = useCallback(() => {
    setPlaybackError(false);
    setIsPlaying(true);
    refetch();
  }, [refetch]);

  // ── STATE 1: API REQUEST IN PROGRESS ──
  if (isLoading) {
    return <PromotionalCardSkeleton />;
  }

  // ── STATE 2: NO VIDEO AVAILABLE FROM BACKEND ──
  if (!hasVideo || !videoUrl || !isValidVideoUrl(videoUrl)) {
    return <PromotionalCardSkeleton />;
  }

  // ── STATE 3: PLAYBACK OR NETWORK ERROR -> FALLBACK WITH RETRY ──
  if (playbackError || error) {
    return (
      <PromotionalCardFallback
        onRetry={handleRetry}
      />
    );
  }

  // ── STATE 4: VALID LIVE VIDEO RECEIVED & READY (AUTOPLAYING) ──
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardSurface}>
        {/* Background Native Video Player via expo-video (textureView hardware accelerated for overlays) */}
        <View style={styles.videoPlayerContainer}>
          <ActiveExpoVideo
            videoUrl={videoUrl}
            isMuted={isMuted}
            isPlaying={isPlaying}
            isFocused={isFocused}
            videoViewRef={videoViewRef}
            onPlaybackError={handlePlaybackError}
          />
        </View>

        {/* Primary Tap Area: Tapping anywhere on the video plays/pauses in place */}
        <Pressable
          onPress={handleTogglePlay}
          style={styles.fullCardTouchArea}
          accessibilityLabel={isPlaying ? 'Pause promotional video' : 'Play promotional video'}
        >
          {/* Subtle Top & Bottom Gradient Overlay for control visibility without obscuring video */}
          <LinearGradient
            colors={[
              'rgba(15, 23, 42, 0.55)',
              'transparent',
              'rgba(15, 23, 42, 0.75)',
            ]}
            locations={[0, 0.35, 1]}
            style={styles.controlGradients}
            pointerEvents="box-none"
          >
            {/* Top Bar: Clean View with Sound / Fullscreen Controls */}
            <View style={styles.topBadgesRow} pointerEvents="box-none">
              <View />

              <View style={styles.topRightControlsRow} pointerEvents="box-none">
                {/* Sound Toggle Button */}
                <TouchableOpacity
                  onPress={handleToggleSound}
                  activeOpacity={0.8}
                  style={styles.controlIconButton}
                  accessibilityLabel={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={15}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                {/* Fullscreen Button */}
                <TouchableOpacity
                  onPress={handleEnterFullscreen}
                  activeOpacity={0.8}
                  style={styles.controlIconButton}
                  accessibilityLabel="Fullscreen video"
                >
                  <Ionicons name="expand" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Center Area: Big Play Button when Paused, or Tap Feedback Icon */}
            <View style={styles.centerOverlayWrap} pointerEvents="box-none">
              {!isPlaying && (
                <View style={styles.centerBigPlayBtn}>
                  <Ionicons
                    name="play"
                    size={32}
                    color="#FFFFFF"
                    style={{ marginLeft: 4 }}
                  />
                </View>
              )}

              {/* Animated Tap Feedback */}
              {showPlayPauseFeedback && (
                <Animated.View
                  style={[
                    styles.feedbackCenterBadge,
                    { opacity: feedbackFadeAnim },
                  ]}
                >
                  <Ionicons
                    name={isPlaying ? 'play' : 'pause'}
                    size={28}
                    color="#FFFFFF"
                  />
                </Animated.View>
              )}
            </View>

            {/* Bottom Row: Direct In-Place Play/Pause Button & Status Dot */}
            <View style={styles.cardFooter} pointerEvents="box-none">
              <TouchableOpacity
                onPress={handleTogglePlay}
                activeOpacity={0.88}
                style={[
                  styles.playControlBtn,
                  isPlaying ? styles.playControlBtnPause : styles.playControlBtnPlay,
                ]}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={14}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.playControlBtnText}>
                  {isPlaying ? 'Pause Video' : 'Play Video'}
                </Text>
              </TouchableOpacity>

              <View style={styles.liveStatusWrap}>
                <View
                  style={[
                    styles.liveDot,
                    isPlaying ? styles.liveDotActive : styles.liveDotPaused,
                  ]}
                />
                <Text style={styles.liveStatusText}>
                  {isPlaying ? 'Playing Live' : 'Video Paused'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  cardSurface: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    position: 'relative',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#EF4444',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
        }
      : { elevation: 4 }),
  },
  videoPlayerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 2,
  },
  fullCardTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  controlGradients: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    justifyContent: 'space-between',
  },
  topBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRightControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOverlayWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  centerBigPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(227, 30, 36, 0.88)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  feedbackCenterBadge: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  playControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  playControlBtnPlay: {
    backgroundColor: '#E31E24',
    shadowColor: '#E31E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  playControlBtnPause: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  playControlBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  liveStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveDotActive: {
    backgroundColor: '#22C55E',
  },
  liveDotPaused: {
    backgroundColor: '#F59E0B',
  },
  liveStatusText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    fontSize: 11,
    color: '#E2E8F0',
  },

  /* ── Fallback Specific Styles ── */
  fallbackSurface: {
    padding: 14,
    justifyContent: 'space-between',
  },
  fallbackCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  fallbackMsg: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 13,
    color: '#94A3B8',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  retryBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12,
    color: '#FFFFFF',
  },

  /* ── Skeleton Specific Styles ── */
  skeletonSurface: {
    padding: 16,
    justifyContent: 'space-between',
  },
  skeletonPulseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonBadgeLeft: {
    width: 120,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonBadgeRight: {
    width: 70,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skeletonCenterIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  skeletonCenterPlayIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  skeletonCtaBtn: {
    width: 110,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(227, 30, 36, 0.4)',
  },
  skeletonStatusDot: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
