/**
 * HINCH MART — EmptyState Component (HinchEmptyState)
 * Clean, intentional empty state presentation across cart, wishlist, orders, and search
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'cube-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}: EmptyStateProps) {
  const { theme, isDark } = useTheme();
  const btnScale = useSharedValue(1);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const handlePressIn = () => {
    btnScale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    btnScale.value = withSpring(1, { damping: 15 });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Icon Circle */}
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDark ? 'rgba(227, 30, 36, 0.12)' : '#FEF2F2',
          },
        ]}
      >
        <Ionicons name={icon} size={42} color={theme.colors.primary} />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>

      {/* Subtitle */}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}

      {/* Primary Action Button */}
      {actionLabel && onAction ? (
        <AnimatedTouchable
          onPress={onAction}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
          style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }, btnAnimStyle]}
        >
          <Text style={styles.primaryBtnText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </AnimatedTouchable>
      ) : null}

      {/* Secondary Action */}
      {secondaryActionLabel && onSecondaryAction ? (
        <TouchableOpacity
          onPress={onSecondaryAction}
          activeOpacity={0.7}
          style={styles.secondaryBtn}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
            {secondaryActionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const HinchEmptyState = EmptyState;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: 300,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 180,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});
