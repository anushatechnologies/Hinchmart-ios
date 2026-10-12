# HINCH MART — Platform File Mapping & Architectural Parity

## 1. Native Platform File Mapping

The table below illustrates the exact structural correspondence between the existing Android implementation and the newly prepared iOS implementation:

| Functional Category | Android Native File (`android/`) | iOS Native Equivalent (`ios/`) | Purpose & Architectural Role |
| :--- | :--- | :--- | :--- |
| **App Entry & Lifecycle** | `android/app/src/main/java/com/hinch/MainApplication.kt`<br>`MainActivity.kt` | `ios/HINCHMART/AppDelegate.swift` | Native entry point, React Native runtime initialization, deep links, lifecycle callbacks. |
| **Manifest & Metadata** | `android/app/src/main/AndroidManifest.xml` | `ios/HINCHMART/Info.plist` | Package name, bundle identifier, version strings, orientation, system permissions, URL schemes. |
| **Privacy Disclosures** | Declared via Google Play Data Safety form | `ios/HINCHMART/PrivacyInfo.xcprivacy` | Apple Required-Reason API declarations (`UserDefaults`, `DiskSpace`, `BootTime`, etc.). |
| **App Entitlements** | Handled implicitly via permissions | `ios/HINCHMART/HINCHMART.entitlements` | Capability entitlements (APNs `aps-environment: development/production`). |
| **Build & Dependency System** | `android/build.gradle`<br>`android/app/build.gradle` | `ios/Podfile`<br>`Podfile.properties.json` | Top-level project configuration, package repositories, native pod/gradle dependency resolution. |
| **Project Workspace** | `android/settings.gradle` | `ios/HINCHMART.xcodeproj`<br>`HINCHMART.xcworkspace` | Multi-target build orchestration, compiler flags, library link targets. |
| **Environment & Node Path** | `android/local.properties` | `ios/.xcode.env`<br>`ios/.xcode.env.local` | Locating local Node.js binaries and SDK paths during compilation scripts. |
| **App Launcher Icons** | `android/app/src/main/res/mipmap-*/ic_launcher.png`<br>`adaptiveIcon` | `ios/HINCHMART/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` | Standard high-resolution launcher icon for home screens and app stores. |
| **Launch Splash Screen** | `android/app/src/main/res/layout/splash_screen.xml`<br>`Theme.App.SplashScreen` | `ios/HINCHMART/SplashScreen.storyboard`<br>`Images.xcassets/SplashScreenLogo.imageset` | Native pre-bundle launch screen displayed before React Native JavaScript engine boots. |
| **Firebase Configuration** | `google-services.json` | `src/config/firebase.ts` *(Web SDK)* / `GoogleService-Info.plist` | Firebase authentication, database, and push notification credentials. |
| **Release Signing Keys** | `upload-keystore.jks`<br>`key.properties` | Apple Distribution Certificate<br>`com.hinchmart.mobileprovision` | Cryptographic application signing for Play Store and App Store distribution. |
| **Build Flags & JVM Memory** | `android/gradle.properties` | `ios/Podfile.properties.json` | Engine flags (Hermes enabled), compilation optimizations, caching flags. |

---

## 2. 100% Shared Application Files

The following files represent the core business logic, design system, and state management of Hinchmart. They are **100% shared** across both Android and iOS without any platform-specific duplication:

| File / Directory | Description | Shared Status |
| :--- | :--- | :--- |
| `App.tsx` | Root Application component, Providers, and Lifecycle initializers | 100% Shared |
| `index.ts` | React Native `registerRootComponent` bootstrap entry | 100% Shared |
| `src/components/**` | Reusable UI design system, buttons, badges, modals, cards | 100% Shared |
| `src/features/**` | All domain screens: Auth, Products, Cart, Checkout, Orders, RFQ, Profile | 100% Shared |
| `src/navigation/**` | Root Stack Navigator and Bottom Tab Navigator | 100% Shared |
| `src/redux/**` | Redux store, authSlice, cartSlice, notificationSlice, themeSlice | 100% Shared |
| `src/services/api/**` | Axios client, authApi, productsApi, paymentsApi, ordersApi | 100% Shared |
| `src/services/permissions/**`| Cross-platform runtime permission request engine | 100% Shared |
| `src/services/storage/**` | High-performance MMKV persistent storage | 100% Shared |
| `src/theme/**` | Light & Dark design tokens, colors, typography | 100% Shared |
| `src/localization/**` | Multilingual language dictionaries | 100% Shared |
| `assets/**` | Shared icons, logos, brand badges, and splash images | 100% Shared |
| `tests/**` | Unit & integration tests for cart persistence and auth guards | 100% Shared |

---

## 3. Platform Divergence Handling in Shared Code

Where native differences exist between Android and iOS, the codebase gracefully branches using standard, non-breaking React Native patterns:

### 3.1 Push Notification Channels
- **Android**: Requires explicit Notification Channels (API 26+) configured with importance levels and vibration patterns in `permissionsService.ts`.
- **iOS**: Uses Apple Push Notification service (APNs) alert, badge, and sound flags:
  ```typescript
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', { ... });
  } else {
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true }
    });
  }
  ```

### 3.2 App Store Update Redirection
- **Android**: Opens `market://details?id=com.hinch` with fallback to `https://play.google.com/store/apps/details?id=com.hinch`.
- **iOS**: Opens `itms-apps://apps.apple.com/app/id6766501000` with fallback to `https://apps.apple.com/app/id6766501000`.

### 3.3 Hardware Back Button vs iOS Swipe Back
- **Android**: Hardware back button events handled via `BackHandler.addEventListener('hardwareBackPress', ...)` (verified in tests).
- **iOS**: Interactive edge swipe gestures handled smoothly by `@react-navigation/native-stack`.
