/**
 * HINCH MART Spacing System
 * Base unit: 4px
 */

export const spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const hitSlop = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
} as const;

export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
export type IconSize = keyof typeof iconSizes;

/** Named layout constants for consistent screen-level padding and component sizing */
export const layout = {
  screenPaddingH: 16,
  headerHeight: 56,
  tabBarHeight: 56,
  searchBarHeight: 44,
  buttonHeightSm: 36,
  buttonHeightMd: 44,
  buttonHeightLg: 52,
  cardRadius: 10,
  chipRadius: 6,
  pillRadius: 20,
  inputRadius: 8,
  sectionGap: 24,
  gridGap: 12,
  cardElevation: 2,
  stickyBarHeight: 64,
} as const;

