export const languageCatalog = Object.freeze([
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    speechLocale: 'en-GB',
    status: 'active',
    sortOrder: 1
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    speechLocale: 'de-DE',
    status: 'active',
    sortOrder: 2
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    speechLocale: 'es-ES',
    status: 'coming_soon',
    sortOrder: 3
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    speechLocale: 'fr-FR',
    status: 'coming_soon',
    sortOrder: 4
  }
]);

export const getLanguage = code =>
  languageCatalog.find(language => language.code === code) || null;

export const isAvailableLanguage = code =>
  getLanguage(code)?.status === 'active';

export const availableLanguages = () =>
  languageCatalog.filter(language => language.status === 'active');

export function publicLanguageCatalog() {
  return languageCatalog.map(({ code, name, nativeName, speechLocale, status, sortOrder }) => ({
    code,
    name,
    native_name: nativeName,
    speech_locale: speechLocale,
    status,
    sort_order: sortOrder
  }));
}
