import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr.json";
import ar from "./ar.json";

export const LANGUES_DISPONIBLES = ["fr", "ar"] as const;
export type LangueDisponible = (typeof LANGUES_DISPONIBLES)[number];

const LANGUE_STOCKAGE_KEY = "achirah_langue";

function langueInitiale(): LangueDisponible {
  const stockee = localStorage.getItem(LANGUE_STOCKAGE_KEY);
  if (stockee === "fr" || stockee === "ar") return stockee;
  return "fr";
}

/** RTL total, miroir de navigation (§1.4) — appliqué à chaque changement de langue. */
export function appliquerDirection(langue: LangueDisponible): void {
  document.documentElement.lang = langue;
  document.documentElement.dir = langue === "ar" ? "rtl" : "ltr";
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: langueInitiale(),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (langue) => {
  if (langue === "fr" || langue === "ar") {
    localStorage.setItem(LANGUE_STOCKAGE_KEY, langue);
    appliquerDirection(langue);
  }
});

appliquerDirection(i18n.language as LangueDisponible);

export default i18n;
