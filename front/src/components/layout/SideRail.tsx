import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ESPACES_CAMPAGNE, ESPACES_PATRIMOINE, type EspaceNav } from "./nav-config.js";
import { useCampagneContexte } from "../../lib/campagne-contexte.js";

function LienEspace({ espace }: { espace: EspaceNav }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={espace.chemin}
      className={({ isActive }) =>
        `min-h-tap rounded-card px-3 py-2 text-sm transition-colors ${
          isActive ? "bg-panel2 text-sable" : "text-dim hover:bg-panel2 hover:text-off"
        }`
      }
    >
      {t(espace.labelKey)}
    </NavLink>
  );
}

/** Rail latéral desktop (≥1024 px), deux groupes visuellement séparés (CR-02 §A) : CAMPAGNE
 *  (contextuelle, avec sélecteur intégré) puis PATRIMOINE (transverse à toutes les campagnes). */
export function SideRail() {
  const { t } = useTranslation();
  const { campagnes, campagneActive, mode, chargement, definirCampagneActive, activerToutesCampagnes } = useCampagneContexte();

  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-e border-line bg-panel p-3 lg:flex" aria-label="Navigation">
      <div className="mb-4 px-2 pt-2 font-display text-lg text-off">{t("app.nom")}</div>

      <div className="mb-2 px-2">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-dim" htmlFor="rail-campagne-contexte">
          {t("nav.groupes.campagne")}
        </label>
        {!chargement && (
          <select
            id="rail-campagne-contexte"
            value={mode === "campagne" ? (campagneActive?.id ?? "") : "__toutes__"}
            onChange={(e) => (e.target.value === "__toutes__" ? activerToutesCampagnes() : definirCampagneActive(e.target.value))}
            className="min-h-tap w-full truncate rounded-field border border-line bg-panel2 px-2 text-sm text-sable"
          >
            <option value="__toutes__">{t("nav.contexte.toutes")}</option>
            {campagnes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        )}
      </div>
      {ESPACES_CAMPAGNE.map((espace) => (
        <LienEspace key={espace.id} espace={espace} />
      ))}

      <div className="my-3 border-t border-line" />
      <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-dim">{t("nav.groupes.patrimoine")}</div>
      {ESPACES_PATRIMOINE.map((espace) => (
        <LienEspace key={espace.id} espace={espace} />
      ))}
    </nav>
  );
}
