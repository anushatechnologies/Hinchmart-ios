/**
 * HINCH MART — App Constants
 */

export const APP_NAME = 'HINCH MART';
export const APP_TAGLINE = 'Everything for Every Construction';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'hinchmart_access_token',
  REFRESH_TOKEN: 'hinchmart_refresh_token',
  USER: 'hinchmart_user',
  THEME_MODE: 'hinchmart_theme_mode',
  LANGUAGE: 'hinchmart_language',
  CURRENCY: 'hinchmart_currency',
  HAS_ONBOARDED: 'hinchmart_has_onboarded',
  CART: 'hinchmart_cart',
  WISHLIST: 'hinchmart_wishlist',
  SEARCH_HISTORY: 'hinchmart_search_history',
  RECENTLY_VIEWED: 'hinchmart_recently_viewed',
  BIOMETRIC_ENABLED: 'hinchmart_biometric_enabled',
  PUSH_TOKEN: 'hinchmart_push_token',
  MEASUREMENT_UNIT: 'hinchmart_measurement_unit',
} as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
] as const;

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
] as const;

export const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: 'Build with Confidence',
    description: 'Access millions of construction products from verified manufacturers and suppliers worldwide.',
    image: 'onboarding_build',
  },
  {
    id: '2',
    title: 'Connect & Compare',
    description: 'Get instant quotes from multiple vendors, compare prices, and choose the best deal for your project.',
    image: 'onboarding_connect',
  },
  {
    id: '3',
    title: 'Manage Everything',
    description: 'Track orders, manage RFQs, rent equipment, and grow your construction business — all in one app.',
    image: 'onboarding_manage',
  },
] as const;

export const ACCOUNT_TYPES = [
  { value: 'individual', label: 'Individual / Home Owner', icon: 'account' },
  { value: 'business', label: 'Business / Company', icon: 'office-building' },
  { value: 'contractor', label: 'Contractor / Builder', icon: 'hammer-wrench' },
  { value: 'vendor', label: 'Vendor / Supplier', icon: 'store' },
] as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  PRODUCTS_LIMIT: 24,
  ORDERS_LIMIT: 15,
  REVIEWS_LIMIT: 10,
  NOTIFICATIONS_LIMIT: 20,
  CHAT_MESSAGES_LIMIT: 50,
} as const;

export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 60;
export const MAX_SEARCH_HISTORY = 20;
export const MAX_RECENTLY_VIEWED = 30;
export const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const FILE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
