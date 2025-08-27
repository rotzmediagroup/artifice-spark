import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Language configuration
export const supportedLanguages = {
  en: { name: 'English', flag: '🇺🇸' },
  nl: { name: 'Nederlands', flag: '🇳🇱' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  zh: { name: '中文', flag: '🇨🇳' },
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

// Initialize i18next
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    supportedLngs: Object.keys(supportedLanguages),
    
    // Language detection configuration
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'rotz-language',
      caches: ['localStorage'],
      excludeCacheFor: ['cimode'], // never cache in cimode
    },

    // Backend configuration
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      // Add cache busting
      queryStringParams: { v: Date.now() },
      // Force reload resources
      reloadInterval: false,
    },
    
    // Resource loading
    load: 'languageOnly', // Load only language, not region (en instead of en-US)
    preload: ['en'], // Always preload English as fallback

    // Namespaces
    ns: ['common', 'generator', 'auth', 'admin', 'errors'],
    defaultNS: 'common',

    // React i18next configuration
    react: {
      useSuspense: false, // Avoid suspense for now
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },

    // Interpolation
    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Debug in development
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;