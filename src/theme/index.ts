/**
 * HINCH MART Theme — Public API
 */
export { palette, lightColors, darkColors } from './colors';
export type { ColorScheme } from './colors';

export { typography, fontFamilies, fontSizes, responsiveFontSize, lineHeights, letterSpacings } from './typography';
export type { TypographyVariant, TextStyle as AppTextStyle } from './typography';

export { spacing, borderRadius, iconSizes, hitSlop, layout } from './spacing';
export type { Spacing, BorderRadius, IconSize } from './spacing';

export { shadows } from './shadows';
export type { Shadow } from './shadows';

export { lightTheme } from './lightTheme';
export type { AppTheme } from './lightTheme';
export { darkTheme } from './darkTheme';

export { ThemeProvider, useTheme } from './ThemeProvider';
export type { ThemeMode } from './ThemeProvider';
