import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { aCapacite, campagneResultatsManquants, tacheEnRetard, type Campagne, type Tache, type Contenu, type ProchaineEtape as ProchaineEtapeData } from "@achirah/shared";
import { Tabs } from "../../components/ui/Tabs.js";
import { ProchaineEtape } from "../../components/ui/ProchaineEtape.js";
import type { EtatCompletude } from "../../components/ui/EtatCompletude.js";
import { useAuth } from "../../lib/auth-context.js";
import { useCampagneContexte } from "../../lib/campagne-contexte.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { clientTaches } from "../../lib/resources/taches.js";
import { clientContenus } from "../../lib/resources/contenus.js";
import { OngletStrategie } from "./OngletStrategie.js";
import { OngletBudget } from "./OngletBudget.js";
import { OngletTachesCampagne } from "./OngletTachesCampagne.js";
import { OngletEquipe } from "./OngletEquipe.js";
import { OngletContenusCampagne } from "./OngletContenusCampagne.js";
import { OngletAssetsCampagne } from "./OngletAssetsCampagne.js";
import { OngletAgentsCampagne } from "./OngletAgentsCampagne.js";
import { OngletResultats } from "./OngletResultats.js";

type OngletId = "strategie" | "budget" | "taches" | "equipe" | "contenus" | "assets" | "agents" | "resultats";

/** CR-02 §C.4 — ordre des onglets selon le statut : ce qui compte en premier change avec le cycle
 *  de vie de la campagne (RG-PAR1 : rien n'est masqué, seul l'ordre change). */
function ordreOnglets(statut: Campagne["statut"]): OngletId[] {
  if (statut === "active") return ["taches", "contenus", "budget", "assets", "strategie", "equipe", "agents", "resultats"];
  if (statut === "livree" || statut === "fermee") return ["resultats", "contenus", "taches", "budget", "strategie", "equipe", "assets", "agents"];
  return ["strategie", "budget", "taches", "equipe", "contenus", "assets", "agents", "resultats"];
}

const AUJOURDHUI = () => new Date().toISOString().slice(0, 10);

/** E19 — Fiche campagne = hub à onglets (§4.3). Pastilles + réordonnancement : CR-02 §C.3/§C.4. */
export function FicheCampagne() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { campagneActiveId, definirCampagneActive } = useCampagneContexte();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");
  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [tachesCampagne, setTachesCampagne] = useState<Tache[]>([]);
  const [contenusCampagne, setContenusCampagne] = useState<Contenu[]>([]);
  const [prochaineEtape, setProchaineEtape] = useState<ProchaineEtapeData | null>(null);
  const [params, setParams] = useSearchParams();

  const charger = () => {
    if (!id) return;
    clientCampagnes.obtenir(id).then(setCampagne);
    clientTaches.lister({ campagne_id: id }).then(setTachesCampagne);
    clientContenus.lister({ campagne_id: id }).then(setContenusCampagne);
    clientCampagnes.prochaineEtape(id).then(setProchaineEtape);
  };
  useEffect(charger, [id]);

  if (!campagne) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  const etatStrategie: EtatCompletude = (() => {
    const aDescription = !!campagne.description;
    const aCibles = Object.keys(campagne.kpi_cibles).length > 0;
    if (aDescription && aCibles) return "complet";
    if (!aDescription && !aCibles) return "vide";
    return "en_cours";
  })();
  const etatTaches: EtatCompletude = (() => {
    if (tachesCampagne.length === 0) return "vide";
    if (tachesCampagne.some((tc) => tacheEnRetard(tc, AUJOURDHUI()))) return "manquant";
    return tachesCampagne.every((tc) => tc.statut === "fait") ? "complet" : "en_cours";
  })();
  const etatContenus: EtatCompletude = (() => {
    if (contenusCampagne.length === 0) return "vide";
    return contenusCampagne.some((ct) => ct.statut === "brouillon" || ct.statut === "en_revue") ? "en_cours" : "complet";
  })();
  const etatResultats: EtatCompletude = (() => {
    if (Object.keys(campagne.kpi_cibles).length === 0) return "vide";
    if (campagne.statut !== "livree" && campagne.statut !== "fermee") return "vide";
    return campagneResultatsManquants(campagne).length > 0 ? "manquant" : "complet";
  })();
  const etatParOnglet: Partial<Record<OngletId, EtatCompletude>> = {
    strategie: etatStrategie,
    taches: etatTaches,
    contenus: etatContenus,
    resultats: etatResultats,
  };

  const ordre = ordreOnglets(campagne.statut);
  const onglets: { id: OngletId; label: string; etat?: EtatCompletude }[] = ordre.map((idOnglet) => ({
    id: idOnglet,
    label: t(`campagnes.onglets.${idOnglet}`),
    etat: etatParOnglet[idOnglet],
  }));

  const ongletParam = params.get("onglet") as OngletId | null;
  const ongletParDefaut = ordre.find((idOnglet) => etatParOnglet[idOnglet] && etatParOnglet[idOnglet] !== "complet") ?? ordre[0]!;
  const onglet: OngletId = ongletParam && ordre.includes(ongletParam) ? ongletParam : ongletParDefaut;

  function changerOnglet(suivant: OngletId) {
    const nouveauxParams = new URLSearchParams(params);
    nouveauxParams.set("onglet", suivant);
    setParams(nouveauxParams, { replace: true });
  }

  const ONGLET_PAR_ACTION: Record<string, OngletId> = {
    generer_rituel: "strategie",
    activer: "strategie",
    voir_retards: "taches",
    saisir_resultats: "resultats",
    fermer: "strategie",
  };

  const bandeau = (() => {
    if (!prochaineEtape) return null;
    const statutsConnus = ["preparation", "active_resume", "livree_depuis", "livree_prete"];
    const etat = statutsConnus.includes(prochaineEtape.etatCle)
      ? t(`campagnes.prochaine_etape.etat.${prochaineEtape.etatCle}`, prochaineEtape.etatParams)
      : t(`campagnes.statuts.${prochaineEtape.etatCle}`);
    const manque = prochaineEtape.manqueCle ? t(`campagnes.prochaine_etape.manque.${prochaineEtape.manqueCle}`, prochaineEtape.manqueParams) : null;
    const action =
      prochaineEtape.actionCle && ONGLET_PAR_ACTION[prochaineEtape.actionCle]
        ? { label: t(`campagnes.prochaine_etape.action.${prochaineEtape.actionCle}`), onClick: () => changerOnglet(ONGLET_PAR_ACTION[prochaineEtape.actionCle!]!) }
        : null;
    return <ProchaineEtape etat={etat} manque={manque} action={action} />;
  })();

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

      {bandeau}

      <Tabs valeur={onglet} onChange={changerOnglet} onglets={onglets} />

      {onglet === "strategie" && <OngletStrategie campagne={campagne} peutEditer={peutEditer} onChange={charger} />}
      {onglet === "budget" && <OngletBudget campagneId={campagne.id} />}
      {onglet === "taches" && <OngletTachesCampagne campagneId={campagne.id} campagneNom={campagne.nom} />}
      {onglet === "equipe" && <OngletEquipe campagneId={campagne.id} />}
      {onglet === "contenus" && <OngletContenusCampagne campagneId={campagne.id} />}
      {onglet === "assets" && <OngletAssetsCampagne campagneId={campagne.id} />}
      {onglet === "agents" && <OngletAgentsCampagne campagneId={campagne.id} />}
      {onglet === "resultats" && <OngletResultats campagne={campagne} peutEditer={peutEditer} onChange={charger} />}
    </div>
  );
}
