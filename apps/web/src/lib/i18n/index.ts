import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type TranslationKey } from "./en";
import { fr } from "./fr";
import { de } from "./de";
import { es } from "./es";

export const languageStorageKey = "webapp-v2-lang";

export const translations = {
  en,
  fr,
  de,
  es,
} as const;

export type SupportedLanguage = keyof typeof translations;

export const supportedLanguages = Object.keys(translations) as SupportedLanguage[];

type TranslationParams = Record<string, string | number>;

function normalizeLang(value: string | null | undefined): SupportedLanguage {
  const lower = (value ?? "").toLowerCase();
  return (supportedLanguages.find((lang) => lower.startsWith(lang)) ?? "en") as SupportedLanguage;
}

function detectBrowserLang(): SupportedLanguage {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const preferred = navigator.languages?.[0] ?? navigator.language ?? "en";
  return normalizeLang(preferred);
}

function formatTemplate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function translate(key: string, lang: SupportedLanguage, params?: TranslationParams) {
  const template = translations[lang][key as TranslationKey] ?? translations.en[key as TranslationKey] ?? key;
  return formatTemplate(template, params);
}

type I18nContextValue = {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SupportedLanguage>(() => {
    const storedLang = window.localStorage.getItem(languageStorageKey);
    if (storedLang) {
      return normalizeLang(storedLang);
    }

    return detectBrowserLang();
  });

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (nextLang: SupportedLanguage) => {
    setLangState(nextLang);
  };

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang }),
    [lang]
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("I18nProvider is required.");
  }

  return context;
}

export function useTranslation() {
  const { lang } = useI18nContext();

  const t = (key: string, params?: TranslationParams) => {
    return translate(key, lang, params);
  };

  return { t, lang };
}
