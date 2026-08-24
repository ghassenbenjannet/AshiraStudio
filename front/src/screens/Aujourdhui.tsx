import { useTranslation } from "react-i18next";
import { EcranAConstruire } from "../components/ui/EcranAConstruire.js";

/** E03 — Aujourd'hui (cockpit). Construit en Phase ③ (§4.6, bandeau chapitre, blocs, Brief IA). */
export function Aujourdhui() {
  const { t } = useTranslation();
  return <EcranAConstruire titre={t("nav.espaces.home")} />;
}
