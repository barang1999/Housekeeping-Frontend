import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { defaultLanguage, supportedLanguages, translations } from './translations';

const LanguageContext = createContext(null);

const formatMessage = (template, vars) => {
  if (!template || typeof template !== 'string') return template;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key];
    }
    return match;
  });
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultLanguage;
    }
    const stored = window.localStorage.getItem('language');
    return stored && translations[stored] ? stored : defaultLanguage;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('language', language);
  }, [language]);

  const changeLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
    }
  }, []);

  const translate = useCallback((key, fallback, vars) => {
    const store = translations[language] || {};
    const message = store[key] || fallback || key;
    return formatMessage(message, vars);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: changeLanguage,
    supportedLanguages,
    t: translate,
  }), [language, translate, changeLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const useTranslation = () => {
  const { t, language, setLanguage, supportedLanguages: langs } = useLanguage();
  return { t, language, setLanguage, supportedLanguages: langs };
};
