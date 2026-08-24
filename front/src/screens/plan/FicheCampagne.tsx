import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { aCapacite, type Campagne } from "@achirah/shared";
import { Tabs } from "../../components/ui/Tabs.js";
import { EcranAConstruire } from "../../components/ui/EcranAConstruire.js";
import { useAuth } from "../../lib/auth-context.js";
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
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");
  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [onglet, setOnglet] = useState<OngletId>("strategie");

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
      <button type="button" onClick={() => navigate("/plan")} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>
      <h1 className="mb-4 font-display text-2xl text-off">{campagne.nom}</h1>
      <Tabs valeur={onglet} onChange={setOnglet} onglets={onglets} />

      {onglet === "strategie" && <OngletStrategie campagne={campagne} peutEditer={peutEditer} onChange={charger} />}
      {onglet === "budget" && <OngletBudget campagneId={campagne.id} />}
      {onglet === "taches" && <OngletTachesCampagne campagneId={campagne.id} />}
      {onglet === "equipe" && <OngletEquipe campagneId={campagne.id} />}
      {onglet === "contenus" && <OngletContenusCampagne campagneId={campagne.id} />}
      {onglet === "assets" && <OngletAssetsCampagne campagneId={campagne.id} />}
      {onglet === "agents" && <OngletAgentsCampagne campagneId={campagne.id} />}
      {onglet === "resultats" && <EcranAConstruire titre={t("campagnes.onglets.resultats")} />}
    </div>
  );
}
