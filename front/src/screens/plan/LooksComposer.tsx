import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SLOT_LOOK, type Look, type LookItem, type Article, type ArticleColoris } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { clientShootings, clientLooks, clientLookItems } from "../../lib/resources/taches.js";
import { clientArticles } from "../../lib/resources/catalogue.js";
import { clientColoris } from "../../lib/resources/referentiels.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";

function LookCard({
  look,
  peutEditer,
  onChange,
}: {
  look: Look;
  peutEditer: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [items, setItems] = useState<LookItem[] | null>(null);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [onglet, setOnglet] = useState<"catalogue" | "photo" | "texte">("catalogue");
  const [slot, setSlot] = useState<(typeof SLOT_LOOK)[number]>("haut");
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<Article[]>([]);
  const [articleChoisi, setArticleChoisi] = useState<{ article: Article; coloris: ArticleColoris[] } | null>(null);
  const [colorisChoisiId, setColorisChoisiId] = useState("");
  const [taille, setTaille] = useState("");
  const [texteLibre, setTexteLibre] = useState("");
  const [colorisNomParId, setColorisNomParId] = useState<Map<string, string>>(new Map());

  const charger = () => clientLooks.listerItems(look.id).then(setItems);
  useEffect(() => {
    charger();
    clientColoris.lister().then((liste) => setColorisNomParId(new Map(liste.map((c) => [c.id, c.nom_commercial]))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look.id]);

  useEffect(() => {
    if (!recherche) return setResultats([]);
    const debounce = setTimeout(() => clientArticles.lister({ q: recherche }).then(setResultats), 250);
    return () => clearTimeout(debounce);
  }, [recherche]);

  async function choisirArticle(article: Article) {
    const coloris = await clientArticles.listerColoris(article.id);
    setArticleChoisi({ article, coloris });
    setColorisChoisiId(coloris[0]?.id ?? "");
  }

  async function ajouterItem() {
    try {
      if (onglet === "catalogue" && articleChoisi && colorisChoisiId) {
        await clientLooks.ajouterItem(look.id, {
          slot,
          source: "catalogue",
          article_coloris_id: colorisChoisiId,
          ordre: items?.length ?? 0,
          note: taille ? `Taille: ${taille}` : undefined,
        });
      } else if (onglet === "texte" && texteLibre) {
        await clientLooks.ajouterItem(look.id, { slot, source: "texte", texte: texteLibre, ordre: items?.length ?? 0 });
      } else {
        toaster(t("commun.erreur_generique"), { type: "erreur" });
        return;
      }
      setDialogueOuvert(false);
      setArticleChoisi(null);
      setTexteLibre("");
      setTaille("");
      setRecherche("");
      charger();
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function supprimerItem(id: string) {
    await clientLookItems.supprimer(id);
    charger();
    onChange();
  }

  return (
    <div className="rounded-field border border-line bg-panel2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium text-off">{look.nom}</p>
        {peutEditer && (
          <button type="button" onClick={() => setDialogueOuvert(true)} className="min-h-tap text-xs text-sable">
            {t("callsheet.looks.ajouter_item")}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items?.map((item) => (
          <span key={item.id} className="flex items-center gap-1 rounded-field border border-line bg-panel px-2 py-1 text-xs text-off">
            {t(`callsheet.looks.slot.${item.slot}`)}: {item.texte ?? (item.article_coloris_id && colorisNomParId.get(item.article_coloris_id)) ?? item.article_coloris_id ?? "photo"}
            {peutEditer && (
              <button type="button" onClick={() => void supprimerItem(item.id)} className="text-dim hover:text-danger-fg">
                ✕
              </button>
            )}
          </span>
        ))}
      </div>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("callsheet.looks.ajouter_item")}>
        <div className="mb-3 flex gap-1 border-b border-line">
          {(["catalogue", "photo", "texte"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOnglet(o)}
              className={`min-h-tap px-3 text-sm ${onglet === o ? "border-b-2 border-sable text-sable" : "text-dim"}`}
            >
              {t(`campagnes.champ_intelligent.${o}`)}
            </button>
          ))}
        </div>

        <Champ label={t("callsheet.looks.slot.haut")}>
          <ChampSelect value={slot} onChange={(e) => setSlot(e.target.value as (typeof SLOT_LOOK)[number])}>
            {SLOT_LOOK.map((s) => (
              <option key={s} value={s}>
                {t(`callsheet.looks.slot.${s}`)}
              </option>
            ))}
          </ChampSelect>
        </Champ>

        {onglet === "catalogue" && (
          <div>
            <ChampTexte placeholder={t("commun.rechercher")} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            <ul className="mt-1 max-h-32 overflow-y-auto">
              {resultats.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => void choisirArticle(a)} className="block w-full px-1 py-1 text-start text-sm text-off hover:bg-panel2">
                    {a.reference} — {a.nom}
                  </button>
                </li>
              ))}
            </ul>
            {articleChoisi && (
              <div className="mt-2">
                <p className="text-sm text-off">{articleChoisi.article.reference}</p>
                <Champ label={t("catalogue.champs.categorie")}>
                  <ChampSelect value={colorisChoisiId} onChange={(e) => setColorisChoisiId(e.target.value)}>
                    {articleChoisi.coloris.map((c) => (
                      <option key={c.id} value={c.id}>
                        {colorisNomParId.get(c.coloris_id) ?? c.coloris_id}
                      </option>
                    ))}
                  </ChampSelect>
                </Champ>
                <Champ label={t("catalogue.sku.taille")}>
                  <ChampTexte value={taille} onChange={(e) => setTaille(e.target.value)} placeholder="M" />
                </Champ>
              </div>
            )}
          </div>
        )}

        {onglet === "texte" && (
          <Champ label={t("callsheet.looks.ajouter_item")}>
            <ChampTexte value={texteLibre} onChange={(e) => setTexteLibre(e.target.value)} placeholder="mocassins marron du modèle" />
          </Champ>
        )}

        {onglet === "photo" && <p className="text-sm text-dim">{t("commun.a_construire")}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <BoutonSecondaire type="button" onClick={() => setDialogueOuvert(false)}>
            {t("commun.annuler")}
          </BoutonSecondaire>
          <BoutonPrimaire type="button" onClick={() => void ajouterItem()}>
            {t("commun.enregistrer")}
          </BoutonPrimaire>
        </div>
      </Dialog>
    </div>
  );
}

export function LooksComposer({
  shootingId,
  peutEditer,
  onChange,
}: {
  shootingId: string;
  peutEditer: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const [looks, setLooks] = useState<Look[] | null>(null);

  const charger = () => clientShootings.listerLooks(shootingId).then(setLooks);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shootingId]);

  async function ajouterLook() {
    await clientShootings.creerLook(shootingId, { nom: `Look ${(looks?.length ?? 0) + 1}`, ordre: looks?.length ?? 0 });
    charger();
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-dim">{t("callsheet.looks.titre")}</h3>
        {peutEditer && (
          <button type="button" onClick={() => void ajouterLook()} className="min-h-tap text-xs text-sable">
            {t("callsheet.looks.ajouter")}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {looks?.map((look) => (
          <LookCard key={look.id} look={look} peutEditer={peutEditer} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}
