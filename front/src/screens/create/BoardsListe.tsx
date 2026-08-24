import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { aCapacite, type Board, type Campagne } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientBoards } from "../../lib/resources/boards.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";

export function BoardsListe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [boards, setBoards] = useState<Board[] | null>(null);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState({ nom: "", campagne_id: "" });

  useEffect(() => {
    clientBoards.lister().then(setBoards);
    clientCampagnes.lister().then(setCampagnes);
  }, []);

  async function creer() {
    try {
      const cree = await clientBoards.creer({ nom: form.nom, campagne_id: form.campagne_id || null });
      setDialogueOuvert(false);
      setForm({ nom: "", campagne_id: "" });
      navigate(`/create/boards/${cree.id}`);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  const nomCampagne = (id: string | null | undefined) => campagnes.find((c) => c.id === id)?.nom;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {peutEditer && (
          <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
            {t("boards.nouveau")}
          </BoutonPrimaire>
        )}
      </div>

      {!boards && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {boards && boards.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-1">
        {boards?.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => navigate(`/create/boards/${b.id}`)}
              className="flex min-h-tap w-full items-center justify-between gap-2 rounded-card border border-line bg-panel px-3 py-2 text-start hover:border-sable"
            >
              <span className="text-sm text-off">{b.nom}</span>
              <span className="text-xs text-dim">
                {nomCampagne(b.campagne_id) ?? "—"} · {b.items.length} {t("boards.items")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("boards.nouveau")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
        >
          <Champ label={t("boards.champs.nom")}>
            <ChampTexte required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          </Champ>
          <Champ label={t("boards.champs.campagne")}>
            <ChampSelect value={form.campagne_id} onChange={(e) => setForm((f) => ({ ...f, campagne_id: e.target.value }))}>
              <option value="">—</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </ChampSelect>
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
