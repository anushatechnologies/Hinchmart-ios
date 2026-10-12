/**
 * HINCH MART — Semantic Version Comparison Utility
 * 
 * Accurately parses and compares semantic versions (semver).
 * Handles major, minor, patch, and build identifiers correctly.
 * 
 * Never compares versions as raw strings (e.g. "1.0.10" > "1.0.9" numerically).
 */

/**
 * Parses a version string into an array of numeric tokens.
 * Handles prefixes like "v1.0.9", build metadata, and pre-release tags.
 * 
 * Example:
 * "1.0.9"      -> [1, 0, 9]
 * "v1.0.10"    -> [1, 0, 10]
 * "2.0.0-rc.1" -> [2, 0, 0]
 */
export function parseVersion(version: string): number[] {
  if (!version || typeof version !== 'string') return [0, 0, 0];

  const cleaned = version
    .trim()
    .replace(/^v/i, '')
    .split(/[-+]/)[0]; // Remove pre-release tags like -beta, -rc.1

  const parts = cleaned.split('.').map((part) => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });

  while (parts.length < 3) {
    parts.push(0);
  }

  return parts;
}

/**
 * Compares two semantic version strings.
 * 
 * @returns 
 *  -1 if a < b (a is older than b)
 *   0 if a === b (versions are identical)
 *   1 if a > b (a is newer than b)
 * 
 * Examples:
 *   compareVersions('1.0.8', '1.0.9')   -> -1 (Update available)
 *   compareVersions('1.0.9', '1.0.9')   ->  0 (Up to date)
 *   compareVersions('1.0.9', '1.0.10')  -> -1 (Update available)
 *   compareVersions('1.0.9', '1.1.0')   -> -1 (Update available)
 *   compareVersions('1.9.9', '2.0.0')   -> -1 (Update available)
 *   compareVersions('1.0.14', '1.0.9')  ->  1 (Current is newer, no downgrade)
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const v1 = parseVersion(a);
  const v2 = parseVersion(b);

  const maxLength = Math.max(v1.length, v2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = v1[i] ?? 0;
    const num2 = v2[i] ?? 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Returns true if version `a` is strictly older than version `b`.
 */
export function isVersionLessThan(a: string, b: string): boolean {
  return compareVersions(a, b) === -1;
}

/**
 * Returns true if version `a` is greater than or equal to version `b`.
 */
export function isVersionGte(a: string, b: string): boolean {
  return compareVersions(a, b) >= 0;
}

/**
 * Returns true if an update is available (i.e. latestVersion is strictly greater than installedVersion).
 */
export function isUpdateAvailable(installedVersion: string, latestVersion: string): boolean {
  return compareVersions(installedVersion, latestVersion) === -1;
}

/**
 * Determines whether a forced update is required.
 * True if explicitly flagged or if installedVersion is strictly below minimumSupportedVersion.
 */
export function isForceUpdateRequired(
  installedVersion: string,
  minimumSupportedVersion?: string,
  forceUpdateFlag?: boolean
): boolean {
  if (forceUpdateFlag) return true;
  if (!minimumSupportedVersion) return false;
  return compareVersions(installedVersion, minimumSupportedVersion) === -1;
}
