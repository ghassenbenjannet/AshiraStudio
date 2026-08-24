import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FIT_ARTICLE, STATUT_CYCLE_ARTICLE, type Article, type Gamme, type Personne, type StatutCycleArticle } from "@achirah/shared";
import { Champ, ChampTexte, ChampNombre, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientArticles } from "../../lib/resources/catalogue.js";
import { clientPersonnes } from "../../lib/resources/contacts.js";

export function OngletModele({
  article,
  gammes,
  peutEditer,
  onChange,
}: {
  article: Article;
  gammes: Gamme[];
  peutEditer: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [form, setForm] = useState(article);
  const [fournisseurs, setFournisseurs] = useState<Personne[]>([]);
  const [enregistrement, setEnregistrement] = useState(false);
  const [statutCible, setStatutCible] = useState<StatutCycleArticle | "">("");
  const [essaye5, setEssaye5] = useState(false);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [erreurTransition, setErreurTransition] = useState<string | null>(null);
  const [enTransition, setEnTransition] = useState(false);

  useEffect(() => {
    setForm(article);
  }, [article]);

  useEffect(() => {
    clientPersonnes.lister({ categorie_id: undefined }).then((tous) => setFournisseurs(tous.filter((p) => p.actif)));
  }, []);

  const indexActuel = STATUT_CYCLE_ARTICLE.indexOf(article.statut_cycle);
  const statutsPossibles = STATUT_CYCLE_ARTICLE.filter((_, i) => i !== indexActuel);

  function champ<K extends keyof Article>(cle: K, valeur: Article[K]) {
    setForm((f) => ({ ...f, [cle]: valeur }));
  }

  async function enregistrer() {
    setEnregistrement(true);
    try {
      await clientArticles.modifier(article.id, {
        nom: form.nom,
        fit: form.fit,
        description_commerciale: form.description_commerciale,
        grammage_gsm: form.grammage_gsm,
        entretien_codes: form.entretien_codes,
        numerote: form.numerote,
        numerotation_total: form.numerotation_total,
        fournisseur_id: form.fournisseur_id,
        delai_production_jours: form.delai_production_jours,
        moq: form.moq,
        notes_interne: form.notes_interne,
      });
      toaster(t("referentiels.modifie"));
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnregistrement(false);
    }
  }

  async function transitionner(confirmerArchivage = false) {
    if (!statutCible) return;
    setEnTransition(true);
    setErreurTransition(null);
    try {
      const { donnees, avertissements: nouveauxAvertissements } = await clientArticles.transitionner(article.id, statutCible, {
        essaye_sur_5_morphologies: essaye5,
        confirmer_archivage_utilise: confirmerArchivage,
      });
      setAvertissements(nouveauxAvertissements);
      setStatutCible("");
      toaster(`${t("catalogue.transition.passer_a")} ${t(`catalogue.statuts.${donnees.statut_cycle}`)}`);
      onChange();
    } catch (err) {
      if (err instanceof ApiError && err.code === "confirmation_requise" && !confirmerArchivage) {
        if (confirm(`${err.message} — ${t("catalogue.transition.confirmer_archivage")} ?`)) {
          return transitionner(true);
        }
      }
      setErreurTransition(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setEnTransition(false);
    }
  }

  return (
    <div>
      {peutEditer && (
        <div className="mb-6 rounded-card border border-line bg-panel p-4">
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <Champ label={t("catalogue.transition.passer_a")}>
              <ChampSelect value={statutCible} onChange={(e) => setStatutCible(e.target.value as StatutCycleArticle)} className="!w-48">
                <option value="">—</option>
                {statutsPossibles.map((s) => (
                  <option key={s} value={s}>
                    {t(`catalogue.statuts.${s}`)}
                  </option>
                ))}
              </ChampSelect>
            </Champ>
            {statutCible === "fit_valide" && (
              <label className="mb-3 flex min-h-tap items-center gap-2 text-sm text-dim">
                <input type="checkbox" checked={essaye5} onChange={(e) => setEssaye5(e.target.checked)} />
                {t("catalogue.transition.essaye_5_morphologies")}
              </label>
            )}
            <BoutonPrimaire type="button" disabled={!statutCible || enTransition} onClick={() => void transitionner()}>
              {t("commun.confirmer")}
            </BoutonPrimaire>
          </div>
          {erreurTransition && <p className="text-sm text-danger-fg">{erreurTransition}</p>}
          {avertissements.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm text-sable">
              {avertissements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
      >
        <div className="grid gap-x-4 md:grid-cols-2">
          <Champ label={t("catalogue.champs.nom")}>
            <ChampTexte disabled={!peutEditer} value={form.nom} onChange={(e) => champ("nom", e.target.value)} />
          </Champ>
          <Champ label={t("catalogue.champs.fit")}>
            <ChampSelect disabled={!peutEditer} value={form.fit ?? ""} onChange={(e) => champ("fit", (e.target.value || null) as Article["fit"])}>
              <option value="">—</option>
              {FIT_ARTICLE.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("catalogue.champs.grammage_gsm")}>
            <ChampNombre disabled={!peutEditer} value={form.grammage_gsm ?? ""} onChange={(e) => champ("grammage_gsm", e.target.value ? Number(e.target.value) : null)} />
          </Champ>
          <Champ label={t("catalogue.champs.fournisseur")}>
            <ChampSelect disabled={!peutEditer} value={form.fournisseur_id ?? ""} onChange={(e) => champ("fournisseur_id", e.target.value || null)}>
              <option value="">—</option>
              {fournisseurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("catalogue.champs.delai_production_jours")}>
            <ChampNombre disabled={!peutEditer} value={form.delai_production_jours ?? ""} onChange={(e) => champ("delai_production_jours", e.target.value ? Number(e.target.value) : null)} />
          </Champ>
          <Champ label={t("catalogue.champs.moq")}>
            <ChampNombre disabled={!peutEditer} value={form.moq ?? ""} onChange={(e) => champ("moq", e.target.value ? Number(e.target.value) : null)} />
          </Champ>
          <label className="mb-3 flex min-h-tap items-center gap-2 text-sm text-off">
            <input type="checkbox" disabled={!peutEditer} checked={form.numerote} onChange={(e) => champ("numerote", e.target.checked)} />
            {t("catalogue.champs.numerote")}
          </label>
          {form.numerote && (
            <Champ label={t("catalogue.champs.numerotation_total")}>
              <ChampNombre disabled={!peutEditer} value={form.numerotation_total ?? ""} onChange={(e) => champ("numerotation_total", e.target.value ? Number(e.target.value) : null)} />
            </Champ>
          )}
        </div>

        <Champ label={t("catalogue.champs.description_commerciale")}>
          <ChampZoneTexte disabled={!peutEditer} value={form.description_commerciale ?? ""} onChange={(e) => champ("description_commerciale", e.target.value || null)} />
        </Champ>
        <Champ label={t("catalogue.champs.notes_interne")}>
          <ChampZoneTexte disabled={!peutEditer} value={form.notes_interne ?? ""} onChange={(e) => champ("notes_interne", e.target.value || null)} />
        </Champ>

        {peutEditer && (
          <div className="flex justify-end">
            <BoutonSecondaire type="submit" disabled={enregistrement}>
              {t("commun.enregistrer")}
            </BoutonSecondaire>
          </div>
        )}
      </form>
    </div>
  );
}
