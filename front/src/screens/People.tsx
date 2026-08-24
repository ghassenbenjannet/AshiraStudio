import { useTranslation } from "react-i18next";
import { EcranAConstruire } from "../components/ui/EcranAConstruire.js";

/** PEOPLE — contacts, Network, Cercle (ambassadeurs). Construit en Phase ②. */
export function People() {
  const { t } = useTranslation();
  return <EcranAConstruire titre={t("nav.espaces.people")} />;
}
