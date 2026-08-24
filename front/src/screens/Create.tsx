import { useTranslation } from "react-i18next";
import { EcranAConstruire } from "../components/ui/EcranAConstruire.js";

/** CREATE — studio, boards, idées, contenus, assets, call sheets. Construit en Phases ④/⑤. */
export function Create() {
  const { t } = useTranslation();
  return <EcranAConstruire titre={t("nav.espaces.create")} />;
}
