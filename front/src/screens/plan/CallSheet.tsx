import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HEURE_LUMIERE, type Personne } from "@achirah/shared";
import { Champ, ChampSelect, ChampNombre } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientTaches, clientShootings } from "../../lib/resources/taches.js";
import { clientPersonnes } from "../../lib/resources/contacts.js";
import { clientArticleSkus } from "../../lib/resources/catalogue.js";
import { LooksComposer } from "./LooksComposer.js";
import { ShotList } from "./ShotList.js";

const CLE_MANQUE_TRAD: Record<string, string> = { pieces: "pieces", photographe: "photographe", poses: "poses", date: "date", lieu: "lieu" };

export function CallSheet({ tacheId, peutEditer }: { tacheId: string; peutEditer: boolean }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [shooting, setShooting] = useState<Awaited<ReturnType<typeof clientTaches.obtenirShooting>> | null>(null);
  const [photographes, setPhotographes] = useState<Personne[]>([]);
  const [modeles, setModeles] = useState<Personne[]>([]);
  const [skusParId, setSkusParId] = useState<Map<string, string>>(new Map());

  const charger = () =>
    clientTaches.obtenirShooting(tacheId).then(async (s) => {
      setShooting(s);
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

  async function basculerMateriel(index: number) {
    if (!shooting) return;
    const materiel = shooting.materiel.map((m, i) => (i === index ? { ...m, coche: !m.coche } : m));
    await majShooting({ materiel });
  }

  if (!shooting) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  return (
    <div className="rounded-card border border-line bg-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-off">{t("callsheet.titre")}</h2>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-sm ${shooting.pret_a_tourner.pret ? "text-olive" : "text-sable"}`}>
            <span className={`h-2 w-2 rounded-full ${shooting.pret_a_tourner.pret ? "bg-olive" : "bg-sable"}`} />
            {t("callsheet.pret_a_tourner")}
            {!shooting.pret_a_tourner.pret && ` (${shooting.pret_a_tourner.manques.map((m) => t(`callsheet.manques.${CLE_MANQUE_TRAD[m] ?? m}`)).join(", ")})`}
          </span>
          <a href={clientShootings.callsheetUrl(tacheId)} target="_blank" rel="noreferrer" className="min-h-tap flex items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
            {t("callsheet.generer_pdf")}
          </a>
        </div>
      </div>

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

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-medium text-dim">{t("callsheet.pieces_a_apporter")}</h3>
        {shooting.pieces_effectives.length === 0 ? (
          <p className="text-sm text-dim">—</p>
        ) : (
          <ul className="list-inside list-disc text-sm text-off">
            {shooting.pieces_effectives.map((p) => (
              <li key={p.article_sku_id}>{skusParId.get(p.article_sku_id) ?? p.article_sku_id}</li>
            ))}
          </ul>
        )}
      </div>

      {shooting.materiel.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-dim">Matériel</h3>
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
        </div>
      )}

      <LooksComposer shootingId={tacheId} peutEditer={peutEditer} onChange={charger} />
      <ShotList shootingId={tacheId} peutEditer={peutEditer} onChange={charger} />

      <Champ label={t("callsheet.notes")}>
        <textarea
          disabled={!peutEditer}
          defaultValue={shooting.notes ?? ""}
          onBlur={(e) => void majShooting({ notes: e.target.value || null })}
          className="min-h-tap w-full rounded-field border border-line bg-panel2 px-3 py-2 text-off"
        />
      </Champ>
    </div>
  );
}
