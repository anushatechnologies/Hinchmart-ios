# HINCH MART — iOS Changelog & Modification Audit

## Summary of Changes

This changelog records all modifications, file creations, and configuration enhancements introduced to transform the Hinchmart codebase into a production-ready, dual-platform (Android & iOS) project compliant with Apple App Store guidelines.

---

## 1. Project Configuration Files

### `app.json` (Modified)
- **Backup Created**: `app.json.bak`
- **Changes Introduced**:
  - Added root `"scheme": "hinchmart"` for iOS deep linking and OAuth callbacks.
  - Added `"ios.buildNumber": "29"` to ensure build parity with Android `versionCode: 29`.
  - Added `"CFBundleAllowMixedLocalizations": true` to support multilingual UI.
  - Added `"ITSAppUsesNonExemptEncryption": false` to satisfy Apple export compliance.
  - Added `"NSCameraUsageDescription"`: `"Allow HINCH MART to access your camera to scan barcodes and capture product images or support attachments."`
  - Added `"NSPhotoLibraryUsageDescription"`: `"Allow HINCH MART to access your photo library to select product photos and upload support attachments."`
  - Added `"NSPhotoLibraryAddUsageDescription"`: `"Allow HINCH MART to save invoices and receipts to your photo library."`
  - Added `"NSLocationWhenInUseUsageDescription"`: `"Allow HINCH MART to access your location for accurate delivery address and project site detection."`
  - Added `"NSLocationAlwaysAndWhenInUseUsageDescription"`: `"Allow HINCH MART to access your location for delivery address detection."`
  - Added `"UIBackgroundModes": ["remote-notification"]` for push alerts.
  - Configured `"ios.privacyManifests"` declaring Required-Reason APIs:
    - `NSPrivacyAccessedAPICategoryUserDefaults` (`CA92.1`)
    - `NSPrivacyAccessedAPICategorySystemBootTime` (`35F9.1`)
    - `NSPrivacyAccessedAPICategoryFileTimestamp` (`C617.1`)
    - `NSPrivacyAccessedAPICategoryDiskSpace` (`E174.1`)
  - Configured plugins for `"expo-camera"` and `"expo-image-picker"`.
  - Preserved 100% of existing Android configuration (`package`, `versionCode`, `permissions`, `adaptiveIcon`, `googleMaps`).

### `eas.json` (Modified)
- **Backup Created**: `eas.json.bak`
- **Changes Introduced**:
  - Added iOS preview build target (`"ios": { "simulator": true }`) for standalone iOS simulator builds.
  - Added iOS production build target (`"ios": { "simulator": false }`) for production `.ipa` compilation.
  - Preserved all existing Android build types (`"android": { "buildType": "app-bundle" }`).

---

## 2. Native iOS Project Directory (`ios/`) (Created & Configured)

The native iOS project structure was initialized and synchronized via the Expo configuration engine:

### `ios/HINCHMART.xcodeproj`
- Native Xcode project containing target definitions, build phases, compile sources, and link binary with libraries for target `HINCHMART`.
- Configured with `PRODUCT_BUNDLE_IDENTIFIER = "com.hinchmart"`.

### `ios/Podfile`
- Configured CocoaPods dependency management with deployment target `iOS 16.4`.
- Configured `use_expo_modules!` for modular autolinking.
- Added `pod 'react-native-google-maps'` linked to `react-native-maps`.
- Configured Hermes JavaScript engine and privacy file aggregation.

### `ios/HINCHMART/AppDelegate.swift`
- Implemented `ExpoAppDelegate` subclass.
- Initialized React Native runtime factory with module name `"main"`.
- Wired `RCTLinkingManager` for deep linking (`open url`) and Universal Links (`continue userActivity`).
- Configured `GMSServices.provideAPIKey` for Google Maps initialization.
- Added production JavaScript bundle fallback to `main.jsbundle`.

### `ios/HINCHMART/Info.plist`
- Property list containing application identity, URL schemes (`hinchmart`, `com.hinch`), orientation settings, ATS exceptions, and all required permission usage strings.

### `ios/HINCHMART/PrivacyInfo.xcprivacy`
- Official Apple Privacy Manifest defining required-reason API categories and certifying non-tracking status (`NSPrivacyTracking: false`).

### `ios/HINCHMART/HINCHMART.entitlements`
- Configured with `aps-environment` for Apple Push Notification service.

### `ios/HINCHMART/Images.xcassets`
- Configured with `AppIcon.appiconset` containing the single standard 1024x1024 app icon (`App-Icon-1024x1024@1x.png`).
- Configured `SplashScreenLogo.imageset` and `SplashScreenBackground.colorset`.

### `ios/HINCHMART/SplashScreen.storyboard`
- Native storyboard defining the initial splash screen layout with centered brand logo.

---

## 3. Documentation Directory (`docs/`) (Created)

Created 8 comprehensive reference documents:
1. `docs/PROJECT_STRUCTURE.md`
2. `docs/ANDROID_BUILD_GUIDE.md`
3. `docs/IOS_SETUP_GUIDE.md`
4. `docs/IOS_APP_STORE_CHECKLIST.md`
5. `docs/PLATFORM_FILE_MAPPING.md`
6. `docs/DEPENDENCY_COMPATIBILITY.md`
7. `docs/BUILD_STATUS.md`
8. `docs/CHANGELOG_IOS.md`
