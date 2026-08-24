import { useTranslation } from "react-i18next";
import { EcranAConstruire } from "../components/ui/EcranAConstruire.js";

/** GROW — actions de croissance, tendances, veille. Construit en Phase ⑥. */
export function Grow() {
  const { t } = useTranslation();
  return <EcranAConstruire titre={t("nav.espaces.grow")} />;
}
