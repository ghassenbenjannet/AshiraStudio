import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ESPACES } from "./nav-config.js";

/** Rail latéral desktop (≥1024 px), sept espaces (§3). */
export function SideRail() {
  const { t } = useTranslation();
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-e border-line bg-panel p-3 lg:flex" aria-label="Navigation">
      <div className="mb-4 px-2 pt-2 font-display text-lg text-off">{t("app.nom")}</div>
      {ESPACES.map((espace) => (
        <NavLink
          key={espace.id}
          to={espace.chemin}
          className={({ isActive }) =>
            `min-h-tap rounded-card px-3 py-2 text-sm transition-colors ${
              isActive ? "bg-panel2 text-sable" : "text-dim hover:bg-panel2 hover:text-off"
            }`
          }
        >
          {t(espace.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
