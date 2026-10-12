/**
 * HINCH MART Light Theme
 */
import { ColorScheme, lightColors } from './colors';
import { typography, fontFamilies, fontSizes } from './typography';
import { spacing, borderRadius, iconSizes } from './spacing';
import { shadows, ShadowMap } from './shadows';

export interface AppTheme {
  dark: boolean;
  colors: ColorScheme;
  typography: typeof typography;
  fontFamilies: typeof fontFamilies;
  fontSizes: typeof fontSizes;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  iconSizes: typeof iconSizes;
  shadows: ShadowMap;
}

export const lightTheme: AppTheme = {
  dark: false,
  colors: lightColors,
  typography,
  fontFamilies,
  fontSizes,
  spacing,
  borderRadius,
  iconSizes,
  shadows,
};
