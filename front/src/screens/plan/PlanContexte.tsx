import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCampagneContexte } from "../../lib/campagne-contexte.js";
import { CampagnesListe } from "./CampagnesListe.js";

/** CR-02 §A — l'onglet « Campagne »/« Espace de travail » ouvre directement le hub contextuel,
 *  jamais la liste. La liste (« Gérer les campagnes ») ne sert que de repli quand aucune campagne
 *  n'est en contexte (mode « toutes campagnes », ou aucune campagne créée). */
export function PlanContexte() {
  const { t } = useTranslation();
  const { mode, campagneActiveId, chargement } = useCampagneContexte();

  if (chargement) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;
  if (mode === "campagne" && campagneActiveId) return <Navigate to={`/plan/campagnes/${campagneActiveId}`} replace />;
  return <CampagnesListe />;
}
