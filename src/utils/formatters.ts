/**
 * HINCH MART — Utility Formatters
 */
import { SUPPORTED_CURRENCIES, STORAGE_KEYS } from '../constants/app';
import { mmkvStorage } from '../services/storage/mmkv';

/**
 * Currency conversion rates relative to USD base
 */
const CURRENCY_RATES: Record<string, number> = {
  INR: 83.5,
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  AED: 3.67,
  SAR: 3.75,
  CNY: 7.23,
  JPY: 155.0,
  AUD: 1.52,
  CAD: 1.36,
};

/**
 * Format price with active selected currency symbol & rate
 * All backend prices and amounts are fundamentally in INR.
 */
export function formatPrice(amount: number | string | undefined | null, baseCurrency = 'INR'): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }
  const numericAmount = Number(amount);
  const activeCurrencyCode = mmkvStorage.getString(STORAGE_KEYS.CURRENCY) || 'INR';
  const currencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === activeCurrencyCode);
  const symbol = currencyInfo?.symbol ?? '₹';

  const baseRate = CURRENCY_RATES[baseCurrency] ?? 83.5;
  const targetRate = CURRENCY_RATES[activeCurrencyCode] ?? 83.5;
  const convertedAmount = numericAmount * (targetRate / baseRate);

  const formattedNum = Number.isFinite(convertedAmount)
    ? convertedAmount.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : '0';

  return `${symbol}${formattedNum}`;
}

/**
 * Format compact number (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date relative to now
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  return date.toLocaleDateString();
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(dateString);
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };

  return date.toLocaleDateString('en-US', optionsMap[format]);
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format order number for display
 */
export function formatOrderNumber(orderNumber: string): string {
  return `#${orderNumber}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format weight with unit
 */
export function formatWeight(weight: number, unit: 'kg' | 'lb'): string {
  return `${weight} ${unit}`;
}

/**
 * Convert between metric and imperial
 */
export function convertUnit(value: number, from: 'cm' | 'in' | 'kg' | 'lb', to: 'cm' | 'in' | 'kg' | 'lb'): number {
  const conversions: Record<string, number> = {
    'cm_in': 0.393701,
    'in_cm': 2.54,
    'kg_lb': 2.20462,
    'lb_kg': 0.453592,
  };
  const key = `${from}_${to}`;
  const factor = conversions[key];
  if (!factor) return value;
  return parseFloat((value * factor).toFixed(2));
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(original: number, discounted: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
}
