/**
 * HINCH MART — useAppUpdate Hook
 * 
 * Manages the complete production update lifecycle:
 * - Startup check (with non-blocking 2.5s delay)
 * - Background return / resume re-check (via AppState)
 * - Double-check prevention and cooldown throttling
 * - State management: idle, checking, up-to-date, available, installing, error
 * - Double-tap protection on "Update Now"
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  checkForUpdate,
  shouldCheckForUpdate,
  dismissUpdate,
  openAppStore,
  UpdateCheckResult,
  UpdateStatus,
} from '../services/update/updateService';

export interface UseAppUpdateReturn {
  /** The update check result, or null if no update is available */
  updateResult: UpdateCheckResult | null;
  /** Current state of the update system */
  updateStatus: UpdateStatus;
  /** Whether the update modal is currently visible */
  isModalVisible: boolean;
  /** Whether an update action is in progress (e.g. launching store) */
  isUpdating: boolean;
  /** Handle the "Update Now" button press */
  handleUpdateNow: () => Promise<void>;
  /** Handle the "Later" button press */
  handleLater: () => void;
  /** Manually trigger an update check */
  recheckUpdate: () => Promise<void>;
}

export function useAppUpdate(): UseAppUpdateReturn {
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isCheckingRef = useRef(false);

  /**
   * Evaluates if a newer version is available.
   * Runs silently in background — never blocks the UI.
   */
  const performCheck = useCallback(async (respectCooldown = true) => {
    if (isCheckingRef.current) return;

    if (respectCooldown && !shouldCheckForUpdate()) {
      return;
    }

    isCheckingRef.current = true;
    setUpdateStatus('checking');

    try {
      const result = await checkForUpdate(!respectCooldown);
      if (result) {
        setUpdateResult(result);
        setUpdateStatus('available');
        setIsModalVisible(true);
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      if (__DEV__) {
        console.log('[APP_UPDATE] Check failed silently:', err?.message || err);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  /**
   * Startup Check: Runs 2.5 seconds after app mount.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      performCheck(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [performCheck]);

  /**
   * App Resume Check: When user returns from background to active.
   */
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const isResuming =
        appStateRef.current.match(/inactive|background/) && nextState === 'active';

      if (isResuming) {
        // If modal was already showing a forced update, keep it visible
        if (updateResult?.forceUpdate) {
          setIsModalVisible(true);
        } else {
          performCheck(true);
        }
      }

      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [performCheck, updateResult?.forceUpdate]);

  /**
   * Trigger Store / In-App Update flow.
   */
  const handleUpdateNow = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdateStatus('installing');

    try {
      await openAppStore(updateResult?.updateUrl);
    } finally {
      // Release button lockout after 2 seconds
      setTimeout(() => {
        setIsUpdating(false);
      }, 2000);
    }
  }, [updateResult?.updateUrl, isUpdating]);

  /**
   * Handle Optional Update "Later" Dismissal.
   */
  const handleLater = useCallback(() => {
    if (updateResult?.latestVersion) {
      dismissUpdate(updateResult.latestVersion);
    }
    setIsModalVisible(false);
    // For non-force updates, clear result on dismiss
    if (!updateResult?.forceUpdate) {
      setUpdateResult(null);
    }
  }, [updateResult]);

  /**
   * Force manual re-check (e.g. from Settings screen or pull-to-refresh).
   */
  const recheckUpdate = useCallback(async () => {
    await performCheck(false);
  }, [performCheck]);

  return {
    updateResult,
    updateStatus,
    isModalVisible,
    isUpdating,
    handleUpdateNow,
    handleLater,
    recheckUpdate,
  };
}
