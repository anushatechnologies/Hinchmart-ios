/**
 * HINCH MART — App Update Types
 * Type definitions for in-app version checking and update prompting
 */

export type UpdatePlatform = 'android' | 'ios';

export type UpdateType = 'optional' | 'force' | 'none';

export interface AppVersionResponse {
  platform: UpdatePlatform;
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  releaseNotes: string[];
}

export interface UpdateCheckResult {
  updateType: UpdateType;
  currentVersion: string;
  latestVersion: string;
  minimumSupportedVersion: string;
  updateUrl: string;
  releaseNotes: string[];
  forceUpdate: boolean;
}

export interface DismissedUpdateRecord {
  version: string;
  dismissedAt: number;
  dismissCount: number;
}
