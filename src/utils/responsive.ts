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
  // Direct iOS tablet detection (iPad Air 11-inch, iPad Pro, iPad mini, etc.)
  if (Platform.OS === 'ios' && Platform.isPad) {
    return 'tablet';
  }

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
 * Check if device is tablet (iPad Air 11-inch, iPad, or Android tablet)
 */
export function isTablet(): boolean {
  if (Platform.OS === 'ios' && Platform.isPad) {
    return true;
  }
  return getDeviceType() === 'tablet';
}

/**
 * Check if current device is specifically an iPad
 */
export function isIPad(): boolean {
  return Platform.OS === 'ios' && Platform.isPad;
}

/**
 * Tablet-safe scaling helper to prevent elements or fonts from overflowing on iPads
 */
export function tabletScale(size: number, maxScale = 1.35): number {
  if (isTablet()) {
    const scale = SCREEN_WIDTH / guidelineBaseWidth;
    return size * Math.min(scale, maxScale);
  }
  return horizontalScale(size);
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
