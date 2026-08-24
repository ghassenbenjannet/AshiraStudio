import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ONGLETS_MOBILES } from "./nav-config.js";

/** Navigation mobile (<768 px) : barre basse 5 onglets, cibles tactiles ≥44 px (§3, §7.1). */
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-panel md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("nav.espaces.home") as string}
    >
      {ONGLETS_MOBILES.map((onglet) => (
        <NavLink
          key={onglet.id}
          to={onglet.chemin}
          className={({ isActive }) =>
            `flex min-h-tap flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${
              isActive ? "text-sable" : "text-dim"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`h-1.5 w-1.5 rounded-full bg-current ${isActive ? "opacity-100" : "opacity-0"}`} />
              {t(onglet.labelKey)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
