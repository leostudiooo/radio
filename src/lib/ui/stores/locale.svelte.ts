import { detectLocale, setStoredLocale, loadLocale, type Locale, type Translation } from '$lib/i18n';

function createLocaleStore() {
  let locale = $state<Locale>(detectLocale());

  let translation = $derived<Translation>(loadLocale(locale));

  function setLocale(newLocale: Locale) {
    locale = newLocale;
    setStoredLocale(newLocale);
  }

  return {
    get locale() { return locale; },
    get translation() { return translation; },
    setLocale,
  };
}

export const localeStore = createLocaleStore();
