import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HEURE_LUMIERE, SORT_RETOUR_PIECE, STATUT_POST_PROD, type Personne } from "@achirah/shared";
import { Champ, ChampSelect, ChampNombre, ChampTexte, BoutonSecondaire } from "../../components/ui/Champ.js";
import { ProchaineEtape } from "../../components/ui/ProchaineEtape.js";
import { SectionRepliable } from "../../components/ui/SectionRepliable.js";
import type { EtatCompletude } from "../../components/ui/EtatCompletude.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientTaches, clientShootings, type BriefShooting } from "../../lib/resources/taches.js";
import { clientPersonnes } from "../../lib/resources/contacts.js";
import { clientArticleSkus } from "../../lib/resources/catalogue.js";
import { LooksComposer } from "./LooksComposer.js";
import { ShotList } from "./ShotList.js";
import { CommentairesPanel } from "../../components/collaboration/CommentairesPanel.js";

const CLE_MANQUE_TRAD: Record<string, string> = { pieces: "pieces", photographe: "photographe", poses: "poses", date: "date", lieu: "lieu" };

const AUJOURDHUI = () => new Date().toISOString().slice(0, 10);

export function CallSheet({
  tacheId,
  campagneId,
  dateEcheance,
  peutEditer,
}: {
  tacheId: string;
  campagneId: string | null;
  dateEcheance: string;
  peutEditer: boolean;
}) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [shooting, setShooting] = useState<Awaited<ReturnType<typeof clientTaches.obtenirShooting>> | null>(null);
  const [photographes, setPhotographes] = useState<Personne[]>([]);
  const [modeles, setModeles] = useState<Personne[]>([]);
  const [skusParId, setSkusParId] = useState<Map<string, string>>(new Map());
  const [brief, setBrief] = useState<BriefShooting | null>(null);
  const [briefEnCours, setBriefEnCours] = useState(false);
  const [erreurBrief, setErreurBrief] = useState<string | null>(null);
  // §CR-02 B — la liste des looks de ShotList doit se rafraîchir quand LooksComposer en crée un,
  // pas seulement à son propre montage : ce compteur, bumpé à chaque `charger()`, force ShotList à
  // refaire son fetch (sinon le sélecteur « Lier à un look » reste figé sur l'état du montage).
  const [looksVersion, setLooksVersion] = useState(0);

  const charger = () =>
    clientTaches.obtenirShooting(tacheId).then(async (s) => {
      setShooting(s);
      setLooksVersion((v) => v + 1);
      const manquants = s.pieces_effectives.filter((p) => !skusParId.has(p.article_sku_id));
      if (manquants.length > 0) {
        const details = await Promise.all(manquants.map((p) => clientArticleSkus.detail(p.article_sku_id).catch(() => null)));
        setSkusParId((carte) => {
          const suivante = new Map(carte);
          details.forEach((d) => d && suivante.set(d.sku.id, d.label));
          return suivante;
        });
      }
    });

  useEffect(() => {
    charger();
    clientPersonnes.lister({ categorie_id: undefined }).then((toutes) => {
      // Filtrage côté client par nom de catégorie (les catégories elles-mêmes viennent d'un référentiel séparé).
      setPhotographes(toutes);
      setModeles(toutes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tacheId]);

  async function majShooting(corps: Record<string, unknown>) {
    try {
      const modifie = await clientTaches.modifierShooting(tacheId, corps);
      setShooting(modifie);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function genererBrief() {
    setBriefEnCours(true);
    setErreurBrief(null);
    try {
      const resultat = await clientTaches.genererBrief(tacheId);
      setBrief(resultat);
    } catch (err) {
      setErreurBrief(err instanceof ApiError && err.status === 503 ? t("studio.ia_indisponible") : err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setBriefEnCours(false);
    }
  }

  async function basculerMateriel(index: number) {
    if (!shooting) return;
    const materiel = shooting.materiel.map((m, i) => (i === index ? { ...m, coche: !m.coche } : m));
    await majShooting({ materiel });
  }

  async function basculerPreparation(skuId: string, libelle: string) {
    if (!shooting) return;
    const existant = shooting.preparation_pieces.find((p) => p.id === skuId);
    const suivant = existant
      ? shooting.preparation_pieces.map((p) => (p.id === skuId ? { ...p, coche: !p.coche } : p))
      : [...shooting.preparation_pieces, { id: skuId, libelle, coche: true }];
    await majShooting({ preparation_pieces: suivant });
  }

  async function majRetour(skuId: string, sort: string) {
    if (!shooting) return;
    const suivant = sort
      ? [...shooting.retour_pieces.filter((r) => r.article_sku_id !== skuId), { article_sku_id: skuId, sort: sort as (typeof SORT_RETOUR_PIECE)[number] }]
      : shooting.retour_pieces.filter((r) => r.article_sku_id !== skuId);
    await majShooting({ retour_pieces: suivant });
  }

  if (!shooting) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  // CR-02 §C — bandeau « Prochaine étape » : réutilise les mêmes gates que l'ancien indicateur inline
  // (`pret_a_tourner`, RG-S3) et le nouveau champ `retours_manquants` (calculé côté serveur). Aucune
  // action : la page est un défilement unique déjà entièrement visible, pas d'onglet à rejoindre.
  const estPasse = dateEcheance < AUJOURDHUI();
  const bandeau = estPasse ? (
    shooting.retours_manquants.length > 0 ? (
      <ProchaineEtape etat={t("callsheet.prochaine_etape.etat.a_traiter")} manque={t("callsheet.prochaine_etape.manque.retours_manquants", { count: shooting.retours_manquants.length })} />
    ) : (
      <ProchaineEtape etat={t("callsheet.prochaine_etape.etat.termine")} />
    )
  ) : shooting.pret_a_tourner.pret ? (
    <ProchaineEtape etat={t("callsheet.prochaine_etape.etat.pret")} />
  ) : (
    <ProchaineEtape
      etat={t("callsheet.prochaine_etape.etat.a_preparer")}
      manque={shooting.pret_a_tourner.manques.map((m) => t(`callsheet.manques.${CLE_MANQUE_TRAD[m] ?? m}`)).join(", ")}
    />
  );

  // CR-02 §C.3 — pastilles de section + ouverture automatique sur la première incomplète. Seules les
  // sections à défilement simple (pas Looks / Shot list, qui gèrent déjà leur propre en-tête et leurs
  // actions) sont repliables ici — les envelopper aurait dupliqué leur titre pour un gain marginal.
  // « équipe » et « pièces à apporter » réutilisent directement les codes de `pret_a_tourner.manques`
  // (même gate que le bandeau, RG-S3) plutôt que de la recalculer.
  const manques = new Set(shooting.pret_a_tourner.manques);
  const etatEquipe: EtatCompletude = manques.has("photographe") ? "manquant" : shooting.photographe_id ? "complet" : "en_cours";
  const etatPieces: EtatCompletude = manques.has("pieces") ? "manquant" : "complet";
  const etatMateriel: EtatCompletude = shooting.materiel.length === 0 ? "vide" : shooting.materiel.every((m) => m.coche) ? "complet" : "en_cours";
  const etatPreparation: EtatCompletude =
    shooting.pieces_effectives.length === 0
      ? "vide"
      : shooting.pieces_effectives.every((p) => shooting.preparation_pieces.find((item) => item.id === p.article_sku_id)?.coche)
        ? "complet"
        : "en_cours";
  const etatRetours: EtatCompletude = shooting.pieces_effectives.length === 0 ? "vide" : shooting.retours_manquants.length === 0 ? "complet" : "manquant";
  const etatLivrables: EtatCompletude = shooting.statut_post_prod === "livre" ? "complet" : shooting.statut_post_prod === "a_trier" ? "vide" : "en_cours";

  const sections: { id: string; etat: EtatCompletude; rendue: boolean }[] = [
    { id: "equipe", etat: etatEquipe, rendue: true },
    { id: "pieces", etat: etatPieces, rendue: true },
    { id: "materiel", etat: etatMateriel, rendue: shooting.materiel.length > 0 },
    { id: "preparation", etat: etatPreparation, rendue: shooting.pieces_effectives.length > 0 },
    { id: "retours", etat: etatRetours, rendue: shooting.pieces_effectives.length > 0 },
    { id: "livrables", etat: etatLivrables, rendue: true },
  ];
  const premierIncomplet = sections.find((s) => s.rendue && s.etat !== "complet" && s.etat !== "vide")?.id ?? sections.find((s) => s.rendue && s.etat !== "complet")?.id;

  return (
    <div className="rounded-card border border-line bg-panel p-4">
      {/* En-tête */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-off">{t("callsheet.titre")}</h2>
        <div className="flex items-center gap-3">
          <BoutonSecondaire type="button" onClick={() => void genererBrief()} disabled={briefEnCours}>
            {t("callsheet.generer_brief")}
          </BoutonSecondaire>
          <a href={clientShootings.callsheetUrl(tacheId)} target="_blank" rel="noreferrer" className="min-h-tap flex items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
            {t("callsheet.generer_pdf")}
          </a>
        </div>
      </div>

      {bandeau}

      {erreurBrief && <p className="mb-4 text-sm text-danger-fg">{erreurBrief}</p>}
      {brief && (
        <div className="mb-4 rounded-field border border-line bg-panel2 p-3">
          <h3 className="mb-2 text-sm font-medium text-off">{t("callsheet.brief_titre")}</h3>
          <ol className="mb-3 flex flex-col gap-2">
            {brief.plans.map((p) => (
              <li key={p.ordre} className="rounded-field border border-line bg-panel p-2 text-sm">
                <p className="font-medium text-off">
                  {p.ordre + 1}. {p.mise_en_scene}
                </p>
                {p.modele && <p className="text-dim">{t("callsheet.brief_modele")} : {p.modele}</p>}
                {p.pieces.length > 0 && <p className="text-dim">{t("callsheet.brief_pieces")} : {p.pieces.join(", ")}</p>}
              </li>
            ))}
          </ol>
          <p className="text-sm text-off">
            <span className="text-dim">{t("callsheet.brief_materiel")} :</span> {brief.materiel_note}
          </p>
          {brief.points_attention && (
            <p className="mt-1 text-sm text-sable">
              <span className="text-dim">{t("callsheet.brief_attention")} :</span> {brief.points_attention}
            </p>
          )}
        </div>
      )}

      {/* Équipe */}
      <SectionRepliable titre={t("callsheet.equipe")} etat={etatEquipe} ouvertParDefaut={premierIncomplet === "equipe"}>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Champ label={t("callsheet.photographe")}>
            <ChampSelect disabled={!peutEditer} value={shooting.photographe_id ?? ""} onChange={(e) => void majShooting({ photographe_id: e.target.value || null })}>
              <option value="">—</option>
              {photographes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("callsheet.heure_lumiere")}>
            <ChampSelect disabled={!peutEditer} value={shooting.heure_lumiere ?? ""} onChange={(e) => void majShooting({ heure_lumiere: e.target.value || null })}>
              <option value="">—</option>
              {HEURE_LUMIERE.map((h) => (
                <option key={h} value={h}>
                  {t(`callsheet.heures.${h}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("callsheet.duree_min")}>
            <ChampNombre disabled={!peutEditer} value={shooting.duree_min} onChange={(e) => void majShooting({ duree_min: Number(e.target.value) })} />
          </Champ>
          <Champ label={t("callsheet.modeles")}>
            <select
              disabled={!peutEditer}
              multiple
              value={shooting.modele_ids}
              onChange={(e) => void majShooting({ modele_ids: Array.from(e.target.selectedOptions).map((o) => o.value) })}
              className="min-h-tap w-full rounded-field border border-line bg-panel2 px-3 text-off"
            >
              {modeles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
          </Champ>
        </div>
      </SectionRepliable>

      {/* Looks */}
      <LooksComposer shootingId={tacheId} campagneId={campagneId} peutEditer={peutEditer} onChange={charger} />

      {/* Pièces à apporter (agrégées, origine visible) */}
      <SectionRepliable titre={t("callsheet.pieces_a_apporter")} etat={etatPieces} ouvertParDefaut={premierIncomplet === "pieces"}>
        {shooting.pieces_effectives.length === 0 ? (
          <p className="text-sm text-dim">—</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-off">
            {shooting.pieces_effectives.map((p) => (
              <li key={p.article_sku_id} className="flex items-center gap-2">
                <span>{skusParId.get(p.article_sku_id) ?? p.article_sku_id}</span>
                {p.origine === "look" && <span className="text-xs text-dim">({t("callsheet.pieces_issues_looks")})</span>}
              </li>
            ))}
          </ul>
        )}
      </SectionRepliable>

      {/* Shot list */}
      <ShotList shootingId={tacheId} looksVersion={looksVersion} peutEditer={peutEditer} onChange={charger} />

      {/* Matériel */}
      {shooting.materiel.length > 0 && (
        <SectionRepliable titre={t("callsheet.materiel")} etat={etatMateriel} ouvertParDefaut={premierIncomplet === "materiel"}>
          <ul className="grid gap-1 md:grid-cols-2">
            {shooting.materiel.map((m, i) => (
              <li key={m.id}>
                <label className="flex min-h-tap items-center gap-2 text-sm text-off">
                  <input type="checkbox" disabled={!peutEditer} checked={m.coche} onChange={() => void basculerMateriel(i)} />
                  {m.libelle}
                </label>
              </li>
            ))}
          </ul>
        </SectionRepliable>
      )}

      {/* Préparation pièces */}
      {shooting.pieces_effectives.length > 0 && (
        <SectionRepliable titre={t("callsheet.preparation_pieces")} etat={etatPreparation} ouvertParDefaut={premierIncomplet === "preparation"}>
          <ul className="grid gap-1 md:grid-cols-2">
            {shooting.pieces_effectives.map((p) => {
              const libelle = skusParId.get(p.article_sku_id) ?? p.article_sku_id;
              const coche = shooting.preparation_pieces.find((item) => item.id === p.article_sku_id)?.coche ?? false;
              return (
                <li key={p.article_sku_id}>
                  <label className="flex min-h-tap items-center gap-2 text-sm text-off">
                    <input type="checkbox" disabled={!peutEditer} checked={coche} onChange={() => void basculerPreparation(p.article_sku_id, libelle)} />
                    {libelle}
                  </label>
                </li>
              );
            })}
          </ul>
        </SectionRepliable>
      )}

      {/* Retours */}
      {shooting.pieces_effectives.length > 0 && (
        <SectionRepliable titre={t("callsheet.retours")} etat={etatRetours} ouvertParDefaut={premierIncomplet === "retours"}>
          <ul className="flex flex-col gap-1">
            {shooting.pieces_effectives.map((p) => {
              const retour = shooting.retour_pieces.find((r) => r.article_sku_id === p.article_sku_id);
              return (
                <li key={p.article_sku_id} className="flex items-center justify-between gap-2 text-sm text-off">
                  <span className="flex-1">{skusParId.get(p.article_sku_id) ?? p.article_sku_id}</span>
                  <select
                    disabled={!peutEditer}
                    value={retour?.sort ?? ""}
                    onChange={(e) => void majRetour(p.article_sku_id, e.target.value)}
                    className="min-h-tap rounded-field border border-line bg-panel2 px-2 text-xs text-off"
                  >
                    <option value="">{t("callsheet.retour_non_rendu")}</option>
                    {SORT_RETOUR_PIECE.map((s) => (
                      <option key={s} value={s}>
                        {t(`callsheet.sorts.${s}`)}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </SectionRepliable>
      )}

      {/* Livrables / post-prod */}
      <SectionRepliable titre={t("callsheet.livrables")} etat={etatLivrables} ouvertParDefaut={premierIncomplet === "livrables"}>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Champ label={t("callsheet.statut_post_prod")}>
            <ChampSelect disabled={!peutEditer} value={shooting.statut_post_prod} onChange={(e) => void majShooting({ statut_post_prod: e.target.value })}>
              {STATUT_POST_PROD.map((s) => (
                <option key={s} value={s}>
                  {t(`callsheet.post_prod.${s}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("callsheet.nb_photos_recues")}>
            <ChampNombre disabled={!peutEditer} value={shooting.nb_photos_recues ?? ""} onChange={(e) => void majShooting({ nb_photos_recues: e.target.value ? Number(e.target.value) : null })} />
          </Champ>
          <Champ label={t("callsheet.livrable_photos")}>
            <ChampTexte
              key={`photos-${shooting.livrable_photos ?? ""}`}
              disabled={!peutEditer}
              defaultValue={shooting.livrable_photos ?? ""}
              onBlur={(e) => void majShooting({ livrable_photos: e.target.value || null })}
              placeholder="https://…"
            />
          </Champ>
          <Champ label={t("callsheet.livrable_videos")}>
            <ChampTexte
              key={`videos-${shooting.livrable_videos ?? ""}`}
              disabled={!peutEditer}
              defaultValue={shooting.livrable_videos ?? ""}
              onBlur={(e) => void majShooting({ livrable_videos: e.target.value || null })}
              placeholder="https://…"
            />
          </Champ>
        </div>
      </SectionRepliable>

      {/* Notes */}
      <Champ label={t("callsheet.notes")}>
        <textarea
          disabled={!peutEditer}
          defaultValue={shooting.notes ?? ""}
          onBlur={(e) => void majShooting({ notes: e.target.value || null })}
          className="min-h-tap w-full rounded-field border border-line bg-panel2 px-3 py-2 text-off"
        />
      </Champ>

      <div className="mt-4 rounded-card border border-line bg-panel p-4">
        <CommentairesPanel entiteType="shooting" entiteId={tacheId} />
      </div>
    </div>
  );
}
