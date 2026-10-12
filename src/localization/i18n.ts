/**
 * HINCH MART — i18n Configuration (EN, AR, HI)
 */
import { en } from './en';
import { ar } from './ar';
import { hi } from './hi';
import { mmkvStorage } from '../services/storage/mmkv';
import { STORAGE_KEYS } from '../constants/app';
import { I18nManager } from 'react-native';

export type TranslationKeys = typeof en;

const translations: Record<string, TranslationKeys> = {
  en,
  ar,
  hi,
};

let currentLanguage = mmkvStorage.getString(STORAGE_KEYS.LANGUAGE) ?? 'en';

// Always force correct LTR / RTL state on startup
const shouldBeRTL = currentLanguage === 'ar';
I18nManager.allowRTL(shouldBeRTL);
I18nManager.forceRTL(shouldBeRTL);
if (typeof (I18nManager as any).swapLeftAndRightInRTL === 'function') {
  (I18nManager as any).swapLeftAndRightInRTL(shouldBeRTL);
}

export function setAppLanguage(lang: string) {
  currentLanguage = lang;
  mmkvStorage.setString(STORAGE_KEYS.LANGUAGE, lang);

  const isRTL = lang === 'ar';
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
  if (typeof (I18nManager as any).swapLeftAndRightInRTL === 'function') {
    (I18nManager as any).swapLeftAndRightInRTL(isRTL);
  }
}

export function getCurrentLanguage(): string {
  return currentLanguage;
}

export function isRTL(): boolean {
  return currentLanguage === 'ar';
}

export function translate(path: string, params?: Record<string, string | number>): string {
  const keys = path.split('.');
  let current: any = translations[currentLanguage] ?? translations.en;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      // Fallback to English
      let fallback: any = translations.en;
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return path;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') {
    return path;
  }

  if (params && typeof params === 'object') {
    return Object.entries(params).reduce((str, [key, val]) => {
      return str.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    }, current);
  }

  return current;
}

export { en, ar, hi };
