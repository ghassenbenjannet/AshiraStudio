import { useTranslation } from "react-i18next";
import { CampagnesListe } from "./plan/CampagnesListe.js";

/** PLAN — campagnes, tâches (le board couvre Liste/Kanban/Calendrier — E04+E18), budgets (dans chaque campagne). */
export function Plan() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-5 rounded-card border border-line bg-panel p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-sable">Hiérarchie de travail</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-off">{t("campagnes.titre")}</h1>
        <p className="mt-1 text-sm text-dim">Choisissez une campagne pour accéder à ses tâches, son budget, son équipe, ses contenus et ses résultats.</p>
      </div>
      <CampagnesListe />
    </div>
  );
}
