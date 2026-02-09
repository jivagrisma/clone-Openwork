/**
 * i18n Configuration for WaIA
 *
 * Internationalization setup with Spanish (es) as default language
 * and English (en) as fallback.
 *
 * Optimized to avoid esbuild EPIPE errors in development
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import esCommon from '../locales/es/common.json';
import enCommon from '../locales/en/common.json';

// Resources object containing all translations
const resources = {
  es: {
    common: esCommon,
  },
  en: {
    common: enCommon,
  },
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,

    // Default language: Spanish (Latin America)
    lng: 'es',

    // Fallback language if translation is missing
    fallbackLng: 'en',

    // Default namespace
    defaultNS: 'common',

    // React already does escaping
    interpolation: {
      escapeValue: false,
    },

    // Disable debug mode to avoid esbuild EPIPE errors
    debug: false,

    // React settings - disable useSuspense for React 19 compatibility
    react: {
      useSuspense: false,
    },
  });

export default i18n;
