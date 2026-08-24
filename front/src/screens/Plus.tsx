import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context.js";

/** Onglet mobile "Plus" : accès aux espaces qui n'ont pas de raccourci direct dans la barre basse. */
export function Plus() {
  const { t } = useTranslation();
  const { utilisateur, deconnecter } = useAuth();

  const liens = [
    { chemin: "/grow", labelKey: "nav.espaces.grow" },
    { chemin: "/measure", labelKey: "nav.espaces.measure" },
    { chemin: "/people", labelKey: "nav.espaces.people" },
    { chemin: "/parametres", labelKey: "nav.espaces.parametres" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {utilisateur && <p className="mb-2 text-sm text-dim">{utilisateur.nom}</p>}
      {liens.map((lien) => (
        <NavLink
          key={lien.chemin}
          to={lien.chemin}
          className="min-h-tap rounded-card border border-line bg-panel px-4 py-3 text-off hover:border-sable"
        >
          {t(lien.labelKey)}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={() => void deconnecter()}
        className="min-h-tap rounded-card border border-line px-4 py-3 text-start text-dim hover:text-off"
      >
        {t("auth.deconnexion")}
      </button>
    </div>
  );
}
