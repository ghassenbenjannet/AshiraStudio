import { useTranslation } from "react-i18next";
import { EcranAConstruire } from "../components/ui/EcranAConstruire.js";

/** RÉFÉRENTIELS/PARAMÈTRES — catalogue, listes, leçons, lexique, utilisateurs. Construit en Phase ②. */
export function Parametres() {
  const { t } = useTranslation();
  return <EcranAConstruire titre={t("nav.espaces.parametres")} />;
}
