import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORIE_TENDANCE, type Tendance } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientTendances, type TendanceProposee } from "../../lib/resources/grow.js";

const COULEUR_STATUT: Record<string, string> = { a_evaluer: "text-sable", adoptee: "text-olive", ecartee: "text-dim" };

export function TendancesListe() {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [liste, setListe] = useState<Tendance[] | null>(null);
  const [dialogueRecherche, setDialogueRecherche] = useState(false);
  const [categorie, setCategorie] = useState<(typeof CATEGORIE_TENDANCE)[number]>("mode");
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState<string | null>(null);
  const [propositions, setPropositions] = useState<TendanceProposee[] | null>(null);
  const [adaptationEnCours, setAdaptationEnCours] = useState<string | null>(null);

  const charger = () => clientTendances.lister().then(setListe);
  useEffect(() => {
    charger();
  }, []);

  async function rechercher() {
    setRechercheEnCours(true);
    setErreurRecherche(null);
    setPropositions(null);
    try {
      const resultat = await clientTendances.rechercher(categorie);
      setPropositions(resultat);
    } catch (err) {
      setErreurRecherche(err instanceof ApiError && err.status === 503 ? t("studio.ia_indisponible") : err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setRechercheEnCours(false);
    }
  }

  async function sauvegarderProposition(p: TendanceProposee) {
    try {
      await clientTendances.creer({
        source: "studio_recherche",
        categorie,
        titre: p.titre,
        description: p.description,
        lien: p.lien ?? null,
        source_verifiee: p.source_verifiee,
        scores: { tunisia_fit: p.tunisia_fit, achirah_fit: p.achirah_fit, audience_fit: p.audience_fit, maturite: p.maturite },
      });
      toaster(t("referentiels.cree"));
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function adapter(id: string) {
    setAdaptationEnCours(id);
    try {
      const modifiee = await clientTendances.adapter(id);
      setListe((l) => l?.map((x) => (x.id === id ? modifiee : x)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError && err.status === 503 ? t("studio.ia_indisponible") : err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setAdaptationEnCours(null);
    }
  }

  async function changerStatut(id: string, statut: Tendance["statut"]) {
    try {
      const modifiee = await clientTendances.modifier(id, { statut });
      setListe((l) => l?.map((x) => (x.id === id ? modifiee : x)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <BoutonPrimaire type="button" onClick={() => setDialogueRecherche(true)}>
          {t("grow.tendances.rechercher")}
        </BoutonPrimaire>
      </div>
      {!liste && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {liste && liste.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-2">
        {liste?.map((tendance) => (
          <li key={tendance.id} className="rounded-card border border-line bg-panel p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-off">
                {tendance.titre}
                {!tendance.source_verifiee && <span className="ms-2 text-xs text-danger-fg">{t("grow.tendances.non_verifiee")}</span>}
              </span>
              <span className={`text-xs font-medium ${COULEUR_STATUT[tendance.statut]}`}>{t(`grow.tendances.statuts.${tendance.statut}`)}</span>
            </div>
            <p className="mb-2 text-sm text-dim">{tendance.description}</p>
            <p className="mb-2 text-xs text-dim">
              Tunisie {tendance.scores.tunisia_fit}/10 · Achirah {tendance.scores.achirah_fit}/10 · Audience {tendance.scores.audience_fit}/10 · {t(`grow.tendances.maturites.${tendance.scores.maturite}`)}
            </p>
            {tendance.adaptation && <p className="mb-2 whitespace-pre-wrap rounded-field border border-line bg-panel2 p-2 text-xs text-off">{tendance.adaptation}</p>}
            <div className="flex flex-wrap gap-2">
              <BoutonSecondaire type="button" onClick={() => void adapter(tendance.id)} disabled={adaptationEnCours === tendance.id}>
                {t("grow.tendances.adapter")}
              </BoutonSecondaire>
              {tendance.statut === "a_evaluer" && (
                <>
                  <BoutonSecondaire type="button" onClick={() => void changerStatut(tendance.id, "adoptee")}>
                    {t("grow.tendances.adopter")}
                  </BoutonSecondaire>
                  <BoutonSecondaire type="button" onClick={() => void changerStatut(tendance.id, "ecartee")}>
                    {t("grow.tendances.ecarter")}
                  </BoutonSecondaire>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueRecherche} onFermer={() => setDialogueRecherche(false)} titre={t("grow.tendances.rechercher")}>
        <Champ label={t("grow.tendances.champs.categorie")}>
          <ChampSelect value={categorie} onChange={(e) => setCategorie(e.target.value as typeof categorie)}>
            {CATEGORIE_TENDANCE.map((c) => (
              <option key={c} value={c}>
                {t(`grow.tendances.categories.${c}`)}
              </option>
            ))}
          </ChampSelect>
        </Champ>
        <div className="mb-3 flex justify-end">
          <BoutonPrimaire type="button" onClick={() => void rechercher()} disabled={rechercheEnCours}>
            {t("grow.tendances.rechercher")}
          </BoutonPrimaire>
        </div>
        {erreurRecherche && <p className="mb-3 text-sm text-danger-fg">{erreurRecherche}</p>}
        {propositions && (
          <div className="flex flex-col gap-2">
            {propositions.map((p, i) => (
              <div key={i} className="rounded-field border border-line bg-panel2 p-2 text-sm">
                <p className="font-medium text-off">
                  {p.titre} {!p.source_verifiee && <span className="text-xs text-danger-fg">{t("grow.tendances.non_verifiee")}</span>}
                </p>
                <p className="mb-1 text-xs text-dim">{p.description}</p>
                <BoutonSecondaire type="button" onClick={() => void sauvegarderProposition(p)}>
                  {t("commun.enregistrer")}
                </BoutonSecondaire>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}
