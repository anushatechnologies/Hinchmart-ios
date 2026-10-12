# HINCH MART — iOS App Store Submission & Compliance Checklist

## 1. Apple Developer & App Identity Essentials

| Configuration Item | Required Value / Status | Verification Notes |
| :--- | :--- | :--- |
| **App Name** | `HINCH MART` | Matches Android brand identity and registered trade name. |
| **Bundle Identifier** | `com.hinchmart` | Reverse-DNS bundle ID. Must match App ID in Apple Developer portal. |
| **Version Number** | `1.0.28` (`CFBundleShortVersionString`) | Matches Android `versionName`. |
| **Build Number** | `29` (`CFBundleVersion`) | Matches Android `versionCode: 29`. Increment on every new upload. |
| **Minimum iOS Version** | `iOS 16.4` | Covers 95%+ of active iPhone and iPad devices. |
| **Supported Devices** | iPhone, iPad (`supportsTablet: true`) | Configured in `app.json` and `Info.plist`. |
| **SKU** | `hinchmart-ios-app` | Internal unique tracking code for App Store Connect. |
| **Primary Category** | `Shopping` or `Business` | B2B wholesale construction materials & equipment. |
| **Secondary Category** | `Productivity` | RFQ procurement quotes, order invoices. |

---

## 2. Privacy Manifest & Regulatory Compliance

### 2.1 Apple Required-Reason API Declarations (`PrivacyInfo.xcprivacy`)
Apple enforces strict validation on Required-Reason APIs (effective May 1, 2024). The generated `ios/HINCHMART/PrivacyInfo.xcprivacy` declares:

1. **`NSPrivacyAccessedAPICategoryUserDefaults`**
   - Reason Code: `CA92.1`
   - Purpose: Storing user preferences, language settings, and UI themes locally in `NSUserDefaults`.
2. **`NSPrivacyAccessedAPICategorySystemBootTime`**
   - Reason Code: `35F9.1`
   - Purpose: Calculating uptime duration and timestamps for animated transitions and network timeouts.
3. **`NSPrivacyAccessedAPICategoryFileTimestamp`**
   - Reason Code: `C617.1`
   - Purpose: Validating cached product assets, images, and offline MMKV database files.
4. **`NSPrivacyAccessedAPICategoryDiskSpace`**
   - Reason Code: `E174.1`
   - Purpose: Verifying sufficient local disk space before caching product images and invoices.
5. **Tracking Declaration (`NSPrivacyTracking`)**:
   - Declared as: `<false/>`
   - Hinchmart does NOT track users across third-party apps or websites for ad-targeting purposes.

### 2.2 App Store Connect Privacy Disclosures (Data Nutrition Label)
When answering the App Privacy questionnaire in App Store Connect:

- **Contact Info**:
  - *Name, Phone Number, Email Address*
  - Collected for: Account Functionality, Order Processing, Delivery Updates.
  - Linked to User: Yes.
  - Used for Tracking: No.
- **Location**:
  - *Coarse & Precise Location*
  - Collected for: Determining delivery site accessibility, address suggestions, and delivery radius.
  - Linked to User: Yes.
  - Used for Tracking: No.
- **User Content**:
  - *Photos & Camera Attachments*
  - Collected for: Barcode scanning and customer support ticket attachments.
  - Linked to User: Yes.
  - Used for Tracking: No.
- **Financial Information**:
  - *Payment Records & Transaction IDs*
  - Note: Card and UPI transactions are handled directly through Razorpay's PCI-DSS Level 1 compliant secure gateway. Hinchmart stores only transaction reference IDs (`razorpay_payment_id`, `razorpay_order_id`) for order verification.
  - Linked to User: Yes.
  - Used for Tracking: No.

### 2.3 Export Compliance (`ITSAppUsesNonExemptEncryption`)
- Set to `<false/>` in `ios/HINCHMART/Info.plist`.
- App uses only standard HTTPS / SSL network encryption for REST APIs and WebView transactions, exempting it from the French/US annual export encryption reporting requirement.

---

## 3. Info.plist Purpose Strings & Permission Descriptions

Every native permission requested by the app has a user-friendly, descriptive purpose string configured in `Info.plist`:

| Permission Key | Configured Purpose String | Mandatory App Store Trigger |
| :--- | :--- | :--- |
| `NSCameraUsageDescription` | `"Allow HINCH MART to access your camera to scan barcodes and capture product images or support attachments."` | `expo-camera` / barcode scanner |
| `NSPhotoLibraryUsageDescription` | `"Allow HINCH MART to access your photo library to select product photos and upload support attachments."` | `expo-image-picker` / support tickets |
| `NSPhotoLibraryAddUsageDescription` | `"Allow HINCH MART to save invoices and receipts to your photo library."` | Invoice download / receipt saving |
| `NSLocationWhenInUseUsageDescription` | `"Allow HINCH MART to access your location for accurate delivery address and project site detection."` | Delivery address detection |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | `"Allow HINCH MART to access your location for accurate delivery address and project site detection."` | Background delivery geofencing |

---

## 4. Sign in with Apple Compliance Evaluation (Guideline 4.8)

### Guideline Rule
Apple Review Guideline 4.8 specifies that apps offering commercial third-party social sign-ins (e.g., Google Sign-In, Facebook Login, X Login) must also offer Sign in with Apple as an equivalent option.

### Hinchmart Application Status
- **Authentication Method**: Hinchmart uses **Phone SMS OTP** and direct first-party account creation via Firebase Auth / backend API (`/api/auth/login-phone`).
- **Social Sign-Ins**: The application does **NOT** offer Google Sign-In, Facebook Login, or other third-party social authentication buttons.
- **Conclusion**: **Sign in with Apple is NOT legally required** under Guideline 4.8. Hinchmart satisfies Apple's exemption for first-party authentication systems.

---

## 5. App Store Connect Screenshot & Creative Asset Requirements

Apple requires screenshots taken from physical devices or high-resolution iOS simulators:

### Required Screenshot Sets
1. **6.9-inch Display (iPhone 16 Pro Max)**:
   - Resolution: `1320 x 2868 pixels` (portrait) or `2868 x 1320 pixels` (landscape).
   - Alternatively: 6.7-inch display (`1290 x 2796 pixels`).
   - Minimum: 1 screenshot; Recommended: 4 to 6 screenshots.
2. **6.5-inch Display (iPhone 11 Pro Max / XS Max)**:
   - Resolution: `1242 x 2688 pixels` (portrait).
   - Minimum: 1 screenshot.
3. **13-inch iPad Display (iPad Pro 13-inch M4 / 12.9-inch)**:
   - Resolution: `2048 x 2732 pixels` (portrait).
   - Required because `supportsTablet: true` is enabled.
4. **App Store Icon**:
   - `1024 x 1024 pixels` (PNG format, 72 DPI, RGB, no transparency, no rounded corners).

### Recommended Screenshot Screens
1. **Home Screen**: Hero construction banners, categories (Cement, Steel, Bricks, Electrical), 24h fast delivery badge.
2. **Product Catalog & Slabs**: Wholesale bulk discount tiers, technical specifications, and brand filters.
3. **Interactive Map & Delivery Site**: GPS delivery site pin, landmark inputs, and Hyderabad serviceability badge.
4. **Enterprise RFQ Engine**: B2B quote request form, quantity negotiations, and contractor RFQ list.
5. **Secure Razorpay Checkout**: 256-Bit SSL payment badge, UPI/Card/COD options, and instant order tracking.

---

## 6. Pre-Submission Verification Checklist

- [x] Application name is consistently set to `HINCH MART`.
- [x] Bundle identifier `com.hinchmart` is uniquely registered.
- [x] Version `1.0.28` and Build `29` are set in both `app.json` and `Info.plist`.
- [x] Privacy Manifest (`PrivacyInfo.xcprivacy`) created with all required reason codes.
- [x] All 5 permission strings (`NSCamera`, `NSPhotoLibrary`, `NSLocation`, etc.) declared.
- [x] `ITSAppUsesNonExemptEncryption` set to `false`.
- [x] Deep link URL schemes `hinchmart://`, `com.hinchmart`, and `com.hinch` configured in `Info.plist`.
- [x] App icon (1024x1024) and splash screen assets compiled into `Images.xcassets`.
- [x] Automated test suite passed (39 of 39 tests passing).
- [x] TypeScript validation passed with zero errors (`npx tsc --noEmit`).
- [x] Full iOS Metro JavaScript bundle compiled cleanly (1,745 modules bundled).
- [ ] Apple Distribution Certificate and Provisioning Profile generated in Apple Developer portal.
- [ ] Push Notifications capability enabled on Apple Developer portal for `com.hinchmart`.
- [ ] APNs Authentication Key (`.p8`) uploaded to Firebase Console for iOS push notifications.
- [ ] TestFlight build uploaded and verified on a physical iPhone.
- [ ] App Store Connect listing completed (Description, Keywords, Support URL, Privacy Policy URL).
- [ ] Submit for App Store Review.
