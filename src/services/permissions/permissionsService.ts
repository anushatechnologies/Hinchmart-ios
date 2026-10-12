/**
 * HINCH MART — App Permissions Service
 * Handles runtime permission requests, status checks, and Android notification channels
 * for:
 *   1. Push & In-App Notifications (Android 13+ POST_NOTIFICATIONS, iOS)
 *   2. Location (Foreground GPS location for delivery detection)
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { mmkvStorage } from '../storage/mmkv';

const PERMISSION_KEYS = {
  NOTIFICATION_REQUESTED: 'hm_perm_notification_requested',
  LOCATION_REQUESTED: 'hm_perm_location_requested',
} as const;

/**
 * Configure global foreground notification behavior
 */
export function configureNotificationHandler(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn('[Permissions] Failed to configure notification handler:', error);
  }
}

/**
 * Setup standard Android Notification Channels (Android 8.0 / API 26+)
 */
export async function setupAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    // 1. Order tracking & delivery alerts channel (High priority)
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Tracking & Delivery',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E31E24',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    // 2. Quotes & RFQ updates channel
    await Notifications.setNotificationChannelAsync('rfq', {
      name: 'Quotes & RFQ Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200],
      lightColor: '#0038A8',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    // 3. Default promotions and system announcements channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#E31E24',
      showBadge: true,
    });
  } catch (error) {
    console.warn('[Permissions] Failed to set up Android notification channels:', error);
  }
}

/**
 * Request Notification Permissions (handles Android 13+ POST_NOTIFICATIONS and iOS)
 * @returns boolean indicating whether notification permission is granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    mmkvStorage.setBoolean(PERMISSION_KEYS.NOTIFICATION_REQUESTED, true);
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[Permissions] Notification permission request error:', error);
    return false;
  }
}

/**
 * Check if notification permission is currently granted
 */
export async function isNotificationPermissionGranted(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Request Foreground Location Permissions (for delivery address detection)
 * @returns boolean indicating whether location permission is granted
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      finalStatus = status;
    }

    mmkvStorage.setBoolean(PERMISSION_KEYS.LOCATION_REQUESTED, true);
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[Permissions] Location permission request error:', error);
    return false;
  }
}

/**
 * Check if location permission is currently granted
 */
export async function isLocationPermissionGranted(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Initialize all app permissions and notification channels smoothly on app launch.
 * Non-blocking, fails gracefully.
 */
export async function initAppPermissions(): Promise<{
  notificationsGranted: boolean;
  locationGranted: boolean;
}> {
  // 1. Configure foreground notification handler and Android channels
  configureNotificationHandler();
  await setupAndroidNotificationChannels();

  // 2. Request Notification Permission (prompt dialog)
  const notificationsGranted = await requestNotificationPermission();

  // 3. Request Location Permission (prompt dialog)
  const locationGranted = await requestLocationPermission();

  return {
    notificationsGranted,
    locationGranted,
  };
}
