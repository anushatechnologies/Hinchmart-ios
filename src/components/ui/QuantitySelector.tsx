/**
 * HINCH MART — QuantitySelector Component (HinchQuantitySelector)
 * Compact, tactile stepper for precise quantity adjustment with micro-animations
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (newValue: number) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}

export function QuantitySelector({
  value,
  min = 1,
  max = 9999,
  onChange,
  size = 'md',
  disabled = false,
  style,
}: QuantitySelectorProps) {
  const { theme, isDark } = useTheme();

  const minusScale = useSharedValue(1);
  const plusScale = useSharedValue(1);

  const minusAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: minusScale.value }],
  }));

  const plusAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plusScale.value }],
  }));

  const handleDecrement = () => {
    if (disabled || value <= min) return;
    minusScale.value = withSpring(0.8, { damping: 10 }, () => {
      minusScale.value = withSpring(1, { damping: 12 });
    });
    onChange(value - 1);
  };

  const handleIncrement = () => {
    if (disabled || value >= max) return;
    plusScale.value = withSpring(0.8, { damping: 10 }, () => {
      plusScale.value = withSpring(1, { damping: 12 });
    });
    onChange(value + 1);
  };

  const isMinDisabled = disabled || value <= min;
  const isMaxDisabled = disabled || value >= max;

  const getContainerHeight = () => {
    switch (size) {
      case 'sm': return 28;
      case 'lg': return 40;
      default: return 34;
    }
  };

  const getButtonWidth = () => {
    switch (size) {
      case 'sm': return 28;
      case 'lg': return 40;
      default: return 34;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return 11.5;
      case 'lg': return 15;
      default: return 13;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 13;
      case 'lg': return 18;
      default: return 15;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: getContainerHeight(),
          borderColor: isDark ? '#334155' : '#E2E8F0',
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
        },
        style,
      ]}
    >
      <AnimatedTouchable
        onPress={handleDecrement}
        disabled={isMinDisabled}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          styles.stepBtn,
          { width: getButtonWidth() },
          minusAnimStyle,
        ]}
      >
        <Ionicons
          name="remove"
          size={getIconSize()}
          color={isMinDisabled ? (isDark ? '#475569' : '#CBD5E1') : theme.colors.textPrimary}
        />
      </AnimatedTouchable>

      <View style={styles.valueWrap}>
        <Text
          style={[
            styles.valueText,
            {
              fontSize: getFontSize(),
              color: theme.colors.textPrimary,
            },
          ]}
        >
          {value}
        </Text>
      </View>

      <AnimatedTouchable
        onPress={handleIncrement}
        disabled={isMaxDisabled}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          styles.stepBtn,
          { width: getButtonWidth() },
          plusAnimStyle,
        ]}
      >
        <Ionicons
          name="add"
          size={getIconSize()}
          color={isMaxDisabled ? (isDark ? '#475569' : '#CBD5E1') : theme.colors.textPrimary}
        />
      </AnimatedTouchable>
    </View>
  );
}

export const HinchQuantitySelector = QuantitySelector;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepBtn: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueWrap: {
    paddingHorizontal: 8,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    textAlign: 'center',
  },
});
