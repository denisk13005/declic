/**
 * Traductions de l'interface (i18next).
 *
 * - Les textes sont dans `src/i18n/locales/<langue>.json` (un fichier par langue).
 * - La langue suit celle du téléphone ; anglais si elle n'est pas traduite, et pour toute clé
 *   manquante dans une langue (fallback).
 * - Usage dans un composant : `const { t } = useTranslation();` puis `t('calories.addFood')`.
 *   Hors composant : `import i18n from '@/i18n'` puis `i18n.t('...')`.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { fr as dateFr, enUS as dateEn, type Locale } from 'date-fns/locale';

import fr from './locales/fr.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Langue des téléphones réglés dans une langue non traduite (anglais : la plus comprise dans le monde)
const FALLBACK: AppLanguage = 'en';

function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode ?? FALLBACK;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code) ? (code as AppLanguage) : FALLBACK;
}

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: deviceLanguage(),
  fallbackLng: FALLBACK,
  interpolation: { escapeValue: false }, // React échappe déjà
  returnNull: false,
});

/**
 * Table de libellés traduite à la lecture : `LABELS[key]` renvoie `t(`${prefix}.${key}`)`.
 * Permet de garder les tables existantes (`GOAL_LABELS[goal]`…) sans modifier leurs utilisations.
 */
export function translatedRecord<K extends string>(keys: readonly K[], prefix: string): Record<K, string> {
  const record = {} as Record<K, string>;
  for (const key of keys) {
    Object.defineProperty(record, key, { get: () => i18n.t(`${prefix}.${key}`), enumerable: true });
  }
  return record;
}

/** Langue active de l'app */
export function currentLanguage(): AppLanguage {
  return (i18n.language as AppLanguage) ?? FALLBACK;
}

/** Locale date-fns correspondant à la langue active (format des dates) */
export function dateLocale(): Locale {
  return currentLanguage() === 'en' ? dateEn : dateFr;
}

export default i18n;
