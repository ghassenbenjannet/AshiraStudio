import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SideRail } from "./SideRail.js";
import { BottomNav } from "./BottomNav.js";
import { NotificationsCloche } from "./NotificationsCloche.js";
import { CampagneSwitcherBar } from "./CampagneSwitcherBar.js";
import { useAuth } from "../../lib/auth-context.js";
import { CampagneContexteProvider } from "../../lib/campagne-contexte.js";
import { LANGUES_DISPONIBLES, type LangueDisponible } from "../../i18n/index.js";

function SelecteurLangue() {
  const { i18n, t } = useTranslation();
  return (
    <div className="flex items-center gap-1 rounded-field border border-line p-0.5 text-xs">
      {LANGUES_DISPONIBLES.map((langue: LangueDisponible) => (
        <button
          key={langue}
          type="button"
          onClick={() => void i18n.changeLanguage(langue)}
          className={`min-h-tap min-w-tap rounded-field px-2 ${
            i18n.language === langue ? "bg-panel2 text-sable" : "text-dim"
          }`}
          aria-pressed={i18n.language === langue}
        >
          {t(`langue.${langue}`)}
        </button>
      ))}
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { utilisateur, deconnecter } = useAuth();

  return (
    <CampagneContexteProvider>
      <div className="flex min-h-dvh bg-bg">
        <SideRail />
        <div className="flex flex-1 flex-col">
          <header className="flex min-h-tap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-2 lg:hidden">
            <span className="font-display text-base text-off">{t("app.nom")}</span>
            <div className="flex items-center gap-2">
              <NotificationsCloche />
              <SelecteurLangue />
            </div>
          </header>
          <main className="mx-auto w-full max-w-content flex-1 px-4 pb-20 pt-4 md:pb-4">
            <div className="mb-4 hidden items-center justify-between lg:flex">
              <div />
              <div className="flex items-center gap-3">
                {utilisateur && <span className="text-sm text-dim">{utilisateur.nom}</span>}
                <NotificationsCloche />
                <SelecteurLangue />
                <button
                  type="button"
                  onClick={() => void deconnecter()}
                  className="min-h-tap rounded-field border border-line px-3 text-sm text-dim hover:text-off"
                >
                  {t("auth.deconnexion")}
                </button>
              </div>
            </div>
            <CampagneSwitcherBar />
            <Outlet />
          </main>
          <BottomNav />
        </div>
      </div>
    </CampagneContexteProvider>
  );
}
