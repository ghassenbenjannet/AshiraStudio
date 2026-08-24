import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCampagneContexte } from "../../lib/campagne-contexte.js";

/** CR-02 §A — sélecteur de contexte de campagne, persistant sous le header, sur tous les écrans. */
export function CampagneSwitcherBar() {
  const { t } = useTranslation();
  const { campagnes, campagneActive, mode, chargement, definirCampagneActive, activerToutesCampagnes } = useCampagneContexte();

  if (chargement) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-panel px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-xs uppercase tracking-wide text-dim">{t("nav.contexte.titre")}</span>
        <select
          value={mode === "campagne" ? (campagneActive?.id ?? "") : "__toutes__"}
          onChange={(e) => (e.target.value === "__toutes__" ? activerToutesCampagnes() : definirCampagneActive(e.target.value))}
          className="min-h-tap max-w-full flex-1 truncate rounded-field border border-line bg-panel2 px-2 text-sm text-off sm:max-w-xs"
          aria-label={t("nav.contexte.titre")}
        >
          <option value="__toutes__">{t("nav.contexte.toutes")}</option>
          {campagnes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </div>
      <Link to="/plan/campagnes" className="min-h-tap shrink-0 text-xs text-dim underline hover:text-off">
        {t("nav.contexte.gerer")}
      </Link>
    </div>
  );
}
