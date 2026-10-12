/**
 * HINCH MART — OrderCard Component (HinchOrderCard)
 * Standardized order tracking and history card
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export interface OrderCardProps {
  id: string;
  orderNumber: string;
  placedDate: string;
  itemCount: number;
  status: 'CONFIRMED' | 'SHIPPED' | 'OUT FOR DELIVERY' | 'DELIVERED' | 'CANCELLED';
  statusText: string;
  statusIcon?: keyof typeof Ionicons.glyphMap;
  progressPercent?: number;
  product: {
    title: string;
    specs: string;
    price: string;
    image: string;
  };
  onPress: () => void;
  onTrackPress?: () => void;
  onInvoicePress?: () => void;
  onCancelPress?: () => void;
  style?: ViewStyle;
}

export function OrderCard({
  orderNumber,
  placedDate,
  itemCount,
  status,
  statusText,
  statusIcon = 'cube-outline',
  progressPercent = 0.5,
  product,
  onPress,
  onTrackPress,
  onInvoicePress,
  onCancelPress,
  style,
}: OrderCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getStatusBadgeStyle = () => {
    switch (status) {
      case 'DELIVERED':
        return { bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5', text: '#10B981' };
      case 'SHIPPED':
        return { bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', text: '#3B82F6' };
      case 'OUT FOR DELIVERY':
        return { bg: isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF', text: '#A855F7' };
      case 'CANCELLED':
        return { bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', text: '#EF4444' };
      default:
        return { bg: isDark ? 'rgba(227, 30, 36, 0.15)' : '#FEF2F2', text: '#E31E24' };
    }
  };

  const badgeColors = getStatusBadgeStyle();

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={[styles.container, animStyle, style]}
    >
      <View
        style={[
          styles.cardInner,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        {/* Header: Order ID, Date & Status Badge */}
        <View style={[styles.headerRow, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
          <View>
            <Text style={[styles.orderNumberText, { color: theme.colors.textPrimary }]}>
              {orderNumber}
            </Text>
            <Text style={[styles.dateText, { color: theme.colors.textTertiary }]}>
              Placed on {placedDate}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeColors.text }]}>
              {status}
            </Text>
          </View>
        </View>

        {/* Content: Main Product Info */}
        <View style={styles.bodyRow}>
          <View style={[styles.imageWrap, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            {product.image ? (
              <Image
                source={{ uri: product.image }}
                style={styles.productImage}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : (
              <Ionicons name="cube-outline" size={24} color="#94A3B8" />
            )}
          </View>

          <View style={styles.detailsWrap}>
            <Text
              numberOfLines={2}
              style={[styles.productTitle, { color: theme.colors.textPrimary }]}
            >
              {product.title}
            </Text>

            <Text
              numberOfLines={1}
              style={[styles.specsText, { color: theme.colors.textSecondary }]}
            >
              {product.specs}
            </Text>

            <View style={styles.priceRow}>
              <Text style={[styles.priceText, { color: theme.colors.textPrimary }]}>
                {product.price}
              </Text>
              {itemCount > 1 && (
                <Text style={[styles.moreItemsText, { color: theme.colors.textTertiary }]}>
                  +{itemCount - 1} more items
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Tracking Status Progress Bar (if not cancelled) */}
        {status !== 'CANCELLED' && (
          <View style={[styles.statusStrip, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            <View style={styles.statusTextRow}>
              <Ionicons name={statusIcon} size={14} color={badgeColors.text} />
              <Text
                numberOfLines={1}
                style={[styles.statusSubText, { color: theme.colors.textSecondary }]}
              >
                {statusText}
              </Text>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progressPercent * 100)}%`,
                    backgroundColor: badgeColors.text,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={[styles.actionsRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
          {onInvoicePress && (
            <TouchableOpacity
              onPress={onInvoicePress}
              activeOpacity={0.7}
              style={[styles.secondaryBtn, { borderColor: isDark ? '#475569' : '#CBD5E1' }]}
            >
              <Ionicons name="receipt-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
                Invoice
              </Text>
            </TouchableOpacity>
          )}

          {status !== 'DELIVERED' && status !== 'CANCELLED' && onCancelPress && (
            <TouchableOpacity
              onPress={onCancelPress}
              activeOpacity={0.7}
              style={[styles.secondaryBtn, { borderColor: '#FCA5A5' }]}
            >
              <Text style={[styles.secondaryBtnText, { color: '#EF4444' }]}>Cancel</Text>
            </TouchableOpacity>
          )}

          {onTrackPress ? (
            <TouchableOpacity
              onPress={onTrackPress}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name="locate" size={13} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Track Order</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.primaryBtnText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </AnimatedTouchable>
  );
}

export const HinchOrderCard = OrderCard;

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  cardInner: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  orderNumberText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 13,
  },
  dateText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 10.5,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  bodyRow: {
    flexDirection: 'row',
    padding: 12,
  },
  imageWrap: {
    width: 68,
    height: 68,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: '88%',
    height: '88%',
  },
  detailsWrap: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 12.5,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
  },
  specsText: {
    fontSize: 10.5,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 14,
  },
  moreItemsText: {
    fontSize: 10.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statusStrip: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 8,
    borderRadius: 6,
  },
  statusTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusSubText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    flex: 1,
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11.5,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  primaryBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11.5,
    color: '#FFFFFF',
  },
});
