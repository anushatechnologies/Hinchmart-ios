/**
 * HINCH MART — Rating & Stepper Components
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

// Rating Component
export interface RatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  showCount?: boolean;
  count?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  style?: ViewStyle;
}

export function Rating({
  rating,
  maxRating = 5,
  size = 16,
  showCount = false,
  count,
  interactive = false,
  onRatingChange,
  style,
}: RatingProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.ratingContainer, style]}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const isFilled = index + 1 <= Math.floor(rating);
        const isHalf = index + 1 > Math.floor(rating) && index < rating;

        return (
          <TouchableOpacity
            key={index}
            disabled={!interactive}
            onPress={() => onRatingChange?.(index + 1)}
            style={styles.starTouch}
          >
            <Text
              style={{
                fontSize: size,
                color: isFilled || isHalf ? theme.colors.primary : theme.colors.ratingEmpty,
              }}
            >
              ★
            </Text>
          </TouchableOpacity>
        );
      })}

      {showCount && (
        <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
          {rating.toFixed(1)} {count !== undefined && `(${count})`}
        </Text>
      )}
    </View>
  );
}

// Quantity Stepper Component
export interface StepperProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  style?: ViewStyle;
}

export function Stepper({
  value,
  onValueChange,
  min = 1,
  max = 9999,
  step = 1,
  style,
}: StepperProps) {
  const { theme } = useTheme();

  const handleMinus = () => {
    if (value - step >= min) {
      onValueChange(value - step);
    }
  };

  const handlePlus = () => {
    if (value + step <= max) {
      onValueChange(value + step);
    }
  };

  return (
    <View
      style={[
        styles.stepperContainer,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={handleMinus}
        disabled={value <= min}
        style={[styles.stepperBtn, value <= min && styles.disabledBtn]}
      >
        <Text style={[styles.stepperBtnText, { color: theme.colors.textPrimary }]}>-</Text>
      </TouchableOpacity>

      <Text style={[styles.stepperValue, { color: theme.colors.textPrimary }]}>{value}</Text>

      <TouchableOpacity
        onPress={handlePlus}
        disabled={value >= max}
        style={[styles.stepperBtn, value >= max && styles.disabledBtn]}
      >
        <Text style={[styles.stepperBtnText, { color: theme.colors.textPrimary }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouch: {
    marginRight: 2,
  },
  ratingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginLeft: 6,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  disabledBtn: {
    opacity: 0.3,
  },
  stepperBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  stepperValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    paddingHorizontal: 12,
  },
});
