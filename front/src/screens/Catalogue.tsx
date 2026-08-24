import { useTranslation } from "react-i18next";
import { EcranAConstruire } from "../components/ui/EcranAConstruire.js";

/** E07 — Catalogue (accès direct depuis l'onglet mobile). Construit en Phase ②. */
export function Catalogue() {
  const { t } = useTranslation();
  return <EcranAConstruire titre={t("nav.mobile.catalogue")} />;
}
