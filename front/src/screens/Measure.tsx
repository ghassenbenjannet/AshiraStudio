import { useTranslation } from "react-i18next";
import { EcranAConstruire } from "../components/ui/EcranAConstruire.js";

/** MEASURE — analytics consolidés, intégrations. Construit en Phase ⑥. */
export function Measure() {
  const { t } = useTranslation();
  return <EcranAConstruire titre={t("nav.espaces.measure")} />;
}
