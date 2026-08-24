import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { aCapacite, type Article, type Gamme, type ProchaineEtape as ProchaineEtapeData } from "@achirah/shared";
import { Tabs } from "../../components/ui/Tabs.js";
import { ProchaineEtape } from "../../components/ui/ProchaineEtape.js";
import type { EtatCompletude } from "../../components/ui/EtatCompletude.js";
import { useAuth } from "../../lib/auth-context.js";
import { clientArticles } from "../../lib/resources/catalogue.js";
import { clientGammes } from "../../lib/resources/referentiels.js";
import { OngletModele } from "./OngletModele.js";
import { OngletColoris } from "./OngletColoris.js";
import { OngletSkuMesures } from "./OngletSkuMesures.js";
import { OngletCouts } from "./OngletCouts.js";
import { OngletHistorique } from "./OngletHistorique.js";

type OngletId = "modele" | "coloris" | "sku" | "couts" | "historique";

const PASTILLE: Record<string, string> = {
  idee: "bg-dim",
  croquis: "bg-dim",
  prototype: "bg-sable",
  fit_valide: "bg-sable",
  production: "bg-sable",
  stock: "bg-olive",
  epuise: "bg-danger-fg",
  archive: "bg-dim",
};

/** E08 — Fiche article : onglets Modèle / Coloris / SKU & Mesures / Coûts / Historique. */
export function FicheArticle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");
  const estAdmin = !!utilisateur && aCapacite(utilisateur.role_systeme, "parametres.gerer");

  const [article, setArticle] = useState<Article | null>(null);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [prochaineEtape, setProchaineEtape] = useState<ProchaineEtapeData | null>(null);
  const [ongletChoisi, setOngletChoisi] = useState<OngletId | null>(null);

  const charger = () => {
    if (!id) return;
    clientArticles.obtenir(id).then(setArticle);
    clientArticles.prochaineEtape(id).then(setProchaineEtape);
  };

  useEffect(() => {
    charger();
    clientGammes.lister().then(setGammes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!article) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  // CR-02 §C — bandeau + pastille du SKU : seul l'état `prototype` porte un manque précis côté
  // serveur (`prochaineEtapeArticle`, mêmes fonctions que la gate `fit_valide`). Les autres statuts
  // affichent un bandeau neutre qui réutilise les libellés `catalogue.statuts.*` déjà traduits.
  const etatSku: EtatCompletude | undefined =
    article.statut_cycle === "prototype" ? (prochaineEtape?.manqueCle === "mesures_manquantes" ? "manquant" : "complet") : undefined;

  const gamme = gammes.find((g) => g.id === article.gamme_id);
  const onglets: { id: OngletId; label: string; etat?: EtatCompletude }[] = [
    { id: "modele", label: t("catalogue.onglets.modele") },
    { id: "coloris", label: t("catalogue.onglets.coloris") },
    { id: "sku", label: t("catalogue.onglets.sku"), etat: etatSku },
    ...(estAdmin ? [{ id: "couts" as const, label: t("catalogue.onglets.couts") }] : []),
    { id: "historique", label: t("catalogue.onglets.historique") },
  ];

  const ongletParDefaut: OngletId = etatSku === "manquant" ? "sku" : "modele";
  const onglet: OngletId = ongletChoisi ?? ongletParDefaut;

  const bandeau = (() => {
    if (!prochaineEtape) return null;
    const etat = t(`catalogue.statuts.${prochaineEtape.etatCle}`);
    const manque = prochaineEtape.manqueCle ? t(`catalogue.prochaine_etape.manque.${prochaineEtape.manqueCle}`, prochaineEtape.manqueParams) : null;
    const action =
      prochaineEtape.actionCle === "saisir_mesures" ? { label: t("catalogue.prochaine_etape.action.saisir_mesures"), onClick: () => setOngletChoisi("sku") } : null;
    return <ProchaineEtape etat={etat} manque={manque} action={action} />;
  })();

  return (
    <div>
      <button type="button" onClick={() => navigate("/catalogue")} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl text-off">
          {article.reference} — {article.nom}
        </h1>
        <span className="flex items-center gap-2 rounded-field border border-line px-2 py-1 text-xs text-dim">
          <span className={`h-2 w-2 rounded-full ${PASTILLE[article.statut_cycle]}`} />
          {t(`catalogue.statuts.${article.statut_cycle}`)}
        </span>
        {gamme && <span className="text-xs text-dim">{gamme.nom}</span>}
      </div>

      {bandeau}

      <Tabs valeur={onglet} onChange={setOngletChoisi} onglets={onglets} />

      {onglet === "modele" && <OngletModele article={article} gammes={gammes} peutEditer={peutEditer} onChange={charger} />}
      {onglet === "coloris" && <OngletColoris articleId={article.id} peutEditer={peutEditer} />}
      {onglet === "sku" && <OngletSkuMesures articleId={article.id} peutEditer={peutEditer} />}
      {onglet === "couts" && estAdmin && <OngletCouts article={article} />}
      {onglet === "historique" && <OngletHistorique articleId={article.id} />}
    </div>
  );
}
