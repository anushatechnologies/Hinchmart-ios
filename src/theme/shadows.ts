/**
 * HINCH MART Shadow System
 * Platform-specific shadow presets
 */
import { Platform, ViewStyle } from 'react-native';

export interface ShadowPreset {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

function createShadow(
  offsetY: number,
  blur: number,
  opacity: number,
  elevation: number,
  color = '#000000'
): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blur,
      elevation,
    },
  }) as ViewStyle;
}

export const shadows = {
  none: createShadow(0, 0, 0, 0),
  xs: createShadow(1, 2, 0.05, 1),
  sm: createShadow(1, 3, 0.08, 2),
  md: createShadow(2, 6, 0.1, 4),
  lg: createShadow(4, 10, 0.12, 8),
  xl: createShadow(8, 16, 0.15, 12),
  '2xl': createShadow(12, 24, 0.18, 16),
  inner: createShadow(0, 0, 0, 0), // Handled via background color

  // Branded shadows
  primary: createShadow(2, 6, 0.15, 3, '#E31E24'),
  navy: createShadow(2, 6, 0.15, 3, '#152238'),
  card: createShadow(1, 4, 0.06, 2), // IBO-style subtle card elevation
  cardHover: createShadow(2, 8, 0.1, 4), // Pressed/focused card
  button: createShadow(1, 3, 0.1, 2),
  modal: createShadow(4, 16, 0.15, 8),
  bottomSheet: createShadow(-2, 8, 0.08, 6),
  header: createShadow(0, 2, 0.08, 3), // Clean header drop shadow
  tabBar: createShadow(0, -1, 0.04, 3), // Minimal upward shadow
  sticky: createShadow(0, -2, 0.08, 4), // Sticky bottom bar shadow
} as const;

export type Shadow = keyof typeof shadows;
export type ShadowMap = typeof shadows;
