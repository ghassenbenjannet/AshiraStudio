import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ESPACES } from "./nav-config.js";
import { useAuth } from "../../lib/auth-context.js";

/** Rail latéral desktop (≥1024 px), sept espaces (§3). */
export function SideRail() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const groupes = [
    { id: "piloter", label: "Piloter" },
    { id: "creer", label: "Créer" },
    { id: "analyser", label: "Analyser" },
    { id: "equipe", label: "Équipe" },
    { id: "admin", label: "Administration" },
  ] as const;

  return (
    <nav className="sticky top-0 hidden h-dvh w-[246px] shrink-0 flex-col border-e border-line bg-panel px-4 py-5 lg:flex" aria-label="Navigation">
      <div className="mb-5 flex items-center gap-3 px-1">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-sable font-display text-xl font-semibold text-white">ع</div>
        <div className="min-w-0">
          <div className="font-display text-lg font-semibold leading-tight text-off">{t("app.nom")}</div>
          <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">Chapitre I · Al Awwal</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pe-1">
        {groupes.map((groupe) => {
          const liens = ESPACES.filter((espace) => espace.groupe === groupe.id);
          if (!liens.length) return null;
          return (
            <div key={groupe.id} className="mb-2">
              <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.13em] text-dim/70">{groupe.label}</div>
              {liens.map((espace) => (
                <NavLink
                  key={espace.id}
                  to={espace.chemin}
                  className={({ isActive }) =>
                    `mb-0.5 flex min-h-tap items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? "bg-[#FDEEE6] font-semibold text-sable" : "text-[#5B5449] hover:bg-panel2 hover:text-off"
                    }`
                  }
                >
                  <span className="w-5 text-center text-[15px] opacity-80">{espace.icone}</span>
                  <span>{t(espace.labelKey)}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-[14px] border border-line bg-[#FCFAF6] p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-olive text-xs font-bold text-white">
            {utilisateur?.nom.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() ?? "AC"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-off">{utilisateur?.nom ?? "Achirah"}</div>
            <div className="truncate text-[10px] capitalize text-dim">{utilisateur?.role_systeme ?? "équipe"}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
