import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TYPE_TACHE, aCapacite, type Tache } from "@achirah/shared";
import { Champ, ChampTexte, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientTaches } from "../../lib/resources/taches.js";
import { CallSheet } from "./CallSheet.js";
import { CommentairesPanel } from "../../components/collaboration/CommentairesPanel.js";

/** E05 — Fiche tâche (les shootings ouvrent en plus le call sheet — E06). */
export function FicheTache() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [tache, setTache] = useState<Tache | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const charger = () => {
    if (!id) return;
    clientTaches.obtenir(id).then(setTache);
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

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-off">{tache.titre}</h1>
        <div className="flex gap-2">
          <a href={clientTaches.icsUrl(tache.id)} download className="min-h-tap flex items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
            {t("taches.ajouter_calendrier")}
          </a>
          {peutEditer &&
            (tache.statut === "fait" ? (
              <BoutonSecondaire type="button" onClick={() => void changerStatut("todo")}>
                {t("taches.reouvrir")}
              </BoutonSecondaire>
            ) : (
              <BoutonPrimaire type="button" onClick={() => void changerStatut("fait")}>
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
          <div className="flex justify-end">
            <BoutonSecondaire type="submit" disabled={enregistrement}>
              {t("commun.enregistrer")}
            </BoutonSecondaire>
          </div>
        )}
      </form>

      {tache.type === "shooting" && <CallSheet tacheId={tache.id} campagneId={tache.campagne_id} peutEditer={peutEditer} />}

      <div className="mt-6">
        <CommentairesPanel entiteType="tache" entiteId={tache.id} />
      </div>
    </div>
  );
}
