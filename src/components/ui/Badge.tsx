/**
 * HINCH MART — Clean Modern Badge, Chip & Avatar Components
 * Consistent 4px radius, clear semantic colors, refined typography
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import { getInitials } from '../../utils';

// Badge
export interface BadgeProps {
  label?: string | number;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'navy' | 'outlined';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'danger', size = 'md', icon, style }: BadgeProps) {
  const { theme, isDark } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: isDark ? '#4C0519' : '#FEF2F2', text: isDark ? '#F87171' : '#E31E24' };
      case 'success':
        return { bg: isDark ? '#064E3B' : '#ECFDF5', text: isDark ? '#34D399' : '#059669' };
      case 'danger':
        return { bg: isDark ? '#4C0519' : '#FEF2F2', text: isDark ? '#F87171' : '#DC2626' };
      case 'warning':
        return { bg: isDark ? '#451A03' : '#FFFBEB', text: isDark ? '#FBBF24' : '#D97706' };
      case 'info':
        return { bg: isDark ? '#0C4A6E' : '#F0F9FF', text: isDark ? '#38BDF8' : '#0284C7' };
      case 'navy':
        return { bg: isDark ? '#1E293B' : '#152238', text: '#FFFFFF' };
      case 'outlined':
        return { bg: 'transparent', text: isDark ? '#94A3B8' : '#64748B' };
    }
  };

  const { bg, text } = getColors();
  const isOutlined = variant === 'outlined';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        isOutlined && { borderWidth: 1, borderColor: isDark ? '#475569' : '#CBD5E1' },
        size === 'sm' && styles.badgeSm,
        style,
      ]}
    >
      {icon && <View style={styles.badgeIcon}>{icon}</View>}
      {label !== undefined && (
        <Text style={[styles.badgeText, { color: text }, size === 'sm' && styles.badgeTextSm]}>
          {label}
        </Text>
      )}
    </View>
  );
}

// Chip
export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  iconLeft?: React.ReactNode;
  style?: ViewStyle;
}

export function Chip({ label, selected = false, onPress, iconLeft, style }: ChipProps) {
  const { theme, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : isDark
            ? '#1E293B'
            : '#FFFFFF',
          borderColor: selected
            ? theme.colors.primary
            : isDark
            ? '#334155'
            : '#E2E8F0',
        },
        style,
      ]}
    >
      {iconLeft && <View style={styles.chipIcon}>{iconLeft}</View>}
      <Text
        style={[
          styles.chipText,
          {
            color: selected
              ? '#FFFFFF'
              : isDark
              ? '#F1F5F9'
              : '#334155',
            fontWeight: selected ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Avatar
export interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ source, name = 'User', size = 40, style }: AvatarProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDark ? '#334155' : '#E2E8F0',
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <Text
          style={[
            styles.avatarText,
            {
              color: isDark ? '#F1F5F9' : '#152238',
              fontSize: size * 0.38,
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeIcon: {
    marginRight: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  badgeTextSm: {
    fontSize: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});

export const HinchStatusBadge = Badge;
export const HinchChip = Chip;
