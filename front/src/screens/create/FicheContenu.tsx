import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { aCapacite, type Contenu, type ContenuVersion, type Asset, type ListeSimple, type Registre } from "@achirah/shared";
import { Champ, ChampTexte, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { ProchaineEtape } from "../../components/ui/ProchaineEtape.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientContenus } from "../../lib/resources/contenus.js";
import { clientAssets } from "../../lib/resources/assets.js";
import { clientPlateformesContenu, clientRegistres } from "../../lib/resources/referentiels.js";
import { CommentairesPanel } from "../../components/collaboration/CommentairesPanel.js";

export function FicheContenu() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");
  const peutApprouver = !!utilisateur && aCapacite(utilisateur.role_systeme, "approbation.gerer");

  const [contenu, setContenu] = useState<Contenu | null>(null);
  const [versions, setVersions] = useState<ContenuVersion[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsDisponibles, setAssetsDisponibles] = useState<Asset[]>([]);
  const [plateformes, setPlateformes] = useState<ListeSimple[]>([]);
  const [registres, setRegistres] = useState<Registre[]>([]);
  const [datePlanif, setDatePlanif] = useState("");
  const [notationEnCours, setNotationEnCours] = useState(false);
  const [erreurGate, setErreurGate] = useState<string | null>(null);

  const charger = () => {
    if (!id) return;
    clientContenus.obtenir(id).then((ct) => {
      setContenu(ct);
      clientAssets.parIds(ct.asset_ids).then(setAssets);
    });
    clientContenus.versions(id).then(setVersions);
  };
  useEffect(charger, [id]);
  useEffect(() => {
    clientPlateformesContenu.lister().then(setPlateformes);
    clientRegistres.lister().then(setRegistres);
    clientAssets.lister().then(setAssetsDisponibles);
  }, []);

  if (!contenu) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  function champ<K extends keyof Contenu>(cle: K, valeur: Contenu[K]) {
    setContenu((c) => (c ? { ...c, [cle]: valeur } : c));
  }

  async function renoter() {
    if (!contenu) return;
    setNotationEnCours(true);
    setErreurGate(null);
    try {
      const { score_marque, score_detail } = await clientContenus.noterGate(contenu.id);
      setContenu((c) => (c ? { ...c, score_marque, score_detail } : c));
    } catch (err) {
      setErreurGate(err instanceof ApiError && err.status === 503 ? t("studio.ia_indisponible") : err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setNotationEnCours(false);
    }
  }

  async function enregistrer() {
    if (!contenu) return;
    try {
      const modifie = await clientContenus.modifier(contenu.id, {
        titre: contenu.titre,
        caption: contenu.caption,
        registre_id: contenu.registre_id,
        plateformes: contenu.plateformes,
      });
      setContenu(modifie);
      clientContenus.versions(modifie.id).then(setVersions);
      toaster(t("referentiels.modifie"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function action(fn: () => Promise<Contenu>) {
    try {
      setContenu(await fn());
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function dupliquer() {
    if (!contenu) return;
    try {
      const copie = await clientContenus.dupliquer(contenu.id);
      toaster(t("contenus.dupliquee"));
      navigate(`/create/contenus/${copie.id}`);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function restaurer(versionId: string) {
    if (!contenu) return;
    try {
      const modifie = await clientContenus.restaurerVersion(contenu.id, versionId);
      setContenu(modifie);
      toaster(t("contenus.version_restauree"));
      clientContenus.versions(contenu.id).then(setVersions);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function attacherAsset(assetId: string) {
    if (!contenu || !assetId) return;
    const nouveaux = [...new Set([...contenu.asset_ids, assetId])];
    const modifie = await clientContenus.modifier(contenu.id, { asset_ids: nouveaux });
    setContenu(modifie);
    clientAssets.parIds(modifie.asset_ids).then(setAssets);
  }

  async function detacherAsset(assetId: string) {
    if (!contenu) return;
    const nouveaux = contenu.asset_ids.filter((a) => a !== assetId);
    const modifie = await clientContenus.modifier(contenu.id, { asset_ids: nouveaux });
    setContenu(modifie);
    clientAssets.parIds(modifie.asset_ids).then(setAssets);
  }

  function togglePlateforme(pid: string) {
    if (!contenu) return;
    const nouveau = contenu.plateformes.includes(pid) ? contenu.plateformes.filter((p) => p !== pid) : [...contenu.plateformes, pid];
    champ("plateformes", nouveau);
  }

  // CR-02 §C — bandeau « Prochaine étape » : ne réévalue rien de nouveau, reprend directement les
  // gates déjà appliquées côté serveur — `soumettreContenu` (légende ou asset requis) et RG-AS1
  // (droits UGC manquants, déjà signalés asset par asset plus bas) — à partir des données déjà
  // chargées par cet écran.
  const bandeau = (() => {
    const etat = t(`contenus.statuts.${contenu.statut}`);
    if (contenu.statut === "brouillon" && !contenu.caption.trim() && contenu.asset_ids.length === 0) {
      return <ProchaineEtape etat={etat} manque={t("contenus.prochaine_etape.manque.caption_ou_asset")} />;
    }
    if (contenu.statut === "en_revue") {
      const bloquants = assets.filter((a) => a.source === "ugc" && !a.droits);
      if (bloquants.length > 0) {
        return <ProchaineEtape etat={etat} manque={t("contenus.prochaine_etape.manque.droits_ugc", { count: bloquants.length })} />;
      }
    }
    return <ProchaineEtape etat={etat} />;
  })();

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-off">{contenu.titre}</h1>
        <span className="text-sm font-medium text-sable">{t(`contenus.statuts.${contenu.statut}`)}</span>
      </div>

      {bandeau}

      <div className="mb-4 flex flex-wrap gap-2">
        {peutEditer && contenu.statut === "brouillon" && (
          <BoutonPrimaire type="button" onClick={() => void action(() => clientContenus.soumettre(contenu.id))}>
            {t("contenus.soumettre")}
          </BoutonPrimaire>
        )}
        {peutApprouver && contenu.statut === "en_revue" && (
          <BoutonPrimaire type="button" onClick={() => void action(() => clientContenus.approuver(contenu.id))}>
            {t("contenus.approuver")}
          </BoutonPrimaire>
        )}
        {peutEditer && contenu.statut === "approuve" && (
          <div className="flex items-center gap-2">
            <ChampTexte type="datetime-local" value={datePlanif} onChange={(e) => setDatePlanif(e.target.value)} />
            <BoutonPrimaire
              type="button"
              disabled={!datePlanif}
              onClick={() => void action(() => clientContenus.planifier(contenu.id, new Date(datePlanif).toISOString()))}
            >
              {t("contenus.planifier")}
            </BoutonPrimaire>
          </div>
        )}
        {peutEditer && contenu.statut === "planifie" && (
          <BoutonPrimaire type="button" onClick={() => void action(() => clientContenus.publier(contenu.id))}>
            {t("contenus.publier")}
          </BoutonPrimaire>
        )}
        {peutEditer && ["approuve", "planifie", "publie"].includes(contenu.statut) && (
          <BoutonSecondaire type="button" onClick={() => void action(() => clientContenus.archiver(contenu.id))}>
            {t("contenus.archiver")}
          </BoutonSecondaire>
        )}
        {peutEditer && (
          <BoutonSecondaire type="button" onClick={() => void dupliquer()}>
            {t("contenus.dupliquer")}
          </BoutonSecondaire>
        )}
      </div>

      {contenu.date_publication && (
        <p className="mb-4 text-sm text-dim">
          {t("contenus.champs.date_publication")}: {new Date(contenu.date_publication).toLocaleString()}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
        className="mb-6"
      >
        <Champ label={t("contenus.champs.titre")}>
          <ChampTexte disabled={!peutEditer} value={contenu.titre} onChange={(e) => champ("titre", e.target.value)} />
        </Champ>
        <Champ label={t("contenus.champs.caption")}>
          <ChampZoneTexte disabled={!peutEditer} value={contenu.caption} onChange={(e) => champ("caption", e.target.value)} rows={5} />
        </Champ>
        <Champ label={t("contenus.champs.registre")}>
          <ChampSelect disabled={!peutEditer} value={contenu.registre_id ?? ""} onChange={(e) => champ("registre_id", e.target.value || null)}>
            <option value="">—</option>
            {registres.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </ChampSelect>
        </Champ>
        <Champ label={t("contenus.champs.plateformes")}>
          <div className="flex flex-wrap gap-2">
            {plateformes.map((p) => (
              <label key={p.id} className="flex items-center gap-1 rounded-field border border-line px-2 py-1 text-sm text-off">
                <input type="checkbox" disabled={!peutEditer} checked={contenu.plateformes.includes(p.id)} onChange={() => togglePlateforme(p.id)} />
                {p.nom}
              </label>
            ))}
          </div>
        </Champ>
        {peutEditer && (
          <div className="flex justify-end">
            <BoutonSecondaire type="submit">{t("commun.enregistrer")}</BoutonSecondaire>
          </div>
        )}
      </form>

      <section className="mb-6 rounded-card border border-line bg-panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg text-off">{t("contenus.gate.titre")}</h2>
          {peutEditer && (
            <BoutonSecondaire type="button" onClick={() => void renoter()} disabled={notationEnCours}>
              {contenu.score_marque === null ? t("contenus.gate.noter") : t("contenus.gate.renoter")}
            </BoutonSecondaire>
          )}
        </div>
        {erreurGate && <p className="text-sm text-danger-fg">{erreurGate}</p>}
        {contenu.score_marque === null && !erreurGate && <p className="text-sm text-dim">{t("contenus.gate.non_note")}</p>}
        {contenu.score_marque !== null && (
          <div>
            <p className="mb-2 text-2xl font-display text-off">{contenu.score_marque}/10</p>
            <div className="flex flex-col gap-2">
              {(contenu.score_detail ?? []).map((d) => (
                <div key={d.dimension} className="rounded-field border border-line px-3 py-2 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-off">{t(`contenus.gate.dimensions.${d.dimension}`)}</span>
                    <span className={d.score === 2 ? "text-olive" : d.score === 1 ? "text-sable" : "text-danger-fg"}>{d.score}/2</span>
                  </div>
                  <p className="text-dim">{d.raison}</p>
                  {d.correction && <p className="mt-1 text-off">{t("contenus.gate.correction")} : {d.correction}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-card border border-line bg-panel p-4">
        <h2 className="mb-2 font-display text-lg text-off">{t("contenus.assets_lies")}</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {assets.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
          {assets.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-field border border-line px-2 py-1 text-sm text-off">
              {a.nom}
              {a.source === "ugc" && !a.droits && <span className="text-xs text-danger-fg">⚠ {t("contenus.droits_manquants")}</span>}
              {peutEditer && (
                <button type="button" onClick={() => void detacherAsset(a.id)} className="text-dim hover:text-off">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {peutEditer && (
          <ChampSelect value="" onChange={(e) => void attacherAsset(e.target.value)}>
            <option value="">{t("contenus.ajouter_asset")}</option>
            {assetsDisponibles
              .filter((a) => !contenu.asset_ids.includes(a.id))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom} ({t(`assets.types.${a.type}`)})
                </option>
              ))}
          </ChampSelect>
        )}
      </section>

      <section className="rounded-card border border-line bg-panel p-4">
        <h2 className="mb-2 font-display text-lg text-off">{t("contenus.versions")}</h2>
        {versions.length === 0 && <p className="text-sm text-dim">{t("contenus.aucune_version")}</p>}
        <ul className="flex flex-col gap-2">
          {versions.map((v) => (
            <li key={v.id} className="flex items-start justify-between gap-2 rounded-field border border-line px-3 py-2 text-sm">
              <div>
                <p className="text-off">{v.caption}</p>
                <p className="text-xs text-dim">{new Date(v.at).toLocaleString()}</p>
              </div>
              {peutEditer && (
                <BoutonSecondaire type="button" onClick={() => void restaurer(v.id)}>
                  {t("contenus.restaurer")}
                </BoutonSecondaire>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-line bg-panel p-4">
        <CommentairesPanel entiteType="contenu" entiteId={contenu.id} />
      </section>
    </div>
  );
}
