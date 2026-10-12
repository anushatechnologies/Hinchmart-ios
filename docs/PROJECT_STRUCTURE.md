# HINCH MART — Project Structure & Architectural Overview

## 1. Executive Summary

Hinchmart is an enterprise B2B e-commerce mobile application delivering wholesale construction materials, machinery rentals, and procurement quotes ("Everything for Every Construction"). The application is built upon **React Native 0.86.3** and **Expo SDK 57 (TypeScript 6.0.3)**, featuring a shared cross-platform business logic core with dual native compilation engines for **Android (Gradle/Kotlin)** and **iOS (Xcode/Swift/CocoaPods)**.

---

## 2. High-Level Workspace Architecture

```
Hinchmart-Ios/
├── .env                              # Production runtime environment variables
├── .env.example                      # Environment configuration template
├── App.tsx                           # Root React Component, Providers & Lifecycle initialization
├── index.ts                          # Native Entry point (registerRootComponent)
├── app.json                          # Unified Expo & Native Application Manifest (iOS & Android metadata)
├── app.json.bak                      # Original configuration backup
├── eas.json                          # Expo Application Services (EAS) Cloud Build configurations
├── eas.json.bak                      # Original EAS backup
├── package.json                      # Project dependencies, scripts, and package metadata
├── tsconfig.json                     # TypeScript compiler configuration
├── babel.config.js                   # Babel presets and Reanimated compiler plugins
├── metro.config.js                   # Metro bundler resolver and asset exclusions
├── google-services.json              # Firebase Android production services configuration
├── key.properties                    # Android release signing keystore configuration
├── upload-keystore.jks               # Production upload keystore for Android release builds
│
├── android/                          # Native Android Project (Gradle / Kotlin)
│   ├── app/                          # Main Android application module
│   │   ├── build.gradle              # Module build script, SDK versions, packaging, signing
│   │   ├── src/main/AndroidManifest.xml # Permissions, activities, notification channels
│   │   └── src/main/java/com/hinch/  # MainActivity, MainApplication (Kotlin)
│   ├── build.gradle                  # Top-level Gradle script, repositories, build plugins
│   ├── gradle.properties             # JVM args, AndroidX, Hermes, ProGuard flags
│   ├── gradlew / gradlew.bat         # Gradle wrapper binaries
│   └── settings.gradle               # Gradle project modules and autolinking
│
├── ios/                              # Native iOS Project (Xcode / Swift / CocoaPods)
│   ├── HINCHMART/                    # Main iOS target directory
│   │   ├── AppDelegate.swift         # App lifecycle, React Native factory, Linking, Maps init
│   │   ├── HINCHMART-Bridging-Header.h # Objective-C / Swift bridging header
│   │   ├── HINCHMART.entitlements    # Push notifications (aps-environment) entitlements
│   │   ├── Info.plist                # Bundle metadata, permissions, ATS, URL schemes
│   │   ├── PrivacyInfo.xcprivacy     # Apple Required-Reason API privacy manifest
│   │   ├── SplashScreen.storyboard   # Native iOS launch screen layout
│   │   └── Images.xcassets/          # AppIcon (1024x1024) and splash screen assets
│   ├── HINCHMART.xcodeproj/          # Xcode project configuration and PBX build targets
│   ├── Podfile                       # CocoaPods dependency specification and pod autolinking
│   ├── Podfile.properties.json       # Expo deployment target and Hermes engine settings
│   ├── .xcode.env                    # Xcode build environment node path export
│   └── .gitignore                    # iOS build output and Pods exclusions
│
├── assets/                           # Shared Vector & Raster Image Assets
│   ├── icon.png                      # App primary icon (1024x1024)
│   ├── splash-icon.png               # Centered splash screen icon
│   ├── logo.png                      # Hinchmart horizontal and badge brand logos
│   └── brands/                       # Construction brand partner logos
│
├── src/                              # Shared Cross-Platform Application Source Code (100% Shared)
│   ├── components/                   # Reusable Atomic UI Component Library
│   ├── config/                       # Firebase client, updates, and environment configs
│   ├── constants/                    # REST endpoints, route names, app constants
│   ├── features/                     # Domain-driven modular screens and components
│   ├── hooks/                        # Custom React hooks (updates, permissions, queries)
│   ├── localization/                 # Multilingual translation dictionary and i18n
│   ├── navigation/                   # Stack and Tab navigation hierarchy
│   ├── redux/                        # Redux Toolkit store, slices, and typed hooks
│   ├── services/                     # HTTP API clients, permissions, storage, payment
│   ├── store/                        # Lightweight Zustand state stores (authStore)
│   ├── theme/                        # Design tokens, color palettes, dark/light provider
│   ├── types/                        # TypeScript type definitions and API DTO models
│   └── utils/                        # Data formatters, validators, and math helpers
│
├── tests/                            # Automated Unit & Integration Tests
│   └── cart-auth.test.ts             # 39 end-to-end cart, auth guard & regression tests
│
└── docs/                             # Full Platform & App Store Documentation
    ├── PROJECT_STRUCTURE.md          # Complete directory and architecture guide
    ├── ANDROID_BUILD_GUIDE.md        # Android build, debug, release and keystore guide
    ├── IOS_SETUP_GUIDE.md            # iOS prerequisites, CocoaPods, simulator and Xcode guide
    ├── IOS_APP_STORE_CHECKLIST.md    # Complete App Store submission and compliance checklist
    ├── PLATFORM_FILE_MAPPING.md      # Side-by-side Android vs iOS file and feature mapping
    ├── DEPENDENCY_COMPATIBILITY.md   # Native module and library compatibility analysis
    ├── BUILD_STATUS.md               # Environment verification, build logs, and test results
    └── CHANGELOG_IOS.md              # Detailed record of all iOS preparation modifications
```

---

## 3. Detailed Architecture Breakdown

### 3.1 Presentation & UI Layer (`src/components/` & `src/features/`)
- **Atomic UI System**: `src/components/ui/` contains reusable buttons, badges, modals, and input fields.
- **Razorpay Checkout Modal** (`src/components/ui/RazorpayCheckoutModal.tsx`): Integrates live Razorpay checkout through an embedded hardware-accelerated WebView, eliminating buggy native C++ bridge incompatibilities and guaranteeing identical checkout behavior on both Android and iOS.
- **Location & Map Picker** (`src/components/ui/LocationPickerModal.tsx`): Hardware-accelerated Leaflet + WebView interactive map engine with Google Satellite/Standard tile support, GPS "Locate Me" device centering, reverse geocoding, and place search.
- **Barcode & QR Scanner** (`src/components/ui/BarcodeScannerModal.tsx`): Built with `expo-camera` (`CameraView`) for instant scanning of product SKU barcodes and material serial numbers.

### 3.2 Navigation Architecture (`src/navigation/`)
- **`RootNavigator.tsx`**: Native stack navigator orchestration (`@react-navigation/native-stack`) managing the full authentication flow (Splash, Onboarding, Login, OTP, Register) and transitioning into `BottomTabNavigator`.
- **`BottomTabNavigator.tsx`**: Bottom tab interface (Home, Categories, RFQ Quotes, Orders, Profile) with dynamic badges for unread notifications and cart item count.
- **Deep Linking**: Native URL scheme `hinchmart://` registered via `app.json` and handled natively via `RCTLinkingManager` in `AppDelegate.swift` (iOS) and Intent Filters in `AndroidManifest.xml` (Android).

### 3.3 State Management & Offline Persistence (`src/redux/` & `src/store/`)
- **Redux Toolkit**: Central store managing `authSlice`, `cartSlice`, `wishlistSlice`, `notificationSlice`, and `themeSlice`.
- **Redux Persist**: Configured with high-performance persistent storage to ensure cart items and user preferences survive app restarts.
- **Zustand (`authStore.ts`)**: Fast, lightweight, synchronous access to authentication tokens and user state without hook dependencies.
- **Storage (`src/services/storage/mmkv.ts`)**: High-speed MMKV key-value storage engine backed by Nitro Modules.

### 3.4 Networking & Backend API Service Layer (`src/services/api/`)
- **Axios HTTP Client** (`src/services/api/client.ts`): Base URL configured to `https://api.hinchmart.com/api/` with automatic Bearer token injection, silent token refreshing, and global error handling.
- **Domain Services**:
  - `auth.api.ts` & `firebaseAuth.ts`: Phone SMS OTP authentication, database user synchronization.
  - `products.api.ts`: Catalog browsing, search, category filtering, bulk quantity tiers.
  - `cart.api.ts`: Cart synchronization with backend MySQL database.
  - `payments.api.ts`: Razorpay order creation (`/api/payments/create-order`) and cryptographic HMAC signature verification (`/api/payments/verify`).
  - `orders.api.ts`: Order placement, tracking, timeline history, shipment updates.
  - `rfq.api.ts`: Request For Quote enterprise bidding, contractor inquiries.

---

## 4. Platform Separation Boundaries

| Component / Layer | Shared Code (`src/`) | Android Native (`android/`) | iOS Native (`ios/`) |
| :--- | :--- | :--- | :--- |
| **Business Logic** | 100% Shared TypeScript | None | None |
| **UI Components & Theme** | 100% Shared React Native | None | None |
| **API & Networking** | 100% Shared Axios Client | None | ATS exceptions in `Info.plist` |
| **Permissions** | Runtime requests in `permissionsService.ts` | `AndroidManifest.xml` (`<uses-permission>`) | `Info.plist` usage description strings |
| **Notifications** | Handlers in `permissionsService.ts` | Android Channels (MAX, HIGH, DEFAULT) | `aps-environment` entitlement in `.entitlements` |
| **App Entry Point** | `index.ts` / `App.tsx` | `MainActivity.kt` & `MainApplication.kt` | `AppDelegate.swift` |
| **Dependency Engine** | `package.json` | Gradle (`build.gradle`, Maven) | CocoaPods (`Podfile`) |
