/**
 * HINCH MART — Production App Update Configuration
 * 
 * Central settings for in-app update prompts, store redirect URLs,
 * and background verification cooldowns.
 */
import { Platform } from 'react-native';

/** Application bundle / package identifiers */
export const APP_PACKAGE_NAME = 'com.hinch';
export const IOS_APP_STORE_ID = '6766501000';

/** Official Google Play Store URLs */
export const PLAY_STORE_MARKET_URI = `market://details?id=${APP_PACKAGE_NAME}`;
export const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${APP_PACKAGE_NAME}`;

/** Official Apple App Store URLs */
export const APP_STORE_WEB_URL = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;
export const APP_STORE_NATIVE_URI = `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}`;

/**
 * Whitelist of verified store domains to prevent phishing or malicious redirects.
 */
export const TRUSTED_STORE_DOMAINS = [
  'play.google.com',
  'apps.apple.com',
  'market://details',
  'itms-apps://',
] as const;

/**
 * Returns the platform-appropriate store redirect URL.
 */
export function getPlatformStoreUrl(): string {
  if (Platform.OS === 'ios') {
    return APP_STORE_WEB_URL;
  }
  return PLAY_STORE_WEB_URL;
}

/**
 * Validates that an update URL belongs to official store domains.
 */
export function isValidStoreUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return TRUSTED_STORE_DOMAINS.some((domain) => lower.includes(domain));
}

/** Check interval: Minimum time between server checks to prevent API flooding (2 hours) */
export const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;

/** Re-prompt interval: Time before re-prompting an optional update after user taps "Later" (24 hours) */
export const UPDATE_REPROMPT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Maximum number of dismissals before an optional update re-prompts permanently */
export const MAX_DISMISS_COUNT = 5;

/** Backend endpoint for dynamic update rules */
export const APP_VERSION_ENDPOINT = '/api/app-version';

/** Default release notes if backend or store doesn't provide custom notes */
export const DEFAULT_RELEASE_NOTES = [
  'Improved app performance and faster loading speeds',
  'Fixed bugs and enhanced reliability',
  'Improved Google Maps delivery site pinpointing',
  'Instant Razorpay checkout and live order tracking',
  'Security and system stability improvements',
];
