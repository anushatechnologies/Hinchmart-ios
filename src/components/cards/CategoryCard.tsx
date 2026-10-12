/**
 * HINCH MART — CategoryCard Component (HinchCategoryCard)
 * Moglix-inspired category card with circular and elevated card variants
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export interface CategoryCardProps {
  id: string;
  name: string;
  image?: string;
  icon?: string;
  productCount?: number;
  isSelected?: boolean;
  onPress: () => void;
  variant?: 'circle' | 'card';
  style?: ViewStyle;
}

export function CategoryCard({
  name,
  image,
  productCount,
  isSelected = false,
  onPress,
  variant = 'circle',
  style,
}: CategoryCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (variant === 'card') {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.cardContainer, animStyle, style]}
      >
        <View
          style={[
            styles.cardInner,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isSelected ? theme.colors.primary : (isDark ? '#334155' : '#E2E8F0'),
            },
            isSelected && styles.cardSelected,
          ]}
        >
          <View style={[styles.cardImageWrap, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.cardImage}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.placeholderBox} />
            )}
          </View>

          <View style={styles.cardContent}>
            <Text
              numberOfLines={2}
              style={[
                styles.cardTitle,
                {
                  color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                  fontFamily: isSelected ? (Platform.OS === 'ios' ? 'System' : 'sans-serif-medium') : (Platform.OS === 'ios' ? 'System' : 'sans-serif'),
                  fontWeight: isSelected ? '700' : '600',
                },
              ]}
            >
              {name}
            </Text>
            {productCount != null && (
              <Text style={[styles.cardCount, { color: theme.colors.textTertiary }]}>
                {productCount} items
              </Text>
            )}
          </View>
        </View>
      </AnimatedTouchable>
    );
  }

  // Circular variant (default for Home Screen)
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[styles.circleContainer, animStyle, style]}
    >
      <View
        style={[
          styles.circleRing,
          {
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isSelected ? theme.colors.primary : (isDark ? '#334155' : '#E2E8F0'),
          },
          isSelected && styles.circleRingSelected,
        ]}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.circleImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.placeholderBox} />
        )}
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.circleTitle,
          {
            color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
            fontFamily: isSelected ? (Platform.OS === 'ios' ? 'System' : 'sans-serif-medium') : (Platform.OS === 'ios' ? 'System' : 'sans-serif'),
            fontWeight: isSelected ? '700' : '500',
          },
        ]}
      >
        {name}
      </Text>
    </AnimatedTouchable>
  );
}

export const HinchCategoryCard = CategoryCard;

const styles = StyleSheet.create({
  // Circle Variant Styles
  circleContainer: {
    alignItems: 'center',
    width: 68,
    marginRight: 10,
  },
  circleRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleRingSelected: {
    borderWidth: 1.5,
  },
  circleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  circleTitle: {
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 13,
    minHeight: 26,
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#E2E8F0',
  },

  // Card Variant Styles
  cardContainer: {
    width: '31%',
    marginBottom: 10,
  },
  cardInner: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 6,
  },
  cardSelected: {
    borderWidth: 1.5,
  },
  cardImageWrap: {
    width: '100%',
    height: 64,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '85%',
    height: '85%',
  },
  cardContent: {
    marginTop: 5,
    alignItems: 'center',
    width: '100%',
  },
  cardTitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  cardCount: {
    fontSize: 9.5,
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});
