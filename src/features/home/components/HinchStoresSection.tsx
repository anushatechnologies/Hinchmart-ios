/**
 * HINCH MART — Live Hinch Stores Section
 * Displays available Hinch Mart stores/branches dynamically from the LIVE BACKEND (/api/stores).
 * 100% Dynamic — ZERO frontend mock data.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StoreResponse } from '../../../types/backend.types';

interface HinchStoresSectionProps {
  stores: StoreResponse[];
  isLoading: boolean;
  error: string | null;
  isDark: boolean;
  onStorePress: (store: StoreResponse) => void;
  onRetry?: () => void;
}

interface StoreCardProps {
  store: StoreResponse;
  isDark: boolean;
  onPress: () => void;
}

const StoreCard = React.memo(function StoreCard({ store, isDark, onPress }: StoreCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasValidLogo = !!store.logoUrl && !imgError;

  return (
    <TouchableOpacity
      style={[
        styles.storeCard,
        {
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Store ${store.name}`}
    >
      {/* Store Graphic / Monument / Logo */}
      <View style={styles.imageContainer}>
        {hasValidLogo ? (
          <Image
            source={{ uri: store.logoUrl! }}
            style={styles.storeLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.monumentCircle, { backgroundColor: isDark ? '#2A1810' : '#FEF2F2' }]}>
            {/* Monument / Landmark silhouette matching reference UI */}
            <MaterialCommunityIcons
              name="office-building-marker"
              size={34}
              color={isDark ? '#F87171' : '#991B1B'}
            />
          </View>
        )}
      </View>

      {/* Store Name */}
      <Text
        style={[
          styles.storeName,
          { color: isDark ? '#F5F5F5' : '#0F172A' },
        ]}
        numberOfLines={2}
      >
        {store.name}
      </Text>

      {/* City / Location (only if available in backend) */}
      {(store as any).city ? (
        <Text style={[styles.storeCity, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
          {(store as any).city}
        </Text>
      ) : store.sellerCompanyName && store.sellerCompanyName !== store.name ? (
        <Text style={[styles.storeCity, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
          {store.sellerCompanyName}
        </Text>
      ) : null}

      {/* Status / Rating Row */}
      <View style={styles.metaRow}>
        {store.status === 'ACTIVE' && (
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Open</Text>
          </View>
        )}

        {typeof store.rating === 'number' && store.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 2 }} />
            <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Service Radius if available */}
      {typeof store.serviceRadiusKm === 'number' && store.serviceRadiusKm > 0 ? (
        <Text style={styles.radiusText} numberOfLines={1}>
          {store.serviceRadiusKm} km radius
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});

// Skeleton card for loading state
function SkeletonStoreCard({ isDark }: { isDark: boolean }) {
  const pulseBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9';
  return (
    <View
      style={[
        styles.storeCard,
        {
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
        },
      ]}
    >
      <View style={[styles.skeletonCircle, { backgroundColor: pulseBg }]} />
      <View style={[styles.skeletonTitle, { backgroundColor: pulseBg }]} />
      <View style={[styles.skeletonSub, { backgroundColor: pulseBg }]} />
    </View>
  );
}

export const HinchStoresSection = React.memo(function HinchStoresSection({
  stores,
  isLoading,
  error,
  isDark,
  onStorePress,
  onRetry,
}: HinchStoresSectionProps) {
  // If loading and no stores yet, show skeleton cards
  if (isLoading && stores.length === 0) {
    return (
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F87171' : '#991B1B' }]}>
          Hinch Stores
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <SkeletonStoreCard isDark={isDark} />
          <SkeletonStoreCard isDark={isDark} />
          <SkeletonStoreCard isDark={isDark} />
        </ScrollView>
      </View>
    );
  }

  // If error occurred and no stores loaded, show graceful error with retry
  if (error && stores.length === 0) {
    return (
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F87171' : '#991B1B' }]}>
          Hinch Stores
        </Text>
        <View
          style={[
            styles.stateBox,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#FEE2E2',
            },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={24} color="#EF4444" style={{ marginBottom: 6 }} />
          <Text style={[styles.stateText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
            Unable to load Hinch Stores
          </Text>
          {onRetry && (
            <TouchableOpacity onPress={onRetry} activeOpacity={0.7} style={styles.retryBtn}>
              <Ionicons name="refresh" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // If backend returns zero stores, show clean empty state (NO mock data!)
  if (!isLoading && stores.length === 0) {
    return (
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F87171' : '#991B1B' }]}>
          Hinch Stores
        </Text>
        <View
          style={[
            styles.stateBox,
            {
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
            },
          ]}
        >
          <MaterialCommunityIcons
            name="store-search-outline"
            size={28}
            color={isDark ? '#64748B' : '#94A3B8'}
            style={{ marginBottom: 6 }}
          />
          <Text style={[styles.stateText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            No Hinch Stores currently available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionWrap}>
      {/* Section Title matching reference UI ("IBO Stores" -> "Hinch Stores") */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#F87171' : '#991B1B' }]}>
        Hinch Stores
      </Text>

      {/* Horizontal List of Real Available Stores */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stores.map((store) => (
          <StoreCard
            key={`hinch-store-${store.storeId}`}
            store={store}
            isDark={isDark}
            onPress={() => onStorePress(store)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionWrap: {
    marginTop: 18,
    marginBottom: 6,
    width: '100%',
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 12,
  },
  storeCard: {
    width: 144,
    minHeight: 154,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageContainer: {
    width: 68,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  storeLogo: {
    width: 56,
    height: 52,
    borderRadius: 8,
  },
  monumentCircle: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 17,
    letterSpacing: -0.1,
    marginTop: 4,
  },
  storeCity: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  statusText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  radiusText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  skeletonCircle: {
    width: 54,
    height: 54,
    borderRadius: 14,
    marginBottom: 10,
  },
  skeletonTitle: {
    width: 86,
    height: 12,
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonSub: {
    width: 60,
    height: 10,
    borderRadius: 4,
  },
  stateBox: {
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E31E24',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  retryBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
