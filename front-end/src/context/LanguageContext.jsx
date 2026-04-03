import { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';
import ml from '../locales/ml.json';
import hi from '../locales/hi.json';
import ta from '../locales/ta.json';

const LanguageContext = createContext();

const translations = {
  en: en,
  es: es,
  ml: ml,
  hi: hi,
  ta: ta,
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage, default to 'en'
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key, replacements = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    let fallbackValue = translations.en;

    for (const k of keys) {
      value = value?.[k];
      fallbackValue = fallbackValue?.[k];
    }

    const resolved = value || fallbackValue || key;

    if (typeof resolved !== 'string') {
      return resolved;
    }

    return resolved.replace(/\{\{(\w+)\}\}/g, (_, token) => {
      return Object.prototype.hasOwnProperty.call(replacements, token) ? String(replacements[token]) : `{{${token}}}`;
    });
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
