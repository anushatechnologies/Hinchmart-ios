# HINCH MART — iOS Setup, Development & Build Guide

## 1. Prerequisites & macOS Workstation Setup

Building, running, and archiving the native iOS application requires a macOS environment with Xcode installed.

### System Requirements
- **Hardware**: Mac with Apple Silicon (M1/M2/M3/M4) or Intel processor (16 GB+ RAM recommended).
- **Operating System**: macOS Sonoma (14.0+) or macOS Sequoia (15.0+).
- **Xcode**: Xcode 15.4 or Xcode 16+ (available free from the Mac App Store).
- **Xcode Command Line Tools**: Install via Terminal:
  ```bash
  xcode-select --install
  ```
- **Node.js**: v20 LTS or v22 LTS (`node -v`).
- **CocoaPods**: v1.15+ (`sudo gem install cocoapods` or `brew install cocoapods`).
- **Apple Developer Account**: Required for code signing, push notifications, and App Store distribution.

---

## 2. Step-by-Step iOS Setup Workflow

### Step 1: Install JavaScript Dependencies
From the project root directory, install all verified npm dependencies:
```bash
npm install
```

### Step 2: Configure Local Xcode Environment (`.xcode.env.local`)
Xcode needs to know the exact path of your Node binary. Create an `.xcode.env.local` file inside `ios/`:
```bash
# Detect your node path:
which node

# Export it to ios/.xcode.env.local:
echo "export NODE_BINARY=$(which node)" > ios/.xcode.env.local
```

### Step 3: Install Native CocoaPods Dependencies
Navigate into the `ios/` directory and run CocoaPods installation:
```bash
cd ios
pod install
cd ..
```
*Tip*: You can also run `npx pod-install` from the project root.

This step generates `ios/HINCHMART.xcworkspace` and `ios/Podfile.lock`, resolving all native pods (React, React-Core, Hermes, NitroModules, MMKV, Expo modules, GoogleMaps, etc.).

---

## 3. Running on iOS Simulator

### 3.1 Via Expo CLI (Command Line)
To launch the app directly on the default iOS Simulator:
```bash
npx expo run:ios
```

To target a specific device simulator (e.g., iPhone 16 Pro):
```bash
npx expo run:ios --simulator="iPhone 16 Pro"
```

### 3.2 Via Xcode IDE
1. Open the **Xcode Workspace** (Always open `.xcworkspace`, never `.xcodeproj`):
   ```bash
   open ios/HINCHMART.xcworkspace
   ```
2. Select your target device from the top toolbar scheme dropdown (e.g., `iPhone 16 Pro`).
3. Press **Cmd + R** (or click the **Play** button) to build and run.
4. Metro bundler will start automatically in a Terminal window to serve JavaScript updates.

---

## 4. Running on a Physical iOS Device

1. Connect your iPhone via USB cable or ensure it is on the same local Wi-Fi network.
2. In Xcode, open `ios/HINCHMART.xcworkspace`.
3. In the left project navigator, select the root **HINCHMART** project.
4. Go to **Signing & Capabilities** tab.
5. Under **Signing**, check **Automatically manage signing** and select your active **Apple Developer Team**.
6. Set the bundle identifier to your team-authorized identifier (default: `com.hinchmart`).
7. Select your connected iPhone from the Xcode device dropdown.
8. Click **Run** (**Cmd + R**).
9. On your iPhone: Go to **Settings > General > VPN & Device Management** and tap **Trust [Your Apple Developer Account]**.
10. Launch the Hinchmart app from your home screen.

---

## 5. Alternative Cloud Build: EAS Build (No Mac Required)

If you are developing on Windows or Linux, you can compile native iOS `.ipa` binaries directly in the cloud using EAS (Expo Application Services):

### Prerequisites
```bash
npm install -g eas-cli
eas login
```

### 5.1 Build for iOS Simulator (Cloud)
```bash
eas build --platform ios --profile preview
```
This generates a downloadable `.tar.gz` simulator build that can be dragged directly onto any Mac iOS Simulator.

### 5.2 Build Production IPA for App Store (Cloud)
```bash
eas build --platform ios --profile production
```
EAS handles Apple certificates, mobile provisioning profiles, remote compiling, and provides an `.ipa` ready for TestFlight and App Store submission.

---

## 6. iOS Troubleshooting & Common Solutions

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`pod install` fails with CDN errors** | Stale CocoaPods master repo | Run `pod repo update` or `pod install --repo-update`. |
| **`PhaseScriptExecution [CP-User] Generate Specs failed`** | Xcode cannot locate Node binary | Verify `ios/.xcode.env.local` contains `export NODE_BINARY=$(which node)`. |
| **`Command PhaseScriptExecution failed with a nonzero exit code`** | Stale build artifacts | In Xcode: **Product > Clean Build Folder** (`Cmd + Shift + K`), then rebuild. |
| **Duplicate symbol or Pod linker error** | Cached pods conflict | Run: `cd ios && rm -rf Pods Podfile.lock && pod install --repo-update && cd ..`. |
| **Metro bundler port 8081 occupied** | Another service using port 8081 | Run `npx expo start --port 8082` or kill the process: `lsof -ti:8081 \| xargs kill -9`. |
| **White screen on launch on physical device** | ATS or network permission block | Ensure `.env` points to HTTPS endpoint (`https://api.hinchmart.com/api/`). |
