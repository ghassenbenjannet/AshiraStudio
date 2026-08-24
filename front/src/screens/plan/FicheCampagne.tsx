import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { aCapacite, type Campagne } from "@achirah/shared";
import { Tabs } from "../../components/ui/Tabs.js";
import { EcranAConstruire } from "../../components/ui/EcranAConstruire.js";
import { useAuth } from "../../lib/auth-context.js";
import { useCampagneContexte } from "../../lib/campagne-contexte.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { OngletStrategie } from "./OngletStrategie.js";
import { OngletBudget } from "./OngletBudget.js";
import { OngletTachesCampagne } from "./OngletTachesCampagne.js";
import { OngletEquipe } from "./OngletEquipe.js";
import { OngletContenusCampagne } from "./OngletContenusCampagne.js";
import { OngletAssetsCampagne } from "./OngletAssetsCampagne.js";
import { OngletAgentsCampagne } from "./OngletAgentsCampagne.js";

type OngletId = "strategie" | "budget" | "taches" | "equipe" | "contenus" | "assets" | "agents" | "resultats";

/** E19 — Fiche campagne = hub à onglets (§4.3). Résultats arrive en Phase ⑥. */
export function FicheCampagne() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { campagneActiveId, definirCampagneActive } = useCampagneContexte();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");
  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [params, setParams] = useSearchParams();
  const ongletsValides: OngletId[] = ["strategie", "budget", "taches", "equipe", "contenus", "assets", "agents", "resultats"];
  const ongletParam = params.get("onglet") as OngletId | null;
  const onglet: OngletId = ongletParam && ongletsValides.includes(ongletParam) ? ongletParam : "strategie";

  function changerOnglet(suivant: OngletId) {
    const nouveauxParams = new URLSearchParams(params);
    nouveauxParams.set("onglet", suivant);
    setParams(nouveauxParams, { replace: true });
  }

  const charger = () => {
    if (!id) return;
    clientCampagnes.obtenir(id).then(setCampagne);
  };
  useEffect(charger, [id]);

  if (!campagne) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  const onglets: { id: OngletId; label: string }[] = [
    { id: "strategie", label: t("campagnes.onglets.strategie") },
    { id: "budget", label: t("campagnes.onglets.budget") },
    { id: "taches", label: t("campagnes.onglets.taches") },
    { id: "equipe", label: t("campagnes.onglets.equipe") },
    { id: "contenus", label: t("campagnes.onglets.contenus") },
    { id: "assets", label: t("campagnes.onglets.assets") },
    { id: "agents", label: t("campagnes.onglets.agents") },
    { id: "resultats", label: t("campagnes.onglets.resultats") },
  ];

  return (
    <div>
      <button type="button" onClick={() => navigate("/plan/campagnes")} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>
      <div className="mb-2 flex items-center gap-2 text-xs text-dim"><span>Campagnes</span><span>›</span><span className="font-semibold text-off">{campagne.nom}</span></div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-off">{campagne.nom}</h1>
        {campagneActiveId !== campagne.id && (
          <button
            type="button"
            onClick={() => definirCampagneActive(campagne.id)}
            className="min-h-tap rounded-field border border-sable/40 px-3 text-sm text-sable hover:bg-panel2"
          >
            {t("nav.contexte.definir_active")}
          </button>
        )}
      </div>
      <Tabs valeur={onglet} onChange={changerOnglet} onglets={onglets} />

      {onglet === "strategie" && <OngletStrategie campagne={campagne} peutEditer={peutEditer} onChange={charger} />}
      {onglet === "budget" && <OngletBudget campagneId={campagne.id} />}
      {onglet === "taches" && <OngletTachesCampagne campagneId={campagne.id} campagneNom={campagne.nom} />}
      {onglet === "equipe" && <OngletEquipe campagneId={campagne.id} />}
      {onglet === "contenus" && <OngletContenusCampagne campagneId={campagne.id} />}
      {onglet === "assets" && <OngletAssetsCampagne campagneId={campagne.id} />}
      {onglet === "agents" && <OngletAgentsCampagne campagneId={campagne.id} />}
      {onglet === "resultats" && <EcranAConstruire titre={t("campagnes.onglets.resultats")} />}
    </div>
  );
}
