import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SideRail } from "./SideRail.js";
import { BottomNav } from "./BottomNav.js";
import { NotificationsCloche } from "./NotificationsCloche.js";
import { useAuth } from "../../lib/auth-context.js";
import { LANGUES_DISPONIBLES, type LangueDisponible } from "../../i18n/index.js";

function SelecteurLangue() {
  const { i18n, t } = useTranslation();
  return (
    <div className="flex items-center gap-0.5 rounded-[10px] border border-line bg-panel p-0.5 text-xs">
      {LANGUES_DISPONIBLES.map((langue: LangueDisponible) => (
        <button
          key={langue}
          type="button"
          onClick={() => void i18n.changeLanguage(langue)}
          className={`min-h-tap min-w-tap rounded-field px-2 ${
            i18n.language === langue ? "bg-[#FDEEE6] font-semibold text-sable" : "text-dim hover:text-off"
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
  const { deconnecter } = useAuth();
  const location = useLocation();
  const routeMeta = (() => {
    const chemin = location.pathname;
    if (chemin.startsWith("/plan/campagnes/")) return { titre: "Campagne", sousTitre: "Stratégie, équipe, contenus et mesure" };
    if (chemin.startsWith("/plan/taches/")) return { titre: "Fiche tâche", sousTitre: "Détails, checklist et collaboration" };
    if (chemin.startsWith("/catalogue/")) return { titre: "Fiche article", sousTitre: "Modèle, coloris, coûts et historique" };
    if (chemin === "/aujourdhui") return { titre: t("nav.espaces.home"), sousTitre: "Vue d’ensemble · lundi 24 août" };
    if (chemin.startsWith("/plan")) return { titre: t("nav.espaces.plan"), sousTitre: "Campagnes, tâches et calendrier" };
    if (chemin.startsWith("/create")) return { titre: t("nav.espaces.create"), sousTitre: "Studio, contenus et assets" };
    if (chemin.startsWith("/catalogue")) return { titre: t("nav.mobile.catalogue"), sousTitre: "Articles, variantes et stocks" };
    if (chemin.startsWith("/grow")) return { titre: t("nav.espaces.grow"), sousTitre: "Décider quoi améliorer ensuite" };
    if (chemin.startsWith("/measure")) return { titre: t("nav.espaces.measure"), sousTitre: "Social, Paid, Site et ventes" };
    if (chemin.startsWith("/people")) return { titre: t("nav.espaces.people"), sousTitre: "Contacts, partenaires et collaborateurs" };
    if (chemin.startsWith("/parametres")) return { titre: t("nav.espaces.parametres"), sousTitre: "Référentiels, équipe et sécurité" };
    return { titre: t("app.nom"), sousTitre: "" };
  })();

  return (
    <div className="flex min-h-dvh bg-bg">
      <SideRail />
      <div className="min-w-0 flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[68px] w-full max-w-content items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-sable font-display text-lg font-semibold text-white lg:hidden">ع</div>
            <div className="min-w-0">
              <div className="truncate font-display text-[20px] font-semibold leading-tight tracking-[-0.02em] text-off">{routeMeta.titre}</div>
              {routeMeta.sousTitre && <div className="mt-0.5 hidden truncate text-xs text-dim sm:block">{routeMeta.sousTitre}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsCloche />
            <SelecteurLangue />
            <button
              type="button"
              onClick={() => void deconnecter()}
              className="hidden min-h-tap rounded-[10px] border border-line bg-panel px-3 text-xs font-medium text-dim hover:border-sable hover:text-sable md:block"
            >
              {t("auth.deconnexion")}
            </button>
          </div>
          </div>
        </header>
        <main className="app-content mx-auto w-full max-w-content flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8 md:pt-6">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
