import { useTranslation } from "react-i18next";
import { EcranAConstruire } from "../components/ui/EcranAConstruire.js";

/** PLAN — campagnes, budgets, calendrier éditorial. Construit en Phase ③. */
export function Plan() {
  const { t } = useTranslation();
  return <EcranAConstruire titre={t("nav.espaces.plan")} />;
}
