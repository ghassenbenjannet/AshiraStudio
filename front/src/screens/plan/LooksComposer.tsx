import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SLOT_LOOK, type Look, type LookItem, type Article, type ArticleColoris, type Asset } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { clientShootings, clientLooks, clientLookItems } from "../../lib/resources/taches.js";
import { clientArticles, clientArticleColoris } from "../../lib/resources/catalogue.js";
import { clientColoris } from "../../lib/resources/referentiels.js";
import { clientAssets } from "../../lib/resources/assets.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";

/** §CR-02 B — un item de look porte sa nature à l'œil : référence catalogue en accent, vignette pour une photo, texte atténué pour une note libre. */
function ItemVisuel({
  item,
  articleColorisLabelParId,
  assetParId,
}: {
  item: LookItem;
  articleColorisLabelParId: Map<string, string>;
  assetParId: Map<string, Asset>;
}) {
  if (item.source === "catalogue") {
    return (
      <span className="text-sm font-medium text-sable">
        {item.article_coloris_id ? (articleColorisLabelParId.get(item.article_coloris_id) ?? "…") : "—"}
        {item.taille && <span className="ms-1 font-normal text-dim">({item.taille})</span>}
      </span>
    );
  }
  if (item.source === "photo") {
    const asset = item.photo_asset_id ? assetParId.get(item.photo_asset_id) : undefined;
    return (
      <span className="flex items-center gap-2 text-sm text-off">
        {asset ? (
          <img src={asset.vignette_url ?? asset.fichier_url} alt={asset.nom} className="h-8 w-8 shrink-0 rounded-field object-cover" />
        ) : (
          <span aria-hidden>📷</span>
        )}
        {item.note ?? asset?.nom ?? "—"}
      </span>
    );
  }
  return <span className="text-sm text-dim">{item.texte}</span>;
}

function LookCard({
  look,
  peutEditer,
  campagneId,
  premier,
  dernier,
  onChange,
  onDeplacer,
  onDupliquer,
}: {
  look: Look;
  peutEditer: boolean;
  campagneId: string | null;
  premier: boolean;
  dernier: boolean;
  onChange: () => void;
  onDeplacer: (direction: -1 | 1) => void;
  onDupliquer: () => void;
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
  const [photosDisponibles, setPhotosDisponibles] = useState<Asset[] | null>(null);
  const [photoChoisieId, setPhotoChoisieId] = useState("");
  const [assetParId, setAssetParId] = useState<Map<string, Asset>>(new Map());
  const [articleColorisLabelParId, setArticleColorisLabelParId] = useState<Map<string, string>>(new Map());

  const charger = () =>
    clientLooks.listerItems(look.id).then(async (liste) => {
      setItems(liste);
      const idsPhotos = liste.filter((i) => i.source === "photo" && i.photo_asset_id).map((i) => i.photo_asset_id!);
      const manquantsPhotos = idsPhotos.filter((id) => !assetParId.has(id));
      if (manquantsPhotos.length > 0) {
        const assets = await clientAssets.parIds(manquantsPhotos);
        setAssetParId((carte) => {
          const suivante = new Map(carte);
          assets.forEach((a) => suivante.set(a.id, a));
          return suivante;
        });
      }

      // §CR-02 B — l'item ne porte que l'id du coloris d'article (pas un label) : résoudre
      // article + coloris pour afficher « RÉF — Nom (Coloris) », comme la liste des pièces à apporter.
      const idsArticleColoris = Array.from(new Set(liste.filter((i) => i.source === "catalogue" && i.article_coloris_id).map((i) => i.article_coloris_id!)));
      const manquantsAc = idsArticleColoris.filter((id) => !articleColorisLabelParId.has(id));
      if (manquantsAc.length > 0) {
        const acs = await Promise.all(manquantsAc.map((id) => clientArticleColoris.obtenir(id).catch(() => null)));
        const colorisRef = await clientColoris.lister();
        const colorisNomParIdLocal = new Map(colorisRef.map((c) => [c.id, c.nom_commercial]));
        const idsArticles = Array.from(new Set(acs.filter((ac): ac is ArticleColoris => !!ac).map((ac) => ac.article_id)));
        const articlesDetail = await Promise.all(idsArticles.map((id) => clientArticles.obtenir(id).catch(() => null)));
        const articleParId = new Map(articlesDetail.filter((a): a is Article => !!a).map((a) => [a.id, a]));
        setArticleColorisLabelParId((carte) => {
          const suivante = new Map(carte);
          acs.forEach((ac, i) => {
            if (!ac) return;
            const article = articleParId.get(ac.article_id);
            const nomColoris = colorisNomParIdLocal.get(ac.coloris_id) ?? ac.coloris_id;
            suivante.set(manquantsAc[i]!, article ? `${article.reference} — ${article.nom} (${nomColoris})` : nomColoris);
          });
          return suivante;
        });
      }
    });
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

  useEffect(() => {
    if (onglet !== "photo" || !dialogueOuvert || !campagneId) return;
    clientAssets.lister({ type: "photo", campagne_id: campagneId }).then(setPhotosDisponibles);
  }, [onglet, dialogueOuvert, campagneId]);

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
          taille: taille || undefined,
        });
      } else if (onglet === "photo" && photoChoisieId) {
        const asset = photosDisponibles?.find((a) => a.id === photoChoisieId);
        await clientLooks.ajouterItem(look.id, { slot, source: "photo", photo_asset_id: photoChoisieId, ordre: items?.length ?? 0, note: asset?.nom });
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
      setPhotoChoisieId("");
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

  function ouvrirDialogue(slotVise: (typeof SLOT_LOOK)[number]) {
    setSlot(slotVise);
    setDialogueOuvert(true);
  }

  return (
    <div className="rounded-card border border-line bg-panel p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-display text-base text-off">{look.nom}</p>
        {peutEditer && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onDeplacer(-1)} disabled={premier} className="min-h-tap min-w-tap text-dim hover:text-off disabled:opacity-30">
              ↑
            </button>
            <button type="button" onClick={() => onDeplacer(1)} disabled={dernier} className="min-h-tap min-w-tap text-dim hover:text-off disabled:opacity-30">
              ↓
            </button>
            <button type="button" onClick={onDupliquer} className="min-h-tap px-2 text-xs text-dim hover:text-off">
              {t("callsheet.looks.dupliquer")}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SLOT_LOOK.map((s) => {
          const itemsDuSlot = items?.filter((i) => i.slot === s) ?? [];
          return (
            <div key={s} className="rounded-field border border-line bg-panel2 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-dim">{t(`callsheet.looks.slot.${s}`)}</span>
                {peutEditer && (
                  <button type="button" onClick={() => ouvrirDialogue(s)} className="min-h-tap text-xs text-sable hover:underline">
                    + {t("callsheet.looks.ajouter_item")}
                  </button>
                )}
              </div>
              {itemsDuSlot.length === 0 ? (
                <p className="text-xs text-dim">—</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {itemsDuSlot.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <ItemVisuel item={item} articleColorisLabelParId={articleColorisLabelParId} assetParId={assetParId} />
                      {peutEditer && (
                        <button type="button" onClick={() => void supprimerItem(item.id)} className="min-h-tap min-w-tap shrink-0 text-dim hover:text-danger-fg">
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t(`callsheet.looks.slot.${slot}`)}>
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

        <Champ label={t("callsheet.looks.champ_emplacement")}>
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
                <Champ label={t("catalogue.champs.coloris")}>
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

        {onglet === "photo" && (
          <div>
            {!campagneId ? (
              <p className="text-sm text-dim">{t("callsheet.looks.photo_sans_campagne")}</p>
            ) : !photosDisponibles ? (
              <p className="text-sm text-dim">{t("commun.chargement")}</p>
            ) : photosDisponibles.length === 0 ? (
              <p className="text-sm text-dim">{t("callsheet.looks.aucune_photo")}</p>
            ) : (
              <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto">
                {photosDisponibles.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setPhotoChoisieId(asset.id)}
                    className={`overflow-hidden rounded-field border-2 ${photoChoisieId === asset.id ? "border-sable" : "border-line"}`}
                  >
                    <img src={asset.vignette_url ?? asset.fichier_url} alt={asset.nom} className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
  campagneId,
  peutEditer,
  onChange,
}: {
  shootingId: string;
  campagneId: string | null;
  peutEditer: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [looks, setLooks] = useState<Look[] | null>(null);

  const charger = () => clientShootings.listerLooks(shootingId).then((liste) => setLooks(liste.slice().sort((a, b) => a.ordre - b.ordre)));
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shootingId]);

  async function ajouterLook() {
    await clientShootings.creerLook(shootingId, { nom: `${t("callsheet.looks.nouveau_look")} ${(looks?.length ?? 0) + 1}`, ordre: looks?.length ?? 0 });
    charger();
    onChange();
  }

  async function deplacer(index: number, direction: -1 | 1) {
    if (!looks) return;
    const cible = index + direction;
    if (cible < 0 || cible >= looks.length) return;
    const copie = [...looks];
    const [item] = copie.splice(index, 1);
    copie.splice(cible, 0, item!);
    setLooks(copie);
    await Promise.all(copie.map((l, i) => (l.ordre !== i ? clientLooks.modifier(l.id, { ordre: i }) : Promise.resolve())));
  }

  async function dupliquer(look: Look) {
    try {
      const items = await clientLooks.listerItems(look.id);
      const nouveau = await clientShootings.creerLook(shootingId, { nom: `${look.nom} (${t("callsheet.looks.copie")})`, ordre: looks?.length ?? 0 });
      for (const item of items) {
        await clientLooks.ajouterItem(nouveau.id, {
          slot: item.slot,
          source: item.source,
          article_coloris_id: item.article_coloris_id ?? undefined,
          photo_asset_id: item.photo_asset_id ?? undefined,
          texte: item.texte ?? undefined,
          note: item.note ?? undefined,
          taille: item.taille ?? undefined,
          ordre: item.ordre,
        });
      }
      toaster(t("callsheet.looks.duplique"));
      charger();
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
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
      {looks && looks.length === 0 && <p className="text-sm text-dim">{t("callsheet.looks.aucun")}</p>}
      <div className="flex flex-col gap-3">
        {looks?.map((look, i) => (
          <LookCard
            key={look.id}
            look={look}
            peutEditer={peutEditer}
            campagneId={campagneId}
            premier={i === 0}
            dernier={i === looks.length - 1}
            onChange={onChange}
            onDeplacer={(direction) => void deplacer(i, direction)}
            onDupliquer={() => void dupliquer(look)}
          />
        ))}
      </div>
    </div>
  );
}
