# HINCH MART — Android Build & Release Engineering Guide

## 1. Overview & Android Environment Specifications

The Hinchmart Android application is compiled into an Android App Bundle (`.aab`) or standalone APK using Gradle and the React Native Gradle Plugin (RNGP).

### Environment Prerequisites
- **Java Development Kit (JDK)**: OpenJDK 17 (LTS) or Eclipse Temurin 17.
- **Android SDK**: API Level 34 (compileSdk: 34 or 35, targetSdkVersion: 34 or 35, minSdkVersion: 24).
- **Android NDK**: Version defined in `android/build.gradle` (NDK 26.1.10909125 or compatible).
- **Gradle**: Gradle 8.8+ with Gradle Wrapper (`gradlew`).
- **Android Build Tools**: 34.0.0+.

---

## 2. Configuration & Key Project Files

### 2.1 Native Gradle Build Files
1. **`android/build.gradle`** (Root Build Script):
   - Configures Google Maven, MavenCentral, and JitPack repositories.
   - Defines buildscript dependencies: `com.google.gms:google-services:4.4.4`, `com.android.tools.build:gradle`, and React Native Gradle Plugin.
   - Applies `expo-root-project` and `com.facebook.react.rootproject`.

2. **`android/app/build.gradle`** (Application Module Script):
   - Package Namespace: `com.hinch`
   - Application ID: `com.hinch`
   - Target SDK: `34`, Min SDK: `24`
   - Version Code: `29`, Version Name: `"1.0.28"`
   - JavaScript Engine: Hermes enabled (`hermesEnabled = true`).
   - Autolinking: `autolinkLibrariesWithApp()` seamlessly links React Native modules.

3. **`android/gradle.properties`**:
   - JVM Memory allocation: `-Xmx4096m -XX:MaxMetaspaceSize=1024m`
   - `android.useAndroidX=true`
   - `android.enableJetifier=true`
   - `expo.useLegacyPackaging=false`

### 2.2 Permissions in `AndroidManifest.xml`
The application declares the following runtime and install-time permissions:
- `android.permission.INTERNET`: Required for backend HTTPS API communication.
- `android.permission.ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`: Required for GPS delivery site pinpointing.
- `android.permission.CAMERA`: Required for barcode/QR scanning and support photo capture.
- `android.permission.POST_NOTIFICATIONS`: Required on Android 13+ (API 33+) for order delivery alerts.
- `android.permission.READ_EXTERNAL_STORAGE` & `WRITE_EXTERNAL_STORAGE` (`maxSdkVersion="32"`): For invoice PDF saving.
- `android.permission.RECORD_AUDIO`: Supporting permission for video playback/capture.

### 2.3 Firebase & Google Services
- File: `google-services.json` (located at workspace root and referenced by Gradle).
- Android Package registered: `com.hinch` (Mobile SDK App ID: `1:64875938387:android:8093266dd582087bba7ca6`).
- Google Maps API Key: Injected as `<meta-data android:name="com.google.android.geo.API_KEY" android:value="AIzaSyBQHBaFfRCHgCGKIpSm-EOsVy8dExFToeA"/>`.

---

## 3. Signing Configurations

### 3.1 Debug Keystore
- Location: `android/app/debug.keystore`
- Store Password: `android`
- Key Alias: `androiddebugkey`
- Key Password: `android`

### 3.2 Production Release Keystore
- Keystore File: `upload-keystore.jks` (at workspace root).
- Credentials File: `key.properties`:
  ```properties
  storePassword=Hinch@2233
  keyPassword=Hinch@2233
  keyAlias=hinchmart-upload-key
  storeFile=upload-keystore.jks
  ```
- Certificate Fingerprint (SHA1): `16:99:00:60:7E:47:A7:CA:FD:49:26:F9:D1:C7:E9:47:BD:83:3E:DB` (Registered in Google Cloud & Firebase Console).

---

## 4. Build Commands

### 4.1 Development / Debug Build
To run on a connected Android device or emulator:
```bash
# Using Expo CLI:
npx expo run:android

# Or using Gradle directly:
cd android
./gradlew assembleDebug
```
The output APK is generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 4.2 Production Release Bundle (AAB for Google Play Store)
To compile a signed Android App Bundle:
```bash
cd android
./gradlew bundleRelease
```
The output bundle is generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

### 4.3 Production Standalone Release APK
To compile a signed standalone APK for direct side-loading:
```bash
cd android
./gradlew assembleRelease
```
The output APK is generated at:
`android/app/build/outputs/apk/release/app-release.apk`

### 4.4 Clean Build
If Gradle encounters stale cache or build conflicts:
```bash
cd android
./gradlew clean
```

---

## 5. Troubleshooting Common Android Build Issues

1. **Out of Memory (OOM) during Gradle execution**:
   Ensure `gradle.properties` contains:
   `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`
2. **Keystore Not Found**:
   Confirm that `upload-keystore.jks` and `key.properties` exist in the workspace root directory.
3. **Android SDK Location Not Detected**:
   Verify `local.properties` contains your Android SDK path:
   `sdk.dir=C:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk`
4. **Firebase Plugin Mismatch**:
   Ensure `google-services.json` contains package name `com.hinch` matching `applicationId 'com.hinch'`.
