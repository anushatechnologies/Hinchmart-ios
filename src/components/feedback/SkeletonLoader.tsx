/**
 * HINCH MART — Premium Moglix-Inspired Skeleton & Shimmer Loading System
 * 
 * Design Principles:
 * 1. ZERO LAYOUT SHIFT: Skeletons strictly match exact component dimensions & paddings.
 * 2. SMOOTH SHIMMER: 1400ms horizontal gradient sweep powered by native driver animations.
 * 3. SUBTLE NEUTRAL TONES: Soft light grey (#E8ECEF / #F1F5F9) & dark slate (#1E293B / #334155).
 * 4. CONTEXT-AWARE: Dedicated skeletons for Products, Details, Categories, Orders, Tracking, and Profile.
 * 5. REDUCED MOTION SAFE & GPU EFFICIENT: Automatic cleanup on unmount, minimal redraws.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  DimensionValue,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { Button } from '../ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Shared Shimmer Context & Component ──────────────────────────────────────

export interface HinchSkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * High-performance horizontal shimmer element
 */
export function HinchSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style,
  children,
}: HinchSkeletonProps) {
  const { isDark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const baseBg = isDark ? '#1E293B' : '#E8ECEF';
  const shimmerColors = isDark
    ? (['transparent', 'rgba(255, 255, 255, 0.08)', 'transparent'] as const)
    : (['transparent', 'rgba(255, 255, 255, 0.65)', 'transparent'] as const);

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseBg,
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </View>
  );
}

// Backward-compatible alias
export const SkeletonLoader = HinchSkeleton;
export const HinchShimmer = HinchSkeleton;

// ── Atomic Skeleton Primitives ──────────────────────────────────────────────

export function HinchSkeletonText({
  width = '100%',
  height = 12,
  borderRadius = 4,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  return <HinchSkeleton width={width} height={height} borderRadius={borderRadius} style={style} />;
}

export function HinchSkeletonCircle({
  size = 40,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return <HinchSkeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

export function HinchSkeletonImage({
  width = '100%',
  height = 140,
  borderRadius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  return <HinchSkeleton width={width} height={height} borderRadius={borderRadius} style={style} />;
}

export function SkeletonCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.cardBorder,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── 1. Hero Banner Skeleton (HomeScreen) ────────────────────────────────────

export function BannerSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.bannerWrapper, style]}>
      <HinchSkeleton width={SCREEN_WIDTH - 32} height={175} borderRadius={16} />
    </View>
  );
}
export const HinchBannerSkeleton = BannerSkeleton;

// ── 2. Home Category 4x2 Grid Item Skeleton ─────────────────────────────────

export function HomeCategorySkeleton() {
  const { isDark } = useTheme();
  const cardWidth = Math.floor((SCREEN_WIDTH - 32 - 3 * 8) / 4);
  const imageHeight = Math.round(cardWidth * 0.88);

  return (
    <View
      style={[
        styles.homeCatCard,
        {
          width: cardWidth,
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderColor: isDark ? '#333333' : '#F0F2F5',
        },
      ]}
    >
      <HinchSkeleton width="100%" height={imageHeight} borderRadius={0} />
      <View style={{ paddingVertical: 6, alignItems: 'center', width: '100%' }}>
        <HinchSkeleton width="70%" height={10} borderRadius={3} />
      </View>
    </View>
  );
}

export function HomeScreenCategoriesSkeleton() {
  return (
    <View style={styles.homeCategoriesGrid}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <HomeCategorySkeleton key={`home_cat_skel_${i}`} />
      ))}
    </View>
  );
}
export const HinchCategoryGridSkeleton = HomeScreenCategoriesSkeleton;

export function HomeMoreCategorySkeleton() {
  const { isDark } = useTheme();
  const cardWidth = Math.floor((SCREEN_WIDTH - 32 - 8) / 2);
  const imageHeight = Math.round(cardWidth * 0.62);

  return (
    <View
      style={[
        styles.homeMoreCatCard,
        {
          width: cardWidth,
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderColor: isDark ? '#333333' : '#F0F2F5',
        },
      ]}
    >
      <HinchSkeleton width="100%" height={imageHeight} borderRadius={0} />
      <View style={{ paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', width: '100%' }}>
        <HinchSkeleton width="60%" height={12} borderRadius={3} />
      </View>
    </View>
  );
}

export function HomeScreenMoreCategoriesSkeleton() {
  return (
    <View style={styles.homeCategoriesGrid}>
      {[1, 2, 3, 4].map((i) => (
        <HomeCategorySkeleton key={`more_cat_skel_${i}`} />
      ))}
    </View>
  );
}

// ── 3. Product Card Skeleton (Catalog, Best Sellers, Trending) ──────────────

export function ProductCardSkeleton({ style }: { style?: ViewStyle }) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.prodCard,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
        style,
      ]}
    >
      {/* Product Image Area */}
      <HinchSkeleton width="100%" height={130} borderRadius={0} />

      <View style={{ padding: 10 }}>
        {/* Brand Tag */}
        <HinchSkeleton width="55%" height={9} borderRadius={3} style={{ marginBottom: 6 }} />

        {/* Product Title (2 Lines) */}
        <HinchSkeleton width="92%" height={12} borderRadius={3} style={{ marginBottom: 4 }} />
        <HinchSkeleton width="68%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />

        {/* Rating Stars Line */}
        <HinchSkeleton width="40%" height={9} borderRadius={3} style={{ marginBottom: 10 }} />

        {/* Price & Action Button Row */}
        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            <HinchSkeleton width="70%" height={14} borderRadius={3} style={{ marginBottom: 3 }} />
            <HinchSkeleton width="45%" height={10} borderRadius={3} />
          </View>
          <HinchSkeleton width={32} height={32} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}
export const HinchProductCardSkeleton = ProductCardSkeleton;

export function HomeScreenBestSellersSkeleton() {
  const cardWidth = (SCREEN_WIDTH - 32 - 12) / 2;
  return (
    <View style={styles.bestSellersRow}>
      <ProductCardSkeleton style={{ width: cardWidth, marginRight: 12, marginBottom: 0 }} />
      <ProductCardSkeleton style={{ width: cardWidth, marginBottom: 0 }} />
    </View>
  );
}

export function HomeScreenTrendingSkeleton() {
  const cardWidth = (SCREEN_WIDTH - 32 - 12) / 2;
  return (
    <View style={styles.trendingGrid}>
      {[1, 2, 3, 4].map((i) => (
        <ProductCardSkeleton
          key={`trend_skel_${i}`}
          style={{ width: cardWidth, marginBottom: 12 }}
        />
      ))}
    </View>
  );
}

export function HomeScreenBrandsSkeleton() {
  return (
    <View style={styles.brandsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={`brand_skel_${i}`} style={styles.brandCircleItem}>
          <HinchSkeletonCircle size={78} />
          <HinchSkeletonText width={60} height={10} borderRadius={3} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

// ── 4. Full Categories Overview Hub Skeleton (CategoriesScreen 3-Column Layout) ───

export function CategoryCardSkeleton({ cardWidth }: { cardWidth?: number } = {}) {
  const { isDark } = useTheme();
  const width = cardWidth || Math.floor((SCREEN_WIDTH - 32 - 20) / 3);

  return (
    <View
      style={[
        styles.catGridCard,
        {
          width,
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          borderRadius: 12,
          marginBottom: 12,
          overflow: 'hidden',
        },
      ]}
    >
      <HinchSkeleton width="100%" height={Math.round(width * 0.9)} borderRadius={0} />
      <View style={{ padding: 8 }}>
        <HinchSkeleton width="80%" height={11} borderRadius={3} style={{ marginBottom: 5 }} />
        <HinchSkeleton width="55%" height={9} borderRadius={3} />
      </View>
    </View>
  );
}

export function CategoriesHubSkeleton() {
  const cardWidth = Math.floor((SCREEN_WIDTH - 32 - 20) / 3);
  return (
    <View style={styles.hubContainer}>
      <View style={styles.hubGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <CategoryCardSkeleton key={`cat_skel_${i}`} cardWidth={cardWidth} />
        ))}
      </View>
    </View>
  );
}

// ── 5. Category Split View Skeleton (CategoriesScreen State 2) ──────────────

export function CategoriesDetailSkeleton() {
  const { isDark } = useTheme();
  const cardWidth = (SCREEN_WIDTH - 96 - 24 - 8) / 2;

  return (
    <View style={styles.splitSkeletonWrap}>
      {/* Left Sidebar */}
      <View
        style={[
          styles.leftSidebarSkeleton,
          {
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderRightColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={`sidebar_skel_${i}`} style={styles.sidebarItemSkel}>
            <HinchSkeletonCircle size={40} />
            <HinchSkeleton width="75%" height={8} borderRadius={3} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Right Products Catalog Grid */}
      <View style={styles.rightCatalogSkeleton}>
        <View style={styles.rightCatalogHeader}>
          <HinchSkeleton width={110} height={14} borderRadius={4} />
          <HinchSkeleton width={60} height={12} borderRadius={4} />
        </View>
        <View style={styles.rightGridRow}>
          <ProductCardSkeleton style={{ width: cardWidth, marginRight: 8, marginBottom: 8 }} />
          <ProductCardSkeleton style={{ width: cardWidth, marginBottom: 8 }} />
        </View>
        <View style={styles.rightGridRow}>
          <ProductCardSkeleton style={{ width: cardWidth, marginRight: 8, marginBottom: 8 }} />
          <ProductCardSkeleton style={{ width: cardWidth, marginBottom: 8 }} />
        </View>
      </View>
    </View>
  );
}

export function ProductListSkeleton() {
  const cardWidth = (SCREEN_WIDTH - 24 - 12) / 2;
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <ProductCardSkeleton style={{ width: cardWidth }} />
        <ProductCardSkeleton style={{ width: cardWidth }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <ProductCardSkeleton style={{ width: cardWidth }} />
        <ProductCardSkeleton style={{ width: cardWidth }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <ProductCardSkeleton style={{ width: cardWidth }} />
        <ProductCardSkeleton style={{ width: cardWidth }} />
      </View>
    </View>
  );
}

// ── 6. Full Product Detail Screen Skeleton ──────────────────────────────────

export function ProductDetailSkeleton({
  topSafePadding = 44,
  onBack,
}: {
  topSafePadding?: number;
  onBack?: () => void;
}) {
  const { isDark } = useTheme();

  return (
    <View style={[styles.detailRoot, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* Header Bar */}
      <View
        style={[
          styles.detailTopHeader,
          {
            paddingTop: topSafePadding,
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderBottomColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        {onBack ? (
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.headerCircleBtn}>
            <Ionicons name="arrow-back" size={21} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
        ) : (
          <HinchSkeletonCircle size={36} />
        )}
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <HinchSkeleton width="60%" height={14} borderRadius={4} />
        </View>
        <HinchSkeletonCircle size={36} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Main Gallery Placeholder */}
        <View style={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF', padding: 16 }}>
          <HinchSkeleton width="100%" height={260} borderRadius={12} />
          {/* Gallery Thumbnails */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <HinchSkeleton key={`thumb_${i}`} width={52} height={52} borderRadius={8} />
            ))}
          </View>
        </View>

        {/* Title, Badges & Rating */}
        <View
          style={[
            styles.detailSectionCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <HinchSkeleton width={90} height={20} borderRadius={4} />
            <HinchSkeleton width={110} height={20} borderRadius={4} />
          </View>
          <HinchSkeleton width="92%" height={18} borderRadius={4} style={{ marginBottom: 6 }} />
          <HinchSkeleton width="70%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <HinchSkeleton width={70} height={14} borderRadius={4} />
            <HinchSkeleton width={120} height={14} borderRadius={4} />
          </View>
        </View>

        {/* Gold Pricing Card Placeholder */}
        <View
          style={[
            styles.detailSectionCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <HinchSkeleton width={130} height={24} borderRadius={4} />
            <HinchSkeleton width={80} height={20} borderRadius={4} />
          </View>
          <HinchSkeleton width="100%" height={48} borderRadius={8} style={{ marginBottom: 8 }} />
          <HinchSkeleton width="85%" height={12} borderRadius={3} />
        </View>

        {/* Volume Stepper & Trust Badges */}
        <View
          style={[
            styles.detailSectionCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <HinchSkeleton width="45%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
          <HinchSkeleton width="100%" height={44} borderRadius={8} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <HinchSkeleton key={`vol_${i}`} width="23%" height={32} borderRadius={6} />
            ))}
          </View>
        </View>

        {/* Technical Specs Table Placeholder */}
        <View
          style={[
            styles.detailSectionCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <HinchSkeleton width="50%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          {[1, 2, 3, 4].map((i) => (
            <View
              key={`spec_${i}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#334155' : '#F1F5F9',
              }}
            >
              <HinchSkeleton width="35%" height={12} borderRadius={3} />
              <HinchSkeleton width="45%" height={12} borderRadius={3} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar Placeholder */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderTopColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <HinchSkeleton width="60%" height={10} borderRadius={3} style={{ marginBottom: 4 }} />
          <HinchSkeleton width="90%" height={18} borderRadius={4} />
        </View>
        <HinchSkeleton width={130} height={44} borderRadius={8} />
      </View>
    </View>
  );
}
export const HinchProductDetailSkeleton = ProductDetailSkeleton;

// ── 7. Order History Card Skeleton ──────────────────────────────────────────

export function OrderCardSkeleton() {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.orderCard,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      {/* Top Row: Order Number & Status Badge */}
      <View style={styles.orderCardTopRow}>
        <View style={{ flex: 1 }}>
          <HinchSkeleton width={140} height={14} borderRadius={4} style={{ marginBottom: 4 }} />
          <HinchSkeleton width={90} height={10} borderRadius={3} />
        </View>
        <HinchSkeleton width={80} height={22} borderRadius={11} />
      </View>

      {/* Middle Row: Product Thumbnail & Title */}
      <View style={styles.orderProductRow}>
        <HinchSkeleton width={60} height={60} borderRadius={8} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <HinchSkeleton width="90%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
          <HinchSkeleton width="65%" height={10} borderRadius={3} style={{ marginBottom: 8 }} />
          <HinchSkeleton width="40%" height={14} borderRadius={4} />
        </View>
      </View>

      {/* Progress Bar Line */}
      <View style={{ marginTop: 12, marginBottom: 8 }}>
        <HinchSkeleton width="100%" height={4} borderRadius={2} />
      </View>

      {/* Bottom Action Row */}
      <View style={styles.orderActionRow}>
        <HinchSkeleton width={90} height={30} borderRadius={6} />
        <HinchSkeleton width={110} height={30} borderRadius={6} />
      </View>
    </View>
  );
}
export const HinchOrderCardSkeleton = OrderCardSkeleton;

export function OrderListSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      {[1, 2, 3].map((i) => (
        <OrderCardSkeleton key={`order_skel_${i}`} />
      ))}
    </View>
  );
}

// ── 8. Order Detail Screen Skeleton ─────────────────────────────────────────

export function OrderDetailSkeleton() {
  const { isDark } = useTheme();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
      {/* Order Info Card */}
      <View
        style={[
          styles.detailSectionCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
            marginTop: 0,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <HinchSkeleton width={140} height={16} borderRadius={4} />
          <HinchSkeleton width={90} height={22} borderRadius={11} />
        </View>
        <HinchSkeleton width={180} height={12} borderRadius={3} style={{ marginBottom: 10 }} />
        <HinchSkeleton width="100%" height={6} borderRadius={3} />
      </View>

      {/* Item List Card */}
      <View
        style={[
          styles.detailSectionCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <HinchSkeleton width={110} height={14} borderRadius={4} style={{ marginBottom: 14 }} />
        {[1, 2].map((i) => (
          <View key={`item_${i}`} style={{ flexDirection: 'row', marginBottom: 12 }}>
            <HinchSkeleton width={52} height={52} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <HinchSkeleton width="85%" height={12} borderRadius={3} style={{ marginBottom: 4 }} />
              <HinchSkeleton width="40%" height={10} borderRadius={3} style={{ marginBottom: 6 }} />
              <HinchSkeleton width="50%" height={13} borderRadius={3} />
            </View>
          </View>
        ))}
      </View>

      {/* Price Summary Card */}
      <View
        style={[
          styles.detailSectionCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <HinchSkeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        {[1, 2, 3].map((i) => (
          <View key={`price_${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <HinchSkeleton width="35%" height={12} borderRadius={3} />
            <HinchSkeleton width="25%" height={12} borderRadius={3} />
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#E2E8F0', marginVertical: 8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <HinchSkeleton width="40%" height={16} borderRadius={4} />
          <HinchSkeleton width="30%" height={16} borderRadius={4} />
        </View>
      </View>
    </ScrollView>
  );
}

// ── 9. Order Tracking Timeline Skeleton ─────────────────────────────────────

export function OrderTrackingSkeleton() {
  const { isDark } = useTheme();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
      {/* Header Info */}
      <View
        style={[
          styles.detailSectionCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
            marginTop: 0,
          },
        ]}
      >
        <HinchSkeleton width={150} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
        <HinchSkeleton width={100} height={12} borderRadius={3} style={{ marginBottom: 12 }} />
        <HinchSkeleton width="100%" height={40} borderRadius={8} />
      </View>

      {/* Vertical Timeline Steps */}
      <View
        style={[
          styles.detailSectionCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <HinchSkeleton width={130} height={14} borderRadius={4} style={{ marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <View key={`step_${i}`} style={{ flexDirection: 'row', marginBottom: 20 }}>
            <HinchSkeletonCircle size={28} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <HinchSkeleton width="70%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
              <HinchSkeleton width="90%" height={11} borderRadius={3} style={{ marginBottom: 4 }} />
              <HinchSkeleton width="40%" height={10} borderRadius={3} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── 10. Admin List Skeleton ─────────────────────────────────────────────────

export function AdminListSkeleton({ count = 5 }: { count?: number }) {
  const { isDark } = useTheme();

  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={`admin_skel_${i}`}
          style={[
            styles.adminCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <HinchSkeleton width={54} height={54} borderRadius={8} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <HinchSkeleton width="80%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
            <HinchSkeleton width="50%" height={11} borderRadius={3} style={{ marginBottom: 6 }} />
            <HinchSkeleton width="30%" height={12} borderRadius={3} />
          </View>
          <HinchSkeleton width={40} height={24} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

// ── 11. Fallback Feedback States (Empty, Error, Offline) ─────────────────────

export interface SkeletonEmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SkeletonEmptyState({
  title,
  subtitle,
  icon,
  actionTitle,
  onAction,
  style,
}: SkeletonEmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.centerContainer, style]}>
      {icon ? (
        <View style={styles.iconWrapper}>{icon}</View>
      ) : (
        <View style={[styles.defaultIcon, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={[styles.defaultIconText, { color: theme.colors.primary }]}>📦</Text>
        </View>
      )}
      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
      {actionTitle && onAction && (
        <Button title={actionTitle} onPress={onAction} size="md" style={styles.actionBtn} />
      )}
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Server Reconnecting',
  message = 'Connecting to HinchMart live server...',
  onRetry,
  style,
}: ErrorStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.centerContainer, style]}>
      <View style={[styles.defaultIcon, { backgroundColor: theme.colors.dangerLight }]}>
        <Text style={{ fontSize: 28 }}>⚡</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <Button title="Retry Connection" onPress={onRetry} variant="navy" size="md" style={styles.actionBtn} />
      )}
    </View>
  );
}

export interface OfflineScreenProps {
  onRetry?: () => void;
}

export function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.centerContainer, { backgroundColor: theme.colors.background, flex: 1 }]}>
      <View style={[styles.defaultIcon, { backgroundColor: theme.colors.warningLight, width: 80, height: 80, borderRadius: 40 }]}>
        <Text style={{ fontSize: 40 }}>📡</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary, fontSize: 20 }]}>
        No Internet Connection
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Please check your Wi-Fi or cellular network connection and try again.
      </Text>
      {onRetry && <Button title="Retry Connection" onPress={onRetry} variant="primary" size="lg" style={styles.actionBtn} />}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  bannerWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  homeCatCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    marginBottom: 8,
  },
  homeMoreCatCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    marginBottom: 10,
  },
  homeCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  homeMoreCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  prodCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bestSellersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brandsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 16,
  },
  brandCircleItem: {
    alignItems: 'center',
  },
  catGridCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  hubContainer: {
    padding: 16,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  splitSkeletonWrap: {
    flex: 1,
    flexDirection: 'row',
  },
  leftSidebarSkeleton: {
    width: 86,
    borderRightWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sidebarItemSkel: {
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  rightCatalogSkeleton: {
    flex: 1,
    padding: 12,
  },
  rightCatalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  rightGridRow: {
    flexDirection: 'row',
  },
  detailRoot: {
    flex: 1,
  },
  detailTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1,
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  orderCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    width: '100%',
  },
  iconWrapper: {
    marginBottom: 16,
  },
  defaultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  defaultIconText: {
    fontSize: 28,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionBtn: {
    marginTop: 8,
    minWidth: 160,
  },
});
