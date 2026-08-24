import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { STATUT_AMBASSADEUR, aCapacite, type Ambassadeur, type Personne } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientAmbassadeurs, clientPersonnes } from "../../lib/resources/contacts.js";

/** E24 — Cercle : pipeline ambassadeurs par statut, objectif 30. */
export function Cercle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [ambassadeurs, setAmbassadeurs] = useState<Ambassadeur[] | null>(null);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [personneId, setPersonneId] = useState("");
  const [codePromo, setCodePromo] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = () => clientAmbassadeurs.lister().then(setAmbassadeurs);

  useEffect(() => {
    charger();
    clientPersonnes.lister({ actif: "1" }).then(setPersonnes);
  }, []);

  const personneParId = useMemo(() => new Map(personnes.map((p) => [p.id, p])), [personnes]);
  const personnesNonAmbassadeurs = useMemo(() => {
    const idsExistants = new Set((ambassadeurs ?? []).map((a) => a.personne_id));
    return personnes.filter((p) => !idsExistants.has(p.id));
  }, [personnes, ambassadeurs]);

  const nbActifs = (ambassadeurs ?? []).filter((a) => a.statut === "actif").length;

  async function creer() {
    setErreur(null);
    try {
      await clientAmbassadeurs.creer({ personne_id: personneId, code_promo: codePromo, statut: "contacte", pieces: [], posts: [], ventes_attribuees_dt: 0, notes: null });
      toaster(t("referentiels.cree"));
      setDialogueOuvert(false);
      setPersonneId("");
      setCodePromo("");
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    }
  }

  async function changerStatut(a: Ambassadeur, statut: (typeof STATUT_AMBASSADEUR)[number]) {
    try {
      await clientAmbassadeurs.modifier(a.personne_id, { statut });
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <button type="button" onClick={() => navigate("/people")} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl text-off">{t("cercle.titre")}</h1>
          <p className="text-sm text-dim">
            {t("cercle.objectif")} — {nbActifs}/30
          </p>
        </div>
        {peutEditer && (
          <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
            {t("cercle.ajouter")}
          </BoutonPrimaire>
        )}
      </div>

      {!ambassadeurs && <p className="text-sm text-dim">{t("commun.chargement")}</p>}

      {ambassadeurs && (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {STATUT_AMBASSADEUR.map((statut) => (
            <div key={statut} className="rounded-card border border-line bg-panel p-2">
              <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-dim">{t(`cercle.statuts.${statut}`)}</h2>
              <div className="flex flex-col gap-2">
                {ambassadeurs
                  .filter((a) => a.statut === statut)
                  .map((a) => {
                    const personne = personneParId.get(a.personne_id);
                    return (
                      <div key={a.personne_id} className="rounded-field border border-line bg-panel2 p-2">
                        <p className="text-sm text-off">{personne?.nom ?? a.personne_id}</p>
                        <p className="text-xs text-dim">{a.code_promo}</p>
                        {peutEditer && (
                          <ChampSelect
                            value={a.statut}
                            onChange={(e) => void changerStatut(a, e.target.value as (typeof STATUT_AMBASSADEUR)[number])}
                            className="mt-2 !min-h-0 !py-1 text-xs"
                          >
                            {STATUT_AMBASSADEUR.map((s) => (
                              <option key={s} value={s}>
                                {t(`cercle.statuts.${s}`)}
                              </option>
                            ))}
                          </ChampSelect>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("cercle.ajouter")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
        >
          <Champ label={t("contacts.champs.nom")}>
            <ChampSelect required value={personneId} onChange={(e) => setPersonneId(e.target.value)}>
              <option value="" disabled>
                {t("contacts.filtrer_categorie")}
              </option>
              {personnesNonAmbassadeurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("cercle.code_promo")}>
            <ChampTexte required value={codePromo} onChange={(e) => setCodePromo(e.target.value.toUpperCase())} />
          </Champ>
          {erreur && <p className="mb-3 text-sm text-danger-fg">{erreur}</p>}
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
