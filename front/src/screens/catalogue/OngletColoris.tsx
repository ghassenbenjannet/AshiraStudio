import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { STATUT_ARTICLE_COLORIS, type Asset, type ArticleColoris, type Coloris } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampNombre, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientArticles, clientArticleColoris } from "../../lib/resources/catalogue.js";
import { clientColoris } from "../../lib/resources/referentiels.js";
import { clientAssets } from "../../lib/resources/assets.js";

export function OngletColoris({ articleId, peutEditer }: { articleId: string; peutEditer: boolean }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [liste, setListe] = useState<ArticleColoris[] | null>(null);
  const [referentiel, setReferentiel] = useState<Coloris[]>([]);
  const [assetsParId, setAssetsParId] = useState<Map<string, Asset>>(new Map());
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState({ coloris_id: "", prix_dt: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);
  const [colorisActifPourUpload, setColorisActifPourUpload] = useState<string | null>(null);

  const charger = () =>
    clientArticles.listerColoris(articleId).then(async (l) => {
      setListe(l);
      const tousLesIds = Array.from(new Set(l.flatMap((ac) => ac.photos)));
      const manquants = tousLesIds.filter((id) => !assetsParId.has(id));
      if (manquants.length > 0) {
        const nouveaux = await clientAssets.parIds(manquants);
        setAssetsParId((precedent) => new Map([...precedent, ...nouveaux.map((a) => [a.id, a] as const)]));
      }
    });
  useEffect(() => {
    charger();
    clientColoris.lister().then(setReferentiel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const referentielParId = new Map(referentiel.map((c) => [c.id, c]));

  async function ajouter() {
    setErreur(null);
    try {
      await clientArticles.creerColoris(articleId, { coloris_id: form.coloris_id, prix_dt: form.prix_dt ? Number(form.prix_dt) : null, statut: "actif", ordre: (liste?.length ?? 0) });
      toaster(t("referentiels.cree"));
      setDialogueOuvert(false);
      setForm({ coloris_id: "", prix_dt: "" });
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    }
  }

  async function modifierPrix(ac: ArticleColoris, prixDt: number, confirmer = false) {
    try {
      await clientArticleColoris.modifier(ac.id, { prix_dt: prixDt, confirmer_baisse_prix: confirmer });
      charger();
    } catch (err) {
      if (err instanceof ApiError && err.code === "confirmation_requise_baisse_prix" && !confirmer) {
        if (confirm(`${err.message} — ${t("commun.confirmer")} ?`)) return modifierPrix(ac, prixDt, true);
        return;
      }
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function modifierStatut(ac: ArticleColoris, statut: (typeof STATUT_ARTICLE_COLORIS)[number]) {
    try {
      await clientArticleColoris.modifier(ac.id, { statut });
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function surSelectionFichiers(e: React.ChangeEvent<HTMLInputElement>) {
    if (!colorisActifPourUpload || !e.target.files?.length) return;
    try {
      await clientArticleColoris.televerserPhotos(colorisActifPourUpload, Array.from(e.target.files));
      toaster(t("referentiels.modifie"));
      charger();
    } catch (err) {
      toaster(err instanceof Error ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div>
      {peutEditer && (
        <div className="mb-3 flex justify-end">
          <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
            {t("catalogue.coloris.ajouter")}
          </BoutonPrimaire>
        </div>
      )}

      {!liste && <p className="text-sm text-dim">{t("commun.chargement")}</p>}

      <input ref={inputFichierRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={surSelectionFichiers} />

      {liste && (
        <ul className="flex flex-col gap-3">
          {liste.map((ac) => {
            const coloris = referentielParId.get(ac.coloris_id);
            return (
              <li key={ac.id} className="rounded-card border border-line bg-panel p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {coloris && <span className="h-5 w-5 rounded-full border border-line" style={{ backgroundColor: coloris.hex }} />}
                  <span className="text-sm text-off">{coloris?.nom_commercial ?? ac.coloris_id}</span>
                  <Champ label={t("catalogue.coloris.prix")}>
                    <ChampNombre disabled={!peutEditer} defaultValue={ac.prix_dt ?? ""} onBlur={(e) => e.target.value && modifierPrix(ac, Number(e.target.value))} className="!w-28" />
                  </Champ>
                  <Champ label={t("catalogue.coloris.statut")}>
                    <ChampSelect disabled={!peutEditer} value={ac.statut} onChange={(e) => void modifierStatut(ac, e.target.value as any)} className="!w-32">
                      {STATUT_ARTICLE_COLORIS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </ChampSelect>
                  </Champ>
                  {peutEditer && (
                    <BoutonSecondaire
                      type="button"
                      onClick={() => {
                        setColorisActifPourUpload(ac.id);
                        inputFichierRef.current?.click();
                      }}
                    >
                      {t("catalogue.coloris.ajouter_photos")}
                    </BoutonSecondaire>
                  )}
                </div>
                {ac.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ac.photos.map((assetId) => {
                      const asset = assetsParId.get(assetId);
                      return asset ? <img key={assetId} src={asset.fichier_url} alt={asset.nom} className="h-16 w-16 rounded-field object-cover" /> : null;
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("catalogue.coloris.ajouter")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ajouter();
          }}
        >
          <Champ label={t("catalogue.champs.categorie")}>
            <ChampSelect required value={form.coloris_id} onChange={(e) => setForm((f) => ({ ...f, coloris_id: e.target.value }))}>
              <option value="" disabled>
                —
              </option>
              {referentiel.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom_commercial}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("catalogue.coloris.prix")}>
            <ChampNombre required value={form.prix_dt} onChange={(e) => setForm((f) => ({ ...f, prix_dt: e.target.value }))} />
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
