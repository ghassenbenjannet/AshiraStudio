import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { STATUT_IDEE, aCapacite, type Idee, type Tache } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { MarkdownLeger } from "../../components/ui/MarkdownLeger.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientIdees } from "../../lib/resources/idees.js";
import { clientTaches } from "../../lib/resources/taches.js";

const BADGE_STATUT: Record<string, string> = { nouvelle: "text-sable", utilisee: "text-olive", ecartee: "text-dim" };

export function IdeesListe() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [idees, setIdees] = useState<Idee[] | null>(null);
  const [statut, setStatut] = useState("");
  const [q, setQ] = useState("");
  const [taches, setTaches] = useState<Tache[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState({ contenu: "", tache_id: "" });

  const charger = () => clientIdees.lister({ statut: statut || undefined, q: q || undefined }).then(setIdees);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut, q]);
  useEffect(() => {
    clientTaches.lister({}).then(setTaches);
  }, []);

  async function creer() {
    try {
      await clientIdees.creer({ contenu: form.contenu, source: "manuel", tache_id: form.tache_id || null });
      setDialogueOuvert(false);
      setForm({ contenu: "", tache_id: "" });
      charger();
      toaster(t("referentiels.cree"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function changerStatut(id: string, nouveauStatut: Idee["statut"]) {
    try {
      const modifiee = await clientIdees.modifier(id, { statut: nouveauStatut });
      setIdees((liste) => liste?.map((i) => (i.id === id ? modifiee : i)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  function copier(texte: string) {
    navigator.clipboard?.writeText(texte).then(() => toaster(t("idees.copiee")));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-44">
          <ChampSelect value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">{t("idees.tous_statuts")}</option>
            {STATUT_IDEE.map((s) => (
              <option key={s} value={s}>
                {t(`idees.statuts.${s}`)}
              </option>
            ))}
          </ChampSelect>
        </div>
        <div className="w-56">
          <ChampTexte placeholder={t("commun.rechercher")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex-1" />
        {peutEditer && (
          <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
            {t("idees.nouvelle")}
          </BoutonPrimaire>
        )}
      </div>

      {!idees && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {idees && idees.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-2">
        {idees?.map((idee) => (
          <li key={idee.id} className="rounded-card border border-line bg-panel p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${BADGE_STATUT[idee.statut]}`}>{t(`idees.statuts.${idee.statut}`)}</span>
              <span className="text-xs text-dim">{t(`idees.sources.${idee.source}`)}</span>
            </div>
            <p className="mb-2 text-sm text-off">
              <MarkdownLeger texte={idee.contenu} />
            </p>
            <div className="flex flex-wrap gap-2">
              <BoutonSecondaire type="button" onClick={() => copier(idee.contenu)}>
                {t("idees.copier")}
              </BoutonSecondaire>
              {peutEditer && idee.statut !== "utilisee" && (
                <BoutonSecondaire type="button" onClick={() => void changerStatut(idee.id, "utilisee")}>
                  {t("idees.marquer_utilisee")}
                </BoutonSecondaire>
              )}
              {peutEditer && idee.statut !== "ecartee" && (
                <BoutonSecondaire type="button" onClick={() => void changerStatut(idee.id, "ecartee")}>
                  {t("idees.ecarter")}
                </BoutonSecondaire>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("idees.nouvelle")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
        >
          <Champ label={t("idees.champs.contenu")}>
            <ChampZoneTexte required rows={5} value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} />
          </Champ>
          <Champ label={t("idees.champs.tache_liee")}>
            <ChampSelect value={form.tache_id} onChange={(e) => setForm((f) => ({ ...f, tache_id: e.target.value }))}>
              <option value="">—</option>
              {taches.map((ta) => (
                <option key={ta.id} value={ta.id}>
                  {ta.titre}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueOuvert(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
