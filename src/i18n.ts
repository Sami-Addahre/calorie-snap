import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import it from './locales/it/translation.json';
import en from './locales/en/translation.json';

const resources = {
  it: { translation: it },
  en: { translation: en },
};

const detect = () => {
  if (typeof window === 'undefined') return 'en';
  const nav = navigator.language || (navigator as any).userLanguage || 'en';
  return nav.toLowerCase().startsWith('it') ? 'it' : 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: detect(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
