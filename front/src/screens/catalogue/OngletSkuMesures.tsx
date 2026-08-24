import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ArticleColoris, ArticleSku, CategorieProduit, Coloris, GabaritMesures } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientArticles, clientArticleColoris, clientArticleSkus } from "../../lib/resources/catalogue.js";
import { clientColoris, clientCategoriesProduit } from "../../lib/resources/referentiels.js";

const CHAMPS_MESURES: Record<GabaritMesures, string[]> = {
  haut: ["poitrine", "epaules", "longueur", "manche"],
  bas: ["taille", "hanches", "entrejambe", "ouverture", "longueur"],
  tete: ["tour_de_tete"],
  aucun: [],
};

interface Ligne {
  sku: ArticleSku;
  coloris: Coloris | undefined;
  articleColorisId: string;
}

/** E08 — Onglet SKU & Mesures : saisie type tableur des quantités et mesures (cm) par taille. */
export function OngletSkuMesures({ articleId, peutEditer }: { articleId: string; peutEditer: boolean }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [gabarit, setGabarit] = useState<GabaritMesures>("aucun");
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [articleColorisPourAjout, setArticleColorisPourAjout] = useState<ArticleColoris | null>(null);
  const [nouvelleTaille, setNouvelleTaille] = useState("");
  const [colorisList, setColorisList] = useState<ArticleColoris[]>([]);

  const charger = async () => {
    const [article, referentiel] = await Promise.all([clientArticles.obtenir(articleId), clientColoris.lister()]);
    const categories = await clientCategoriesProduit.lister();
    const categorie = categories.find((c: CategorieProduit) => c.id === article.categorie_id);
    setGabarit(categorie?.gabarit_mesures ?? "aucun");
    const refParId = new Map(referentiel.map((c) => [c.id, c]));
    const acs = await clientArticles.listerColoris(articleId);
    setColorisList(acs);
    const toutesLignes: Ligne[] = [];
    for (const ac of acs) {
      const skus = await clientArticleColoris.listerSkus(ac.id);
      skus.forEach((sku) => toutesLignes.push({ sku, coloris: refParId.get(ac.coloris_id), articleColorisId: ac.id }));
    }
    setLignes(toutesLignes);
  };

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const champsMesures = CHAMPS_MESURES[gabarit];

  async function sauvegarderQuantite(sku: ArticleSku, cle: "qte_produite" | "qte_stock", valeur: string) {
    const nombre = Number(valeur);
    if (Number.isNaN(nombre)) return;
    try {
      await clientArticleSkus.modifier(sku.id, { [cle]: nombre });
      void charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function sauvegarderMesure(sku: ArticleSku, champ: string, valeur: string) {
    const nombre = valeur === "" ? undefined : Number(valeur);
    const mesures = { ...sku.mesures };
    if (nombre === undefined || Number.isNaN(nombre)) delete mesures[champ];
    else mesures[champ] = nombre;
    try {
      await clientArticleSkus.modifier(sku.id, { mesures });
      void charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function ajouterTaille() {
    if (!articleColorisPourAjout || !nouvelleTaille.trim()) return;
    try {
      await clientArticleColoris.creerSku(articleColorisPourAjout.id, { taille: nouvelleTaille.trim().toUpperCase(), qte_produite: 0, qte_stock: 0, mesures: {} });
      setDialogueOuvert(false);
      setNouvelleTaille("");
      void charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  if (!lignes) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  return (
    <div>
      {peutEditer && colorisList.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {colorisList.map((ac) => (
            <BoutonSecondaire
              key={ac.id}
              type="button"
              onClick={() => {
                setArticleColorisPourAjout(ac);
                setDialogueOuvert(true);
              }}
            >
              {t("catalogue.sku.ajouter")}
            </BoutonSecondaire>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-dim">
              <th className="px-3 py-2 text-start">{t("contacts.champs.categories")}</th>
              <th className="px-3 py-2 text-start">{t("catalogue.sku.taille")}</th>
              <th className="px-3 py-2 text-start">{t("catalogue.sku.qte_produite")}</th>
              <th className="px-3 py-2 text-start">{t("catalogue.sku.qte_stock")}</th>
              {champsMesures.map((champ) => (
                <th key={champ} className="px-3 py-2 text-start">
                  {champ}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne) => (
              <tr key={ligne.sku.id} className="border-b border-line last:border-0">
                <td className="px-3 py-1 text-off">{ligne.coloris?.nom_commercial}</td>
                <td className="px-3 py-1 text-off">{ligne.sku.taille}</td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    disabled={!peutEditer}
                    defaultValue={ligne.sku.qte_produite}
                    onBlur={(e) => void sauvegarderQuantite(ligne.sku, "qte_produite", e.target.value)}
                    className="w-20 rounded-field border border-line bg-panel2 px-2 py-1 text-off"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    disabled={!peutEditer}
                    defaultValue={ligne.sku.qte_stock}
                    onBlur={(e) => void sauvegarderQuantite(ligne.sku, "qte_stock", e.target.value)}
                    className="w-20 rounded-field border border-line bg-panel2 px-2 py-1 text-off"
                  />
                </td>
                {champsMesures.map((champ) => (
                  <td key={champ} className="px-1 py-1">
                    <input
                      type="number"
                      disabled={!peutEditer}
                      defaultValue={ligne.sku.mesures[champ] ?? ""}
                      onBlur={(e) => void sauvegarderMesure(ligne.sku, champ, e.target.value)}
                      className="w-20 rounded-field border border-line bg-panel2 px-2 py-1 text-off"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("catalogue.sku.ajouter")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ajouterTaille();
          }}
        >
          <Champ label={t("catalogue.sku.taille")}>
            <ChampTexte required value={nouvelleTaille} onChange={(e) => setNouvelleTaille(e.target.value)} />
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
