import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OBJECTIF_CAMPAGNE, aCapacite, type Board, type BoardItem, type TypeCampagne } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientBoards } from "../../lib/resources/boards.js";
import { clientTypesCampagne } from "../../lib/resources/referentiels.js";

const COULEURS = ["#c9a876", "#5c6146", "#f2ede1", "#15140f"];

/** E17 — Board brainstorm. Canvas simplifié : positionnement libre au pointeur, sans pan/zoom
 * (limitation assumée — cf. DECISIONS.md Phase ④), parité de contenu conservée (liste = même items). */
export function BoardCanvas() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [board, setBoard] = useState<Board | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ itemId: string; offsetX: number; offsetY: number } | null>(null);

  const [dialogueNote, setDialogueNote] = useState(false);
  const [texteNote, setTexteNote] = useState("");
  const [dialogueLien, setDialogueLien] = useState(false);
  const [urlLien, setUrlLien] = useState("");

  const [dialogueTransformer, setDialogueTransformer] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<TypeCampagne[]>([]);
  const [formTransformer, setFormTransformer] = useState({ nom: "", type_campagne_id: "", date_debut: "", date_fin: "", objectif: "lancement" as (typeof OBJECTIF_CAMPAGNE)[number] });

  const charger = () => {
    if (!id) return;
    clientBoards.obtenir(id).then(setBoard);
  };
  useEffect(charger, [id]);
  useEffect(() => {
    if (dialogueTransformer) clientTypesCampagne.lister().then(setTypes);
  }, [dialogueTransformer]);

  if (!board) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  async function ajouterItem(item: Omit<BoardItem, "id">) {
    if (!id) return;
    try {
      const modifie = await clientBoards.ajouterItem(id, item);
      setBoard(modifie);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function supprimerItem(itemId: string) {
    if (!id) return;
    const modifie = await clientBoards.supprimerItem(id, itemId);
    setBoard(modifie);
  }

  function surPointerDown(e: React.PointerEvent, item: BoardItem) {
    if (!peutEditer) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    drag.current = { itemId: item.id, offsetX: e.clientX - rect.left - item.position.x, offsetY: e.clientY - rect.top - item.position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function surPointerMove(e: React.PointerEvent) {
    if (!drag.current || !board) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - drag.current.offsetX);
    const y = Math.max(0, e.clientY - rect.top - drag.current.offsetY);
    setBoard((b) => (b ? { ...b, items: b.items.map((it) => (it.id === drag.current!.itemId ? { ...it, position: { x, y } } : it)) } : b));
  }

  async function surPointerUp() {
    if (!drag.current || !id || !board) {
      drag.current = null;
      return;
    }
    const itemId = drag.current.itemId;
    drag.current = null;
    const item = board.items.find((it) => it.id === itemId);
    if (item) await clientBoards.modifierItem(id, itemId, { position: item.position });
  }

  function toggleSelection(itemId: string) {
    setSelection((s) => {
      const copie = new Set(s);
      if (copie.has(itemId)) copie.delete(itemId);
      else copie.add(itemId);
      return copie;
    });
  }

  async function transformer() {
    if (!id) return;
    try {
      const campagne = await clientBoards.transformerEnCampagne(id, { item_ids: [...selection], ...formTransformer });
      toaster(t("boards.transformee"));
      setDialogueTransformer(false);
      navigate(`/plan/campagnes/${campagne.id}`);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-off">{board.nom}</h1>
        <div className="flex flex-wrap gap-2">
          {peutEditer && (
            <>
              <BoutonSecondaire type="button" onClick={() => setDialogueNote(true)}>
                {t("boards.ajouter_note")}
              </BoutonSecondaire>
              <BoutonSecondaire type="button" onClick={() => setDialogueLien(true)}>
                {t("boards.ajouter_lien")}
              </BoutonSecondaire>
            </>
          )}
          {peutEditer && board.items.length > 0 && (
            <BoutonPrimaire type="button" onClick={() => setDialogueTransformer(true)}>
              {t("boards.transformer")}
            </BoutonPrimaire>
          )}
        </div>
      </div>

      {board.items.length === 0 ? (
        <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>
      ) : (
        <div
          ref={canvasRef}
          onPointerMove={surPointerMove}
          onPointerUp={() => void surPointerUp()}
          className="relative min-h-[500px] overflow-auto rounded-card border border-line bg-panel2/40"
          style={{ touchAction: "none" }}
        >
          {board.items.map((item) => (
            <div
              key={item.id}
              onPointerDown={(e) => surPointerDown(e, item)}
              style={{ left: item.position.x, top: item.position.y, backgroundColor: item.couleur ?? undefined }}
              className="absolute w-48 cursor-move select-none rounded-field border border-line bg-panel p-2 text-sm text-off shadow-sm"
            >
              {peutEditer && (
                <div className="mb-1 flex items-center justify-between gap-1">
                  <input type="checkbox" checked={selection.has(item.id)} onChange={(e) => { e.stopPropagation(); toggleSelection(item.id); }} onPointerDown={(e) => e.stopPropagation()} />
                  <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => void supprimerItem(item.id)} className="text-dim hover:text-off">
                    ×
                  </button>
                </div>
              )}
              {item.type === "note" && <p className="whitespace-pre-wrap">{item.contenu}</p>}
              {item.type === "lien" && (
                <a href={item.contenu} target="_blank" rel="noreferrer" className="break-all text-sable underline" onPointerDown={(e) => e.stopPropagation()}>
                  {item.contenu}
                </a>
              )}
              {(item.type === "image" || item.type === "asset_ref") && <p className="break-all text-xs text-dim">{t("boards.asset_id")}: {item.contenu}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog ouvert={dialogueNote} onFermer={() => setDialogueNote(false)} titre={t("boards.ajouter_note")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ajouterItem({ type: "note", contenu: texteNote, position: { x: 40, y: 40 }, couleur: COULEURS[0] });
            setDialogueNote(false);
            setTexteNote("");
          }}
        >
          <Champ label={t("boards.champs.texte")}>
            <ChampZoneTexte required rows={4} value={texteNote} onChange={(e) => setTexteNote(e.target.value)} />
          </Champ>
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueNote(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>

      <Dialog ouvert={dialogueLien} onFermer={() => setDialogueLien(false)} titre={t("boards.ajouter_lien")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ajouterItem({ type: "lien", contenu: urlLien, position: { x: 40, y: 40 } });
            setDialogueLien(false);
            setUrlLien("");
          }}
        >
          <Champ label={t("boards.champs.url")}>
            <ChampTexte required type="url" value={urlLien} onChange={(e) => setUrlLien(e.target.value)} />
          </Champ>
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueLien(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>

      <Dialog ouvert={dialogueTransformer} onFermer={() => setDialogueTransformer(false)} titre={t("boards.transformer")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void transformer();
          }}
        >
          <p className="mb-3 text-sm text-dim">{t("boards.transformer_note", { n: selection.size })}</p>
          <Champ label={t("campagnes.champs.nom")}>
            <ChampTexte required value={formTransformer.nom} onChange={(e) => setFormTransformer((f) => ({ ...f, nom: e.target.value }))} />
          </Champ>
          <Champ label={t("campagnes.champs.type_campagne")}>
            <ChampSelect required value={formTransformer.type_campagne_id} onChange={(e) => setFormTransformer((f) => ({ ...f, type_campagne_id: e.target.value }))}>
              <option value="" disabled>
                —
              </option>
              {types.map((ty) => (
                <option key={ty.id} value={ty.id}>
                  {ty.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <div className="grid gap-x-4 md:grid-cols-2">
            <Champ label={t("campagnes.champs.date_debut")}>
              <ChampTexte type="date" required value={formTransformer.date_debut} onChange={(e) => setFormTransformer((f) => ({ ...f, date_debut: e.target.value }))} />
            </Champ>
            <Champ label={t("campagnes.champs.date_fin")}>
              <ChampTexte type="date" required value={formTransformer.date_fin} onChange={(e) => setFormTransformer((f) => ({ ...f, date_fin: e.target.value }))} />
            </Champ>
          </div>
          <Champ label={t("campagnes.champs.objectif")}>
            <ChampSelect value={formTransformer.objectif} onChange={(e) => setFormTransformer((f) => ({ ...f, objectif: e.target.value as (typeof OBJECTIF_CAMPAGNE)[number] }))}>
              {OBJECTIF_CAMPAGNE.map((o) => (
                <option key={o} value={o}>
                  {t(`campagnes.objectifs.${o}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueTransformer(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit" disabled={selection.size === 0}>
              {t("boards.transformer")}
            </BoutonPrimaire>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
