import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { STATUT_TACHE, TYPE_TACHE, tacheEnRetard, type Tache, type Campagne, type Contenu } from "@achirah/shared";
import { ChampSelect } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { clientTaches } from "../../lib/resources/taches.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { clientContenus } from "../../lib/resources/contenus.js";
import { clientPersonnes } from "../../lib/resources/contacts.js";
import { api } from "../../lib/api.js";
import { NouvelleTacheDialog } from "./NouvelleTacheDialog.js";
import { CalendrierEditorial } from "./CalendrierEditorial.js";

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function badgeJours(dateEcheance: string): string {
  const diff = Math.round((new Date(dateEcheance).getTime() - new Date(aujourdhuiIso()).getTime()) / 86400000);
  if (diff === 0) return "J";
  return diff > 0 ? `J+${diff}` : `J${diff}`;
}

function CarteTache({ tache, personnesParId, onClick }: { tache: Tache; personnesParId: Map<string, string>; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tache.id });
  const enRetard = tacheEnRetard(tache, aujourdhuiIso());
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 } : undefined}
      className={`mb-2 cursor-pointer rounded-field border bg-panel2 p-2 text-sm ${enRetard ? "border-danger-fg/50" : "border-line"} ${isDragging ? "opacity-60" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-dim">{tache.type}</span>
        <span className={`text-xs ${enRetard ? "text-danger-fg" : "text-dim"}`}>{badgeJours(tache.date_echeance)}</span>
      </div>
      <p className="text-off">{tache.titre}</p>
      {tache.assigne_ids.length > 0 && (
        <p className="mt-1 truncate text-xs text-dim">{tache.assigne_ids.map((id) => personnesParId.get(id)).filter(Boolean).join(", ")}</p>
      )}
    </div>
  );
}

function ColonneKanban({ statut, taches, personnesParId, onOuvrirTache }: { statut: (typeof STATUT_TACHE)[number]; taches: Tache[]; personnesParId: Map<string, string>; onOuvrirTache: (id: string) => void }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: statut });
  const enRetardCount = taches.filter((t) => tacheEnRetard(t, aujourdhuiIso())).length;
  return (
    <div ref={setNodeRef} className={`min-w-[240px] flex-1 rounded-card border p-2 ${isOver ? "border-sable" : "border-line"} bg-panel`}>
      <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-dim">
        {t(`taches.statuts.${statut}`)} ({taches.length}){enRetardCount > 0 && <span className="ms-1 text-danger-fg">· {enRetardCount} {t("taches.en_retard").toLowerCase()}</span>}
      </h3>
      {taches
        .slice()
        .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance))
        .map((tache) => (
          <CarteTache key={tache.id} tache={tache} personnesParId={personnesParId} onClick={() => onOuvrirTache(tache.id)} />
        ))}
    </div>
  );
}

/** E04/E18 — Board de tâches : Liste / Kanban / Calendrier, filtres partagés persistés dans l'URL (§4.6). */
export function TachesBoard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const [params, setParams] = useSearchParams();
  const [taches, setTaches] = useState<Tache[] | null>(null);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [contenusPlanifies, setContenusPlanifies] = useState<Contenu[]>([]);
  const [personnesParId, setPersonnesParId] = useState<Map<string, string>>(new Map());
  const [dialogueOuvert, setDialogueOuvert] = useState(false);

  const vue = (params.get("vue") as "liste" | "kanban" | "calendrier") ?? utilisateur?.vue_board_preferee ?? "liste";
  const filtreType = params.get("type") ?? "";
  const filtreCampagne = params.get("campagne_id") ?? "";
  const filtrePersonne = params.get("assigne_id") ?? "";

  const charger = () =>
    clientTaches
      .lister({ type: filtreType || undefined, campagne_id: filtreCampagne || undefined, assigne_id: filtrePersonne || undefined })
      .then(setTaches);

  useEffect(() => {
    charger();
    clientCampagnes.lister().then(setCampagnes);
    clientPersonnes.lister({ actif: "1" }).then((liste) => setPersonnesParId(new Map(liste.map((p) => [p.id, p.nom]))));
    // Calendrier éditorial (§4.6) : les contenus planifiés/publiés rejoignent les tâches sur la vue Calendrier.
    clientContenus.lister().then((liste) => setContenusPlanifies(liste.filter((c) => c.date_publication && (c.statut === "planifie" || c.statut === "publie"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtreType, filtreCampagne, filtrePersonne]);

  function changerVue(v: "liste" | "kanban" | "calendrier") {
    const suivant = new URLSearchParams(params);
    suivant.set("vue", v);
    setParams(suivant, { replace: true });
    void api("/utilisateurs/me", { method: "PATCH", body: { vue_board_preferee: v } }).catch(() => {});
  }

  function changerFiltre(cle: string, valeur: string) {
    const suivant = new URLSearchParams(params);
    if (valeur) suivant.set(cle, valeur);
    else suivant.delete(cle);
    setParams(suivant, { replace: true });
  }

  const campagneParId = useMemo(() => new Map(campagnes.map((c) => [c.id, c.nom])), [campagnes]);

  async function surDragEnd(event: DragEndEvent) {
    const nouveauStatut = event.over?.id as string | undefined;
    const tacheId = event.active.id as string;
    if (!nouveauStatut || !(STATUT_TACHE as readonly string[]).includes(nouveauStatut)) return;
    const tache = taches?.find((t) => t.id === tacheId);
    if (!tache || tache.statut === nouveauStatut) return;
    const avant = taches;
    setTaches((liste) => liste?.map((t) => (t.id === tacheId ? { ...t, statut: nouveauStatut as Tache["statut"] } : t)) ?? null);
    try {
      await clientTaches.modifier(tacheId, { statut: nouveauStatut as Tache["statut"] });
    } catch {
      setTaches(avant ?? null);
      toaster(t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-field border border-line p-0.5">
          {(["liste", "kanban", "calendrier"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => changerVue(v)}
              className={`min-h-tap rounded-field px-3 text-sm ${vue === v ? "bg-panel2 text-sable" : "text-dim"}`}
            >
              {t(`taches.vues.${v}`)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setDialogueOuvert(true)} className="min-h-tap rounded-field bg-sable px-4 font-medium text-bg">
          {t("taches.nouvelle")}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <ChampSelect value={filtreType} onChange={(e) => changerFiltre("type", e.target.value)} className="!w-40">
          <option value="">{t("taches.filtres.type")}</option>
          {TYPE_TACHE.map((ty) => (
            <option key={ty} value={ty}>
              {t(`taches.types.${ty}`)}
            </option>
          ))}
        </ChampSelect>
        <ChampSelect value={filtreCampagne} onChange={(e) => changerFiltre("campagne_id", e.target.value)} className="!w-48">
          <option value="">{t("taches.filtres.campagne")}</option>
          {campagnes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </ChampSelect>
        <ChampSelect value={filtrePersonne} onChange={(e) => changerFiltre("assigne_id", e.target.value)} className="!w-40">
          <option value="">{t("taches.filtres.personne")}</option>
          {Array.from(personnesParId.entries()).map(([id, nom]) => (
            <option key={id} value={id}>
              {nom}
            </option>
          ))}
        </ChampSelect>
      </div>

      {!taches && <p className="text-sm text-dim">{t("commun.chargement")}</p>}

      {taches && vue === "liste" && (
        <ul className="divide-y divide-line rounded-card border border-line">
          {taches
            .slice()
            .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance))
            .map((tache) => (
              <li key={tache.id}>
                <button
                  onClick={() => navigate(`/plan/taches/${tache.id}`)}
                  className="flex min-h-tap w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-panel2"
                >
                  <div>
                    <p className="text-sm text-off">{tache.titre}</p>
                    <p className="text-xs text-dim">
                      {t(`taches.types.${tache.type}`)} · {campagneParId.get(tache.campagne_id)}
                    </p>
                  </div>
                  <span className={`text-xs ${tacheEnRetard(tache, aujourdhuiIso()) ? "text-danger-fg" : "text-dim"}`}>
                    {tache.statut === "fait" ? "✓ " : ""}
                    {badgeJours(tache.date_echeance)}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}

      {taches && vue === "kanban" && (
        <DndContext onDragEnd={surDragEnd}>
          <div className="flex gap-3 overflow-x-auto">
            {STATUT_TACHE.map((statut) => (
              <ColonneKanban
                key={statut}
                statut={statut}
                taches={taches.filter((t) => t.statut === statut)}
                personnesParId={personnesParId}
                onOuvrirTache={(id) => navigate(`/plan/taches/${id}`)}
              />
            ))}
          </div>
        </DndContext>
      )}

      {taches && vue === "calendrier" && (
        <CalendrierEditorial
          taches={taches}
          contenus={contenusPlanifies}
          campagneParId={campagneParId}
          onOuvrirTache={(id) => navigate(`/plan/taches/${id}`)}
          onOuvrirContenu={(id) => navigate(`/create/contenus/${id}`)}
        />
      )}

      <NouvelleTacheDialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} campagnes={campagnes} onCree={charger} />
    </div>
  );
}
