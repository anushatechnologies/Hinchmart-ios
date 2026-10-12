/**
 * HINCH MART — Clean Modern Card Component
 * Standardized 8px border radius, subtle borders, crisp shadow presets
 */
import React from 'react';
import { TouchableOpacity, View, ViewStyle, StyleSheet, StyleProp, Platform } from 'react-native';
import { useTheme, Shadow } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled' | 'glassmorphic';
  shadowPreset?: Shadow;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  onPress,
  variant = 'outlined',
  shadowPreset = 'card',
  style,
}: CardProps) {
  const { theme, isDark } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#F1F5F9',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.2 : 0.04,
              shadowRadius: 6,
            },
            android: { elevation: 2 },
          }),
        };
      case 'outlined':
        return {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#E2E8F0',
        };
      case 'filled':
        return {
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#E2E8F0',
        };
      case 'glassmorphic':
        return {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#E2E8F0',
        };
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        style={[styles.base, getVariantStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, getVariantStyle(), style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    padding: 12,
  },
});
