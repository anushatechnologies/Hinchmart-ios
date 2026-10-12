/**
 * HINCH MART Color System
 * IBO Home Building Megastore–inspired Premium Theme
 * Primary Action: Crimson Red #E31E24
 * Grey Canvas (#F5F6F8) + White Card Surfaces, Bold Text Hierarchy
 */

export const palette = {
  // Brand Colors (Moglix-inspired Red)
  primary: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#E31E24', // Moglix Signature Red
    600: '#D32F2F',
    700: '#C62828',
    800: '#B71C1C',
    900: '#8E0000',
  },

  navy: {
    50: '#E8EAF0',
    100: '#C5CAD6',
    200: '#9FA8BB',
    300: '#79879F',
    400: '#5C6D8B',
    500: '#3F5477',
    600: '#37496B',
    700: '#2C3B5B',
    800: '#222E4B',
    900: '#152238',
  },

  // Neutral
  neutral: {
    0: '#FFFFFF',
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#868E96',
    700: '#495057',
    800: '#343A40',
    900: '#1E293B',
    1000: '#0F172A',
  },

  // Semantic
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#16A34A',
    600: '#15803D',
    700: '#166534',
  },

  danger: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#E31E24',
    600: '#D32F2F',
    700: '#B71C1C',
  },

  warning: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },

  info: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
  },
} as const;

/**
 * ColorScheme interface — uses string to allow dark overrides
 */
export interface ColorScheme {
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceElevated: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  onPrimary: string;
  navy: string;
  navyLight: string;
  onNavy: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textInverse: string;
  textLink: string;
  border: string;
  borderLight: string;
  borderFocused: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  icon: string;
  iconSecondary: string;
  divider: string;
  overlay: string;
  shimmer: string;
  skeleton: string;
  skeletonHighlight: string;
  cardBackground: string;
  cardBorder: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;
  inputFocusBorder: string;
  inputErrorBorder: string;
  badgeBackground: string;
  badgeText: string;
  ratingFilled: string;
  ratingEmpty: string;
}

export const lightColors: ColorScheme = {
  background: '#F5F6F8', // IBO-style soft grey canvas
  surface: '#FFFFFF', // White card surfaces
  surfaceVariant: '#F0F1F3', // Slightly darker variant for nested surfaces
  surfaceElevated: '#FFFFFF', // Elevated cards remain white
  primary: palette.primary[500], // #E31E24 Crimson Red
  primaryLight: palette.primary[50],
  primaryDark: palette.primary[700],
  onPrimary: '#FFFFFF',
  navy: palette.navy[900],
  navyLight: palette.navy[700],
  onNavy: '#FFFFFF',
  textPrimary: '#1A1A1A', // Near-black for maximum readability
  textSecondary: '#5A6573', // Slightly darker grey for better legibility
  textTertiary: '#8C939D',
  textDisabled: palette.neutral[400],
  textInverse: '#FFFFFF',
  textLink: palette.primary[500],
  border: '#E8EAED', // Subtle grey borders on grey canvas
  borderLight: '#F0F1F3',
  borderFocused: palette.primary[500],
  success: '#16A34A',
  successLight: '#E8F5E9',
  danger: palette.danger[500],
  dangerLight: palette.danger[50],
  warning: palette.warning[500],
  warningLight: palette.warning[50],
  info: palette.info[500],
  infoLight: palette.info[50],
  icon: '#5A6573',
  iconSecondary: '#8C939D',
  divider: '#E8EAED',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shimmer: '#ECEDF0',
  skeleton: '#ECEDF0',
  skeletonHighlight: '#E0E2E6',
  cardBackground: '#FFFFFF', // Pure white cards on grey canvas
  cardBorder: '#ECEDF0', // Very subtle card borders
  tabBar: '#FFFFFF',
  tabBarActive: palette.primary[500],
  tabBarInactive: '#8C939D',
  inputBackground: '#FFFFFF',
  inputBorder: '#E0E2E6',
  inputPlaceholder: '#8C939D',
  inputFocusBorder: palette.primary[500],
  inputErrorBorder: palette.danger[500],
  badgeBackground: palette.primary[500],
  badgeText: '#FFFFFF',
  ratingFilled: '#F59E0B',
  ratingEmpty: '#E0E2E6',
};

export const gradients = {
  primary: ['#EF4444', '#E31E24'] as const,
  red: ['#FF5252', '#E31E24', '#B71C1C'] as const,
  gold: ['#FFC72C', '#F59E0B', '#D97706'] as const,
  goldBright: ['#FFE066', '#F59E0B'] as const,
  navy: ['#0B132B', '#152238', '#1C2E4A'] as const,
  navyDark: ['#090D16', '#111827', '#1F2937'] as const,
  blue: ['#2563EB', '#1D4ED8'] as const,
  emerald: ['#10B981', '#059669'] as const,
  amber: ['#F59E0B', '#D97706'] as const,
  purple: ['#8B5CF6', '#7C3AED'] as const,
  rose: ['#F43F5E', '#E11D48'] as const,
};

export const darkColors: ColorScheme = {
  background: '#121212', // IBO-style charcoal dark background
  surface: '#1E1E1E', // Card surfaces in dark mode
  surfaceVariant: '#2A2A2A', // Variant for nested dark surfaces
  surfaceElevated: '#2E2E2E', // Elevated cards slightly lighter
  primary: '#EF4444',
  primaryLight: '#3D1418',
  primaryDark: '#B71C1C',
  onPrimary: '#FFFFFF',
  navy: '#152238',
  navyLight: '#1C2E4A',
  onNavy: '#FFFFFF',
  textPrimary: '#F5F5F5', // High contrast white text
  textSecondary: '#A0A0A0', // Muted grey
  textTertiary: '#717171',
  textDisabled: '#4A4A4A',
  textInverse: '#121212',
  textLink: '#EF4444',
  border: '#333333', // Subtle dark borders
  borderLight: '#252525',
  borderFocused: '#EF4444',
  success: '#10B981',
  successLight: '#0D2818',
  danger: '#EF4444',
  dangerLight: '#3D1014',
  warning: '#F59E0B',
  warningLight: '#3D2700',
  info: '#3B82F6',
  infoLight: '#0D2240',
  icon: '#A0A0A0',
  iconSecondary: '#717171',
  divider: '#333333',
  overlay: 'rgba(0, 0, 0, 0.75)',
  shimmer: '#1E1E1E',
  skeleton: '#1E1E1E',
  skeletonHighlight: '#333333',
  cardBackground: '#1E1E1E',
  cardBorder: '#2A2A2A',
  tabBar: '#1E1E1E',
  tabBarActive: '#EF4444',
  tabBarInactive: '#717171',
  inputBackground: '#1E1E1E',
  inputBorder: '#333333',
  inputPlaceholder: '#717171',
  inputFocusBorder: '#EF4444',
  inputErrorBorder: '#EF4444',
  badgeBackground: '#EF4444',
  badgeText: '#FFFFFF',
  ratingFilled: '#F59E0B',
  ratingEmpty: '#333333',
};
