import en from './en';
import zh from './zh';
import { locales } from './i18n-types';
import type { Locale, Translation } from './i18n-types';

export const defaultLocale: Locale = 'en';
export const localeStorageKey = 'radio.locale';

export const localeNames = {
  en: 'English',
  zh: '中文',
} as const satisfies Record<Locale, string>;

export const translations = {
  en,
  zh,
} as const satisfies Record<Locale, Translation>;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'zh';
}

export function getStoredLocale(): Locale | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const value = localStorage.getItem(localeStorageKey);
  return isLocale(value) ? value : null;
}

export function setStoredLocale(locale: Locale): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(localeStorageKey, locale);
}

export function clearStoredLocale(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(localeStorageKey);
}

export function detectBrowserLocale(language?: string, languages: readonly string[] = []): Locale {
  const candidates = [language, ...languages].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();

    if (normalized.startsWith('zh')) {
      return 'zh';
    }

    if (normalized.startsWith('en')) {
      return 'en';
    }
  }

  return defaultLocale;
}

export function loadLocale(locale: Locale): Translation {
  return translations[locale];
}

export async function loadLocaleAsync(locale: Locale): Promise<Translation> {
  return loadLocale(locale);
}

export function availableLocales(): readonly Locale[] {
  return locales;
}
