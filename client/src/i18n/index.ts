import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// One JSON file per feature/page under locales/<lang>/, loaded eagerly and registered as an
// i18next namespace named after the file. Adding a new namespace is just adding the file —
// nothing here needs to change.
const enModules = import.meta.glob("../locales/en/*.json", { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;
const frModules = import.meta.glob("../locales/fr/*.json", { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

function namespacesFrom(modules: Record<string, { default: Record<string, unknown> }>) {
  const namespaces: Record<string, Record<string, unknown>> = {};
  for (const path in modules) {
    const name = path.split("/").pop()!.replace(".json", "");
    namespaces[name] = modules[path].default;
  }
  return namespaces;
}

const enNamespaces = namespacesFrom(enModules);
const frNamespaces = namespacesFrom(frModules);

export const APP_LANGUAGES = ["en", "fr"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

const STORAGE_KEY = "faceup-language";

function getInitialLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if ((APP_LANGUAGES as readonly string[]).includes(stored ?? "")) return stored as AppLanguage;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to default below.
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: { en: enNamespaces, fr: frNamespaces },
  ns: Object.keys(enNamespaces),
  defaultNS: "common",
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export function setAppLanguage(lang: AppLanguage) {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Best-effort persistence only.
  }
}

export function getAppLanguage(): AppLanguage {
  return (i18n.language as AppLanguage) || "en";
}

export default i18n;
