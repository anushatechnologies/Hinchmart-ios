/**
 * HINCH MART — Clean Modern Button Component
 * Standardized 44px height, clean 8px radius, solid colors, crisp spring animation
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'navy'
  | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = true,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: theme.colors.primary,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '700',
          },
        };
      case 'navy':
        return {
          container: {
            backgroundColor: '#1E293B',
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '600',
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: isDark ? '#334155' : '#F8F9FA',
            borderWidth: 1,
            borderColor: isDark ? '#475569' : '#E2E8F0',
          },
          text: {
            color: isDark ? '#F1F5F9' : '#1E293B',
            fontWeight: '600',
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.colors.primary,
          },
          text: {
            color: theme.colors.primary,
            fontWeight: '600',
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: theme.colors.primary,
            fontWeight: '600',
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: '#EF4444',
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '600',
          },
        };
      case 'success':
        return {
          container: {
            backgroundColor: '#10B981',
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '600',
          },
        };
      default:
        return {
          container: {
            backgroundColor: theme.colors.primary,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '700',
          },
        };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 6,
            minHeight: 34,
          },
          text: {
            fontSize: 12,
            lineHeight: 16,
          },
        };
      case 'md':
        return {
          container: {
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
            minHeight: 44,
          },
          text: {
            fontSize: 14,
            lineHeight: 18,
          },
        };
      case 'lg':
        return {
          container: {
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 8,
            minHeight: 50,
          },
          text: {
            fontSize: 15,
            lineHeight: 20,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || isLoading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        (disabled || isLoading) && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
          <Text
            style={[
              styles.textBase,
              sizeStyles.text,
              variantStyles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
});

export function HinchPrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="primary" />;
}

export function HinchSecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="secondary" />;
}
