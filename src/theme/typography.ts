/**
 * HINCH MART Typography System
 * Headings: Poppins | Body: Inter (with System fallbacks for Expo Go)
 */
import { Platform, PixelRatio, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Base scale factor for responsive fonts
const scale = SCREEN_WIDTH / 375; // iPhone 12/13/14 base

export function responsiveFontSize(size: number): number {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
}

const isIOS = Platform.OS === 'ios';

export const fontFamilies = {
  poppins: {
    thin: isIOS ? 'System' : 'sans-serif-thin',
    extraLight: isIOS ? 'System' : 'sans-serif-light',
    light: isIOS ? 'System' : 'sans-serif-light',
    regular: isIOS ? 'System' : 'sans-serif',
    medium: isIOS ? 'System' : 'sans-serif-medium',
    semiBold: isIOS ? 'System' : 'sans-serif-medium',
    bold: isIOS ? 'System' : 'sans-serif-medium',
    extraBold: isIOS ? 'System' : 'sans-serif-medium',
    black: isIOS ? 'System' : 'sans-serif-medium',
  },
  inter: {
    thin: isIOS ? 'System' : 'sans-serif-thin',
    extraLight: isIOS ? 'System' : 'sans-serif-light',
    light: isIOS ? 'System' : 'sans-serif-light',
    regular: isIOS ? 'System' : 'sans-serif',
    medium: isIOS ? 'System' : 'sans-serif-medium',
    semiBold: isIOS ? 'System' : 'sans-serif-medium',
    bold: isIOS ? 'System' : 'sans-serif-medium',
    extraBold: isIOS ? 'System' : 'sans-serif-medium',
    black: isIOS ? 'System' : 'sans-serif-medium',
  },
} as const;

export const fontSizes = {
  '2xs': responsiveFontSize(10),
  xs: responsiveFontSize(11),
  sm: responsiveFontSize(12),
  md: responsiveFontSize(14),
  lg: responsiveFontSize(16),
  xl: responsiveFontSize(18),
  '2xl': responsiveFontSize(20),
  '3xl': responsiveFontSize(24),
  '4xl': responsiveFontSize(28),
  '5xl': responsiveFontSize(32),
  '6xl': responsiveFontSize(36),
  '7xl': responsiveFontSize(42),
  '8xl': responsiveFontSize(48),
} as const;

export const lineHeights = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const letterSpacings = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'bold' | 'normal';
}

export const typography = {
  // Display
  displayLarge: {
    fontFamily: fontFamilies.poppins.bold,
    fontSize: fontSizes['8xl'],
    lineHeight: fontSizes['8xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tighter,
  },
  displayMedium: {
    fontFamily: fontFamilies.poppins.bold,
    fontSize: fontSizes['7xl'],
    lineHeight: fontSizes['7xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tighter,
  },
  displaySmall: {
    fontFamily: fontFamilies.poppins.semiBold,
    fontSize: fontSizes['6xl'],
    lineHeight: fontSizes['6xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },

  // Headings
  h1: {
    fontFamily: fontFamilies.poppins.bold,
    fontSize: fontSizes['5xl'],
    lineHeight: fontSizes['5xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  h2: {
    fontFamily: fontFamilies.poppins.semiBold,
    fontSize: fontSizes['4xl'],
    lineHeight: fontSizes['4xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  h3: {
    fontFamily: fontFamilies.poppins.semiBold,
    fontSize: fontSizes['3xl'],
    lineHeight: fontSizes['3xl'] * lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  h4: {
    fontFamily: fontFamilies.poppins.semiBold,
    fontSize: fontSizes['2xl'],
    lineHeight: fontSizes['2xl'] * lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  h5: {
    fontFamily: fontFamilies.poppins.medium,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  h6: {
    fontFamily: fontFamilies.poppins.medium,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },

  // Body
  bodyLarge: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  bodyMedium: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },

  // Body Bold
  bodyLargeBold: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  bodyMediumBold: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  bodySmallBold: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },

  // Labels
  labelLarge: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.snug,
    letterSpacing: letterSpacings.wide,
  },
  labelMedium: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.snug,
    letterSpacing: letterSpacings.wide,
  },
  labelSmall: {
    fontFamily: fontFamilies.inter.medium,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.snug,
    letterSpacing: letterSpacings.wider,
  },

  // Captions
  caption: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },
  captionBold: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },

  // Overline
  overline: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: fontSizes['2xs'],
    lineHeight: fontSizes['2xs'] * lineHeights.normal,
    letterSpacing: letterSpacings.widest,
  },

  // Button
  buttonLarge: {
    fontFamily: fontFamilies.poppins.semiBold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.snug,
    letterSpacing: letterSpacings.wide,
  },
  buttonMedium: {
    fontFamily: fontFamilies.poppins.semiBold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.snug,
    letterSpacing: letterSpacings.wide,
  },
  buttonSmall: {
    fontFamily: fontFamilies.poppins.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.snug,
    letterSpacing: letterSpacings.wide,
  },

  // Price Display
  priceLarge: {
    fontFamily: fontFamilies.poppins.bold,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  price: {
    fontFamily: fontFamilies.poppins.bold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.tight,
    letterSpacing: letterSpacings.normal,
  },
  priceSmall: {
    fontFamily: fontFamilies.inter.semiBold,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.tight,
    letterSpacing: letterSpacings.normal,
  },
  priceCompare: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },

  // Section Headers
  sectionTitle: {
    fontFamily: fontFamilies.poppins.semiBold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  sectionSubtitle: {
    fontFamily: fontFamilies.inter.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
} as const;

export type TypographyVariant = keyof typeof typography;
