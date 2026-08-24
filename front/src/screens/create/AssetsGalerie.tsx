import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TYPE_ASSET, SOURCE_ASSET, aCapacite, type Asset, type Campagne } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientAssets, type LiensAsset } from "../../lib/resources/assets.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";

function tailleLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export function AssetsGalerie() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [quotas, setQuotas] = useState<{ nombre_assets: number; taille_totale_octets: number } | null>(null);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [tagsMasse, setTagsMasse] = useState("");

  const [dialogueUpload, setDialogueUpload] = useState(false);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [formUpload, setFormUpload] = useState({ type: "photo", source: "studio", nom: "", tags: "", droits: "" });

  const [dialogueExterne, setDialogueExterne] = useState(false);
  const [formExterne, setFormExterne] = useState({ type: "video", source: "externe", fichier_url: "", nom: "", droits: "" });

  const [detail, setDetail] = useState<{ asset: Asset; liens: LiensAsset } | null>(null);

  const charger = () => clientAssets.lister({ type: type || undefined, q: q || undefined }).then(setAssets);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, q]);
  useEffect(() => {
    clientCampagnes.lister().then(setCampagnes);
    clientAssets.quotas().then(setQuotas);
  }, []);

  function toggleSelection(id: string) {
    setSelection((s) => {
      const copie = new Set(s);
      if (copie.has(id)) copie.delete(id);
      else copie.add(id);
      return copie;
    });
  }

  async function ouvrirDetail(asset: Asset) {
    const liens = await clientAssets.liens(asset.id);
    setDetail({ asset, liens });
  }

  async function appliquerTagsMasse() {
    if (selection.size === 0 || !tagsMasse.trim()) return;
    try {
      await clientAssets.masse([...selection], { tags: tagsMasse.split(",").map((t2) => t2.trim()).filter(Boolean) });
      toaster(t("assets.masse_appliquee"));
      setTagsMasse("");
      setSelection(new Set());
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function televerser() {
    if (fichiers.length === 0) return;
    try {
      await clientAssets.televerser(fichiers, formUpload);
      toaster(t("assets.televersee"));
      setDialogueUpload(false);
      setFichiers([]);
      setFormUpload({ type: "photo", source: "studio", nom: "", tags: "", droits: "" });
      charger();
      clientAssets.quotas().then(setQuotas);
    } catch (err) {
      toaster(err instanceof Error ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function creerExterne() {
    try {
      await clientAssets.creerExterne({ ...formExterne, droits: formExterne.droits || null } as Partial<Asset>);
      toaster(t("assets.televersee"));
      setDialogueExterne(false);
      setFormExterne({ type: "video", source: "externe", fichier_url: "", nom: "", droits: "" });
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-44">
          <ChampSelect value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t("assets.tous_types")}</option>
            {TYPE_ASSET.map((ty) => (
              <option key={ty} value={ty}>
                {t(`assets.types.${ty}`)}
              </option>
            ))}
          </ChampSelect>
        </div>
        <div className="w-56">
          <ChampTexte placeholder={t("commun.rechercher")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {quotas && (
          <span className="text-xs text-dim">
            {quotas.nombre_assets} · {tailleLisible(quotas.taille_totale_octets)}
          </span>
        )}
        <div className="flex-1" />
        {peutEditer && (
          <>
            <BoutonSecondaire type="button" onClick={() => setDialogueExterne(true)}>
              {t("assets.reference_externe")}
            </BoutonSecondaire>
            <BoutonPrimaire type="button" onClick={() => setDialogueUpload(true)}>
              {t("assets.televerser")}
            </BoutonPrimaire>
          </>
        )}
      </div>

      {selection.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-sable/40 bg-panel2 p-3">
          <span className="text-sm text-off">{t("assets.selection", { n: selection.size })}</span>
          <div className="w-56">
            <ChampTexte placeholder={t("assets.tags_a_ajouter")} value={tagsMasse} onChange={(e) => setTagsMasse(e.target.value)} />
          </div>
          <BoutonSecondaire type="button" onClick={() => void appliquerTagsMasse()}>
            {t("assets.appliquer")}
          </BoutonSecondaire>
          <BoutonSecondaire type="button" onClick={() => setSelection(new Set())}>
            {t("commun.annuler")}
          </BoutonSecondaire>
        </div>
      )}

      {!assets && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {assets && assets.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {assets?.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-card border border-line bg-panel">
            <div className="relative aspect-square bg-panel2">
              {a.type === "photo" || a.type === "logo" || a.type === "typo" || a.type === "design" || a.type === "ugc" ? (
                <img src={a.fichier_url} alt={a.nom} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-dim">{a.type === "video" ? "🎬" : "📄"}</div>
              )}
              <label className="absolute start-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-bg/70">
                <input type="checkbox" checked={selection.has(a.id)} onChange={() => toggleSelection(a.id)} />
              </label>
            </div>
            <button type="button" onClick={() => void ouvrirDetail(a)} className="w-full p-2 text-start">
              <p className="truncate text-xs text-off">{a.nom}</p>
              <p className="text-xs text-dim">
                {t(`assets.types.${a.type}`)}
                {a.source === "ugc" && !a.droits && <span className="text-danger-fg"> ⚠</span>}
              </p>
            </button>
          </div>
        ))}
      </div>

      <Dialog ouvert={dialogueUpload} onFermer={() => setDialogueUpload(false)} titre={t("assets.televerser")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void televerser();
          }}
        >
          <Champ label={t("assets.champs.fichiers")}>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFichiers(e.target.files ? Array.from(e.target.files) : [])}
              className="block w-full text-sm text-off"
            />
          </Champ>
          <p className="mb-3 text-xs text-dim">{t("assets.whitelist_note")}</p>
          <Champ label={t("assets.champs.type")}>
            <ChampSelect value={formUpload.type} onChange={(e) => setFormUpload((f) => ({ ...f, type: e.target.value }))}>
              {TYPE_ASSET.filter((ty) => ty !== "video").map((ty) => (
                <option key={ty} value={ty}>
                  {t(`assets.types.${ty}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("assets.champs.source")}>
            <ChampSelect value={formUpload.source} onChange={(e) => setFormUpload((f) => ({ ...f, source: e.target.value }))}>
              {SOURCE_ASSET.map((s) => (
                <option key={s} value={s}>
                  {t(`assets.sources.${s}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("assets.champs.tags")}>
            <ChampTexte placeholder="drop, ete" value={formUpload.tags} onChange={(e) => setFormUpload((f) => ({ ...f, tags: e.target.value }))} />
          </Champ>
          {formUpload.source === "ugc" && (
            <Champ label={t("assets.champs.droits")}>
              <ChampTexte required value={formUpload.droits} onChange={(e) => setFormUpload((f) => ({ ...f, droits: e.target.value }))} />
            </Champ>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueUpload(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit" disabled={fichiers.length === 0}>
              {t("commun.enregistrer")}
            </BoutonPrimaire>
          </div>
        </form>
      </Dialog>

      <Dialog ouvert={dialogueExterne} onFermer={() => setDialogueExterne(false)} titre={t("assets.reference_externe")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creerExterne();
          }}
        >
          <p className="mb-3 text-xs text-dim">{t("assets.reference_externe_note")}</p>
          <Champ label={t("assets.champs.url")}>
            <ChampTexte required type="url" value={formExterne.fichier_url} onChange={(e) => setFormExterne((f) => ({ ...f, fichier_url: e.target.value }))} />
          </Champ>
          <Champ label={t("assets.champs.nom")}>
            <ChampTexte required value={formExterne.nom} onChange={(e) => setFormExterne((f) => ({ ...f, nom: e.target.value }))} />
          </Champ>
          <Champ label={t("assets.champs.type")}>
            <ChampSelect value={formExterne.type} onChange={(e) => setFormExterne((f) => ({ ...f, type: e.target.value }))}>
              {TYPE_ASSET.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`assets.types.${ty}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("assets.champs.source")}>
            <ChampSelect value={formExterne.source} onChange={(e) => setFormExterne((f) => ({ ...f, source: e.target.value }))}>
              {SOURCE_ASSET.map((s) => (
                <option key={s} value={s}>
                  {t(`assets.sources.${s}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          {formExterne.source === "ugc" && (
            <Champ label={t("assets.champs.droits")}>
              <ChampTexte required value={formExterne.droits} onChange={(e) => setFormExterne((f) => ({ ...f, droits: e.target.value }))} />
            </Champ>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueExterne(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>

      <Dialog ouvert={!!detail} onFermer={() => setDetail(null)} titre={detail?.asset.nom ?? ""}>
        {detail && (
          <div>
            {(detail.asset.type === "photo" || detail.asset.type === "ugc") && <img src={detail.asset.fichier_url} alt={detail.asset.nom} className="mb-3 max-h-60 w-full rounded-field object-contain" />}
            <p className="mb-1 text-sm text-off">
              <span className="text-dim">{t("assets.champs.type")}:</span> {t(`assets.types.${detail.asset.type}`)}
            </p>
            <p className="mb-1 text-sm text-off">
              <span className="text-dim">{t("assets.champs.source")}:</span> {t(`assets.sources.${detail.asset.source}`)}
            </p>
            {detail.asset.tags.length > 0 && (
              <p className="mb-1 text-sm text-off">
                <span className="text-dim">{t("assets.champs.tags")}:</span> {detail.asset.tags.join(", ")}
              </p>
            )}
            <p className="mb-3 text-sm text-off">
              <span className="text-dim">{t("assets.champs.droits")}:</span> {detail.asset.droits ?? <span className="text-danger-fg">{t("contenus.droits_manquants")}</span>}
            </p>
            <div className="mb-2">
              <p className="mb-1 text-xs font-medium text-dim">{t("assets.utilise_dans")}</p>
              {detail.liens.utilise_dans.length === 0 ? (
                <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>
              ) : (
                <ul className="text-sm text-off">
                  {detail.liens.utilise_dans.map((u) => (
                    <li key={u.entite_id}>
                      {u.titre} ({u.entite_type})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-dim">{t("assets.vient_de")}</p>
              <p className="text-sm text-off">{detail.liens.vient_de ? detail.liens.vient_de.titre : "—"}</p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
