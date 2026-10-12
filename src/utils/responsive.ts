/**
 * HINCH MART — Responsive Utilities
 */
import { Dimensions, Platform, PixelRatio, ScaledSize } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design reference dimensions (iPhone 14)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Horizontal scale based on screen width
 */
export function horizontalScale(size: number): number {
  return (SCREEN_WIDTH / guidelineBaseWidth) * size;
}

/**
 * Vertical scale based on screen height
 */
export function verticalScale(size: number): number {
  return (SCREEN_HEIGHT / guidelineBaseHeight) * size;
}

/**
 * Moderate scale with factor for more subtle responsiveness
 */
export function moderateScale(size: number, factor = 0.5): number {
  return size + (horizontalScale(size) - size) * factor;
}

/**
 * Device type detection
 */
export type DeviceType = 'phone' | 'largePhone' | 'foldable' | 'tablet';

export function getDeviceType(): DeviceType {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  const diagonalPixels = Math.sqrt(adjustedWidth ** 2 + adjustedHeight ** 2);
  const diagonalInches = diagonalPixels / (pixelDensity * 160);

  if (diagonalInches >= 10) return 'tablet';
  if (diagonalInches >= 7) return 'foldable';
  if (SCREEN_WIDTH >= 414) return 'largePhone';
  return 'phone';
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  return getDeviceType() === 'tablet';
}

/**
 * Get number of columns for grids based on device type
 */
export function getGridColumns(defaultCols = 2): number {
  const device = getDeviceType();
  switch (device) {
    case 'tablet':
      return defaultCols * 2;
    case 'foldable':
      return defaultCols + 1;
    case 'largePhone':
      return defaultCols;
    default:
      return defaultCols;
  }
}

/**
 * Check if landscape orientation
 */
export function isLandscape(): boolean {
  return SCREEN_WIDTH > SCREEN_HEIGHT;
}

/**
 * Responsive value selector
 */
export function responsive<T>(values: {
  phone: T;
  largePhone?: T;
  foldable?: T;
  tablet?: T;
}): T {
  const device = getDeviceType();
  return values[device] ?? values.largePhone ?? values.phone;
}

export { SCREEN_WIDTH, SCREEN_HEIGHT };
