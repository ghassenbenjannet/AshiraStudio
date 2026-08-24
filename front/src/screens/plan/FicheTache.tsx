import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TYPE_TACHE, aCapacite, type Campagne, type Tache } from "@achirah/shared";
import { Champ, ChampTexte, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientTaches } from "../../lib/resources/taches.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { CallSheet } from "./CallSheet.js";
import { CommentairesPanel } from "../../components/collaboration/CommentairesPanel.js";
import { Bouton } from "../../components/ui/Bouton.js";
import { Icone } from "../../components/ui/Icone.js";
import { Dialog } from "../../components/ui/Dialog.js";

/** E05 — Fiche tâche (les shootings ouvrent en plus le call sheet — E06). */
export function FicheTache() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [tache, setTache] = useState<Tache | null>(null);
  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppressionOuverte, setSuppressionOuverte] = useState(false);
  const [suppression, setSuppression] = useState(false);

  const charger = () => {
    if (!id) return;
    clientTaches.obtenir(id).then((tacheChargee) => {
      setTache(tacheChargee);
      void clientCampagnes.obtenir(tacheChargee.campagne_id).then(setCampagne);
    });
  };
  useEffect(charger, [id]);

  if (!tache) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  function champ<K extends keyof Tache>(cle: K, valeur: Tache[K]) {
    setTache((t2) => (t2 ? { ...t2, [cle]: valeur } : t2));
  }

  async function enregistrer() {
    if (!tache) return;
    setEnregistrement(true);
    try {
      const modifiee = await clientTaches.modifier(tache.id, { titre: tache.titre, date_echeance: tache.date_echeance, lieu: tache.lieu, description: tache.description });
      setTache(modifiee);
      toaster(t("referentiels.modifie"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnregistrement(false);
    }
  }

  async function changerStatut(statut: Tache["statut"]) {
    if (!tache) return;
    try {
      const modifiee = await clientTaches.modifier(tache.id, { statut });
      setTache(modifiee);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function supprimer() {
    if (!tache) return;
    setSuppression(true);
    try {
      await clientTaches.supprimer(tache.id);
      toaster("Tâche supprimée");
      navigate(`/plan/campagnes/${tache.campagne_id}?onglet=taches`, { replace: true });
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
      setSuppression(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-dim">
        <button type="button" onClick={() => navigate("/plan")} className="min-h-tap hover:text-sable">{t("campagnes.titre")}</button>
        <span>›</span>
        <button type="button" onClick={() => navigate(`/plan/campagnes/${tache.campagne_id}?onglet=taches`)} className="min-h-tap font-semibold text-off hover:text-sable">{campagne?.nom ?? "Campagne"}</button>
        <span>›</span>
        <span className="truncate">{tache.titre}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-off">{tache.titre}</h1>
        <div className="flex gap-2">
          <a href={clientTaches.icsUrl(tache.id)} download className="min-h-tap flex items-center gap-2 rounded-field border border-line px-3 text-sm font-semibold text-off hover:border-sable hover:text-sable">
            <Icone nom="calendrier" taille={17} />
            {t("taches.ajouter_calendrier")}
          </a>
          {peutEditer &&
            (tache.statut === "fait" ? (
              <BoutonSecondaire type="button" icone="restaurer" onClick={() => void changerStatut("todo")}>
                {t("taches.reouvrir")}
              </BoutonSecondaire>
            ) : (
              <BoutonPrimaire type="button" icone="verifier" onClick={() => void changerStatut("fait")}>
                {t("taches.marquer_fait")}
              </BoutonPrimaire>
            ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
        className="mb-6"
      >
        <div className="mb-4 flex items-center gap-3 rounded-card border border-line bg-panel p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#FDEEE6] text-sable"><Icone nom="campagne" taille={19} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-dim">Campagne parente</p>
            <button type="button" onClick={() => navigate(`/plan/campagnes/${tache.campagne_id}?onglet=taches`)} className="text-sm font-semibold text-off hover:text-sable">{campagne?.nom ?? "Chargement…"}</button>
          </div>
        </div>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Champ label={t("taches.champs.titre")}>
            <ChampTexte disabled={!peutEditer} value={tache.titre} onChange={(e) => champ("titre", e.target.value)} />
          </Champ>
          <Champ label={t("taches.champs.type")}>
            <ChampSelect disabled value={tache.type}>
              {TYPE_TACHE.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`taches.types.${ty}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("taches.champs.date_echeance")}>
            <ChampTexte type="date" disabled={!peutEditer} value={tache.date_echeance} onChange={(e) => champ("date_echeance", e.target.value)} />
          </Champ>
          <Champ label={t("taches.champs.lieu")}>
            <ChampTexte disabled={!peutEditer} value={tache.lieu ?? ""} onChange={(e) => champ("lieu", e.target.value || null)} />
          </Champ>
        </div>
        <Champ label={t("taches.champs.description")}>
          <ChampZoneTexte disabled={!peutEditer} value={tache.description ?? ""} onChange={(e) => champ("description", e.target.value || null)} />
        </Champ>
        {peutEditer && (
          <div className="flex flex-wrap justify-between gap-2">
            <Bouton type="button" variante="danger" icone="supprimer" onClick={() => setSuppressionOuverte(true)}>
              Supprimer la tâche
            </Bouton>
            <BoutonSecondaire type="submit" icone="enregistrer" charge={enregistrement}>
              {t("commun.enregistrer")}
            </BoutonSecondaire>
          </div>
        )}
      </form>

      {tache.type === "shooting" && <CallSheet tacheId={tache.id} campagneId={tache.campagne_id} dateEcheance={tache.date_echeance} peutEditer={peutEditer} />}

      <div className="mt-6">
        <CommentairesPanel entiteType="tache" entiteId={tache.id} />
      </div>

      <Dialog ouvert={suppressionOuverte} onFermer={() => !suppression && setSuppressionOuverte(false)} titre="Supprimer la tâche ?">
        <p className="text-sm leading-relaxed text-dim">
          La tâche « {tache.titre} » sera supprimée de la campagne « {campagne?.nom ?? "Campagne"} ». Cette action est irréversible.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <BoutonSecondaire icone="fermer" disabled={suppression} onClick={() => setSuppressionOuverte(false)}>Annuler</BoutonSecondaire>
          <Bouton variante="danger" icone="supprimer" charge={suppression} onClick={() => void supprimer()}>Confirmer la suppression</Bouton>
        </div>
      </Dialog>
    </div>
  );
}
