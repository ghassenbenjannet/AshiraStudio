import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ONGLETS_MOBILES } from "./nav-config.js";

/** Navigation mobile (<768 px) : barre basse 5 onglets, cibles tactiles ≥44 px (§3, §7.1). */
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-panel/95 px-1 pt-1 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("nav.espaces.home") as string}
    >
      {ONGLETS_MOBILES.map((onglet) => (
        <NavLink
          key={onglet.id}
          to={onglet.chemin}
          className={({ isActive }) =>
            `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] ${
              isActive ? "bg-[#FDEEE6] font-semibold text-sable" : "text-dim"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="text-base leading-none">{onglet.icone}</span>
              {t(onglet.labelKey)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
