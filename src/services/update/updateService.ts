/**
 * HINCH MART — Production App Update Service
 * 
 * Multi-tiered production update detection:
 * 1. Backend dynamic configuration API (GET /api/app-version)
 * 2. Official Google Play Store Live Resolver (parses published version from Play Store for com.hinch)
 * 3. Secure offline cache via MMKV (prevents false alerts on connection drops)
 * 4. Official platform store launching (market://details?id=com.hinch with web fallback)
 */
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import apiClient from '../api/client';
import { mmkvStorage } from '../storage/mmkv';
import {
  compareVersions,
  isUpdateAvailable,
  isForceUpdateRequired,
} from './versionUtils';
import {
  APP_PACKAGE_NAME,
  PLAY_STORE_MARKET_URI,
  PLAY_STORE_WEB_URL,
  APP_STORE_NATIVE_URI,
  APP_STORE_WEB_URL,
  APP_VERSION_ENDPOINT,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_REPROMPT_INTERVAL_MS,
  MAX_DISMISS_COUNT,
  DEFAULT_RELEASE_NOTES,
  getPlatformStoreUrl,
  isValidStoreUrl,
} from '../../config/updateConfig';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

export interface AppVersionInfo {
  platform: 'android' | 'ios';
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  storeUrl: string;
  title?: string;
  message?: string;
  releaseNotes: string[];
}

export interface UpdateCheckResult {
  updateType: 'optional' | 'force';
  currentVersion: string;
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  title?: string;
  message?: string;
  releaseNotes: string[];
}

interface DismissedUpdateRecord {
  version: string;
  dismissedAt: number;
  dismissCount: number;
}

const STORAGE_KEYS = {
  LAST_CHECK_TIME: 'hinchmart_update_last_check',
  DISMISSED_UPDATE: 'hinchmart_update_dismissed',
  CACHED_VERSION_INFO: 'hinchmart_cached_version_info',
} as const;

/**
 * Reads the actual installed application version.
 * Extracted at runtime from native build metadata or Expo Constants.
 */
export function getInstalledVersion(): string {
  const expoVer =
    Constants.expoConfig?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    (Constants as any).manifest?.version;

  if (expoVer && typeof expoVer === 'string') {
    return expoVer.trim();
  }

  if (Constants.nativeAppVersion && typeof Constants.nativeAppVersion === 'string') {
    return Constants.nativeAppVersion.trim();
  }

  return '1.0.16';
}

/**
 * Resolves the live published version from the official Google Play Store listing.
 */
async function fetchPlayStoreVersion(packageName: string = APP_PACKAGE_NAME): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const url = `https://play.google.com/store/apps/details?id=${packageName}&hl=en&gl=IN`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();

    // Pattern 1: Array pattern matching ["1.0.9"]
    const matchArray = html.match(/\["([0-9]+\.[0-9]+\.[0-9]+)"\]/);
    if (matchArray && matchArray[1]) {
      return matchArray[1];
    }

    // Pattern 2: Triple-nested array pattern [[["1.0.9"]]]
    const matchNested = html.match(/\[\[\["([0-9]+\.[0-9]+\.[0-9]+)"\]/);
    if (matchNested && matchNested[1]) {
      return matchNested[1];
    }

    // Pattern 3: itemprop softwareVersion
    const matchItemprop = html.match(/itemprop="softwareVersion">([^<]+)<\/div>/);
    if (matchItemprop && matchItemprop[1]) {
      return matchItemprop[1].trim();
    }
  } catch {
    // Network timeout / offline
  }

  return null;
}

/**
 * Retrieves the latest production version configuration.
 * Prioritizes backend API -> fallback to Google Play Store resolver -> fallback to cache.
 */
export async function fetchLatestVersionInfo(): Promise<AppVersionInfo | null> {
  const currentPlatform = Platform.OS === 'ios' ? 'ios' : 'android';

  // 1. Try Backend API endpoint
  try {
    const response = await apiClient.get<any>(APP_VERSION_ENDPOINT, {
      params: { platform: currentPlatform },
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });

    if (response.status === 200 && response.data) {
      const payload = response.data?.data || response.data;
      if (payload && payload.latestVersion) {
        const info: AppVersionInfo = {
          platform: currentPlatform,
          latestVersion: String(payload.latestVersion).trim(),
          minimumSupportedVersion: String(
            payload.minimumSupportedVersion || payload.latestVersion
          ).trim(),
          forceUpdate: Boolean(payload.forceUpdate),
          storeUrl: String(payload.storeUrl || getPlatformStoreUrl()),
          title: payload.title || 'New Update Available',
          message:
            payload.message ||
            'Update HinchMart to get the latest features, security updates, and performance improvements.',
          releaseNotes: Array.isArray(payload.releaseNotes) && payload.releaseNotes.length > 0
            ? payload.releaseNotes
            : DEFAULT_RELEASE_NOTES,
        };

        // Cache for offline resilience
        mmkvStorage.setObject(STORAGE_KEYS.CACHED_VERSION_INFO, info);
        return info;
      }
    }
  } catch {
    // Backend API unavailable / 401 unauthenticated
  }

  // 2. Try Google Play Store Live Resolver (for Android)
  if (Platform.OS === 'android') {
    const playStoreVersion = await fetchPlayStoreVersion(APP_PACKAGE_NAME);
    if (playStoreVersion) {
      const info: AppVersionInfo = {
        platform: 'android',
        latestVersion: playStoreVersion,
        minimumSupportedVersion: '1.0.7',
        forceUpdate: false,
        storeUrl: PLAY_STORE_WEB_URL,
        title: 'New Update Available',
        message: 'A newer version of HinchMart is available with improved performance and bug fixes.',
        releaseNotes: DEFAULT_RELEASE_NOTES,
      };

      mmkvStorage.setObject(STORAGE_KEYS.CACHED_VERSION_INFO, info);
      return info;
    }
  }

  // 3. Fallback to cached version info (for offline resilience)
  const cached = mmkvStorage.getObject<AppVersionInfo>(STORAGE_KEYS.CACHED_VERSION_INFO);
  if (cached) {
    return cached;
  }

  return null;
}

/**
 * Checks if sufficient time has elapsed since the last check.
 */
export function shouldCheckForUpdate(): boolean {
  const lastCheck = mmkvStorage.getNumber(STORAGE_KEYS.LAST_CHECK_TIME);
  if (!lastCheck) return true;
  return Date.now() - lastCheck >= UPDATE_CHECK_INTERVAL_MS;
}

/**
 * Records check timestamp.
 */
export function recordUpdateCheck(): void {
  mmkvStorage.setNumber(STORAGE_KEYS.LAST_CHECK_TIME, Date.now());
}

/**
 * Retrieves the dismiss record for a version.
 */
function getDismissRecord(): DismissedUpdateRecord | null {
  return mmkvStorage.getObject<DismissedUpdateRecord>(STORAGE_KEYS.DISMISSED_UPDATE) || null;
}

/**
 * Checks if user recently selected "Later" for this version.
 */
export function wasRecentlyDismissed(version: string): boolean {
  const record = getDismissRecord();
  if (!record || record.version !== version) return false;

  // If user exceeded max dismiss count, re-prompt regardless
  if (record.dismissCount >= MAX_DISMISS_COUNT) return false;

  return Date.now() - record.dismissedAt < UPDATE_REPROMPT_INTERVAL_MS;
}

/**
 * Records that the user clicked "Later" for an optional update.
 */
export function dismissUpdate(version: string): void {
  const existing = getDismissRecord();
  const count = existing?.version === version ? (existing.dismissCount || 0) + 1 : 1;

  mmkvStorage.setObject<DismissedUpdateRecord>(STORAGE_KEYS.DISMISSED_UPDATE, {
    version,
    dismissedAt: Date.now(),
    dismissCount: count,
  });
}

/**
 * Clears dismiss record when a newer update becomes available.
 */
export function clearDismissRecord(): void {
  mmkvStorage.remove(STORAGE_KEYS.DISMISSED_UPDATE);
}

/**
 * Core update evaluation engine.
 * Reads installed version, fetches latest version, performs semver comparison,
 * and handles optional vs forced updates.
 */
export async function checkForUpdate(ignoreCooldown = false): Promise<UpdateCheckResult | null> {
  try {
    const currentVersion = getInstalledVersion();
    const versionInfo = await fetchLatestVersionInfo();

    if (!versionInfo) {
      if (__DEV__) {
        console.log('[APP_UPDATE] Could not resolve latest version info (offline or service unreachable)');
      }
      return null;
    }

    recordUpdateCheck();

    const {
      latestVersion,
      minimumSupportedVersion,
      forceUpdate: backendForceFlag,
      storeUrl,
      title,
      message,
      releaseNotes,
    } = versionInfo;

    const updateAvailable = isUpdateAvailable(currentVersion, latestVersion);
    const forceUpdate = isForceUpdateRequired(
      currentVersion,
      minimumSupportedVersion,
      backendForceFlag
    );

    const updateStatus: UpdateStatus = updateAvailable ? 'available' : 'up-to-date';

    if (__DEV__) {
      console.log(`[APP_UPDATE]
Current version: ${currentVersion}
Latest version: ${latestVersion}
Minimum supported version: ${minimumSupportedVersion}
Update available: ${updateAvailable}
Force update: ${forceUpdate}
Update status: ${updateStatus}`);
    }

    // No update required
    if (!updateAvailable) {
      return null;
    }

    const updateType: 'optional' | 'force' = forceUpdate ? 'force' : 'optional';

    // For optional updates, respect dismiss cooldown unless ignored
    if (updateType === 'optional' && !ignoreCooldown) {
      const dismissed = getDismissRecord();
      if (dismissed && compareVersions(dismissed.version, latestVersion) === -1) {
        clearDismissRecord();
      } else if (wasRecentlyDismissed(latestVersion)) {
        if (__DEV__) {
          console.log('[APP_UPDATE] Optional update was recently dismissed by user, suppressing popup.');
        }
        return null;
      }
    }

    const safeUrl = isValidStoreUrl(storeUrl) ? storeUrl : getPlatformStoreUrl();

    return {
      updateType,
      currentVersion,
      latestVersion,
      minimumSupportedVersion,
      forceUpdate,
      updateUrl: safeUrl,
      title: title || (forceUpdate ? 'Critical Update Required' : 'New Update Available'),
      message:
        message ||
        (forceUpdate
          ? 'A mandatory update is required to continue using HinchMart. Please update now.'
          : 'A new version of HinchMart is available with improved performance and bug fixes.'),
      releaseNotes,
    };
  } catch (err: any) {
    if (__DEV__) {
      console.log('[APP_UPDATE] Error during update check:', err?.message || err);
    }
    return null;
  }
}

/**
 * Triggers the official platform update mechanism.
 * On Android:
 * 1. Tries to launch Google Play Store App directly via market://details?id=com.hinch
 * 2. Falls back to https://play.google.com/store/apps/details?id=com.hinch
 * On iOS:
 * 1. Tries to launch App Store native URL
 * 2. Falls back to web URL
 */
export async function openAppStore(customUrl?: string): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const canOpenMarket = await Linking.canOpenURL(PLAY_STORE_MARKET_URI);
      if (canOpenMarket) {
        await Linking.openURL(PLAY_STORE_MARKET_URI);
        return true;
      }

      const targetWeb = customUrl && isValidStoreUrl(customUrl) ? customUrl : PLAY_STORE_WEB_URL;
      await Linking.openURL(targetWeb);
      return true;
    }

    if (Platform.OS === 'ios') {
      const canOpenAppStore = await Linking.canOpenURL(APP_STORE_NATIVE_URI);
      if (canOpenAppStore) {
        await Linking.openURL(APP_STORE_NATIVE_URI);
        return true;
      }

      const targetWeb = customUrl && isValidStoreUrl(customUrl) ? customUrl : APP_STORE_WEB_URL;
      await Linking.openURL(targetWeb);
      return true;
    }
  } catch (err: any) {
    if (__DEV__) {
      console.log('[APP_UPDATE] Failed to open app store:', err?.message || err);
    }
  }

  return false;
}
