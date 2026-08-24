import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { aCapacite, type Commentaire, type EntiteCommentable } from "@achirah/shared";
import { ChampZoneTexte, BoutonSecondaire } from "../ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientCommentaires } from "../../lib/resources/collaboration.js";

/** §4.9 — Fil de commentaires polymorphe, réutilisable sur toute entité commentable (RG-CO1 : jamais supprimé). */
export function CommentairesPanel({ entiteType, entiteId }: { entiteType: EntiteCommentable; entiteId: string }) {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const [liste, setListe] = useState<Commentaire[] | null>(null);
  const [texte, setTexte] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const peutModererAutrui = !!utilisateur && aCapacite(utilisateur.role_systeme, "approbation.gerer");

  const charger = () => clientCommentaires.lister(entiteType, entiteId).then(setListe);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entiteType, entiteId]);

  async function envoyer() {
    if (!texte.trim()) return;
    setEnvoiEnCours(true);
    try {
      await clientCommentaires.creer(entiteType, entiteId, texte.trim());
      setTexte("");
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function resoudre(id: string, resolu: boolean) {
    try {
      const modifie = await clientCommentaires.resoudre(id, resolu);
      setListe((l) => l?.map((c) => (c.id === id ? modifie : c)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function retirer(id: string) {
    try {
      const modifie = await clientCommentaires.retirer(id);
      setListe((l) => l?.map((c) => (c.id === id ? modifie : c)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-off">{t("commentaires.titre")}</p>
      {!liste && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {liste && liste.length === 0 && <p className="text-sm text-dim">{t("commentaires.aucun")}</p>}
      <ul className="mb-3 flex flex-col gap-2">
        {liste?.map((c) => (
          <li key={c.id} className={`rounded-card border border-line bg-panel p-2 text-sm ${c.resolu ? "opacity-60" : ""}`}>
            <p className="whitespace-pre-wrap text-off" dir="auto">
              {c.retire ? <span className="italic text-dim">{t("commentaires.retire")}</span> : c.contenu}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-dim">{new Date(c.created_at).toLocaleString()}</span>
              {!c.retire && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => void resoudre(c.id, !c.resolu)} className="text-xs text-dim underline hover:text-off">
                    {c.resolu ? t("commentaires.rouvrir") : t("commentaires.resoudre")}
                  </button>
                  {(utilisateur?.id === c.auteur_id || peutModererAutrui) && (
                    <button type="button" onClick={() => void retirer(c.id)} className="text-xs text-dim underline hover:text-off">
                      {t("commentaires.retirer")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <ChampZoneTexte
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={t("commentaires.placeholder")}
          rows={2}
          className="flex-1"
        />
        <BoutonSecondaire type="button" onClick={() => void envoyer()} disabled={envoiEnCours || !texte.trim()} className="self-end">
          {t("commentaires.envoyer")}
        </BoutonSecondaire>
      </div>
    </div>
  );
}
