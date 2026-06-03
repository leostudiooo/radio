export type { BaseTranslation, Locale, Translation, TranslationFunctions } from './i18n-types';
export {
  availableLocales,
  clearStoredLocale,
  defaultLocale,
  detectBrowserLocale,
  getStoredLocale,
  isLocale,
  loadLocale,
  loadLocaleAsync,
  localeNames,
  localeStorageKey,
  setStoredLocale,
  translations,
} from './i18n-util';

import { detectBrowserLocale, defaultLocale, getStoredLocale } from './i18n-util';
import type { Locale } from './i18n-types';

export function detectLocale(): Locale {
  const storedLocale = getStoredLocale();
  if (storedLocale) {
    return storedLocale;
  }

  if (typeof navigator !== 'undefined') {
    return detectBrowserLocale(navigator.language, navigator.languages ?? []);
  }

  return defaultLocale;
}
