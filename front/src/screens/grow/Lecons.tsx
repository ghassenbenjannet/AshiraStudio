import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TYPE_LECON, type Lecon } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientLecons } from "../../lib/resources/grow.js";

const SEUIL_ARCHIVAGE = 2; // RG-LC4

export function Lecons() {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [statut, setStatut] = useState<"active" | "archivee">("active");
  const [liste, setListe] = useState<Lecon[] | null>(null);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState({ type: "gagnant" as (typeof TYPE_LECON)[number], texte: "", preuve: "" });

  const charger = () => clientLecons.lister(statut).then(setListe);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut]);

  async function creer() {
    try {
      await clientLecons.creer({ type: form.type, texte: form.texte, preuve: form.preuve || null });
      setDialogueOuvert(false);
      setForm({ type: "gagnant", texte: "", preuve: "" });
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function reconfirmer(id: string) {
    try {
      const modifiee = await clientLecons.reconfirmer(id);
      setListe((l) => l?.map((x) => (x.id === id ? modifiee : x)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function archiver(id: string) {
    try {
      const modifiee = await clientLecons.modifier(id, { statut: "archivee" });
      setListe((l) => l?.filter((x) => x.id !== id) ?? null);
      void modifiee;
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-44">
          <ChampSelect value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)}>
            <option value="active">{t("grow.lecons.statuts.active")}</option>
            <option value="archivee">{t("grow.lecons.statuts.archivee")}</option>
          </ChampSelect>
        </div>
        <div className="flex-1" />
        <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
          {t("grow.lecons.ajouter")}
        </BoutonPrimaire>
      </div>

      {!liste && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {liste && liste.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-2">
        {liste?.map((lecon) => (
          <li key={lecon.id} className="rounded-card border border-line bg-panel p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-dim">{t(`grow.lecons.types.${lecon.type}`)}</span>
            </div>
            <p className="mb-1 text-sm text-off">{lecon.texte}</p>
            {lecon.preuve && <p className="text-xs text-dim">{lecon.preuve}</p>}
            {lecon.type === "perdant" && lecon.fermetures_sans_reconfirmation >= SEUIL_ARCHIVAGE && (
              <div className="mt-2 rounded-field border border-sable/40 bg-panel2 p-2 text-xs text-sable">
                {t("grow.lecons.suggestion_archivage", { n: lecon.fermetures_sans_reconfirmation })}
                <div className="mt-1 flex gap-2">
                  <BoutonSecondaire type="button" onClick={() => void reconfirmer(lecon.id)} className="!min-h-8 px-2 text-xs">
                    {t("grow.lecons.reconfirmer")}
                  </BoutonSecondaire>
                  <BoutonSecondaire type="button" onClick={() => void archiver(lecon.id)} className="!min-h-8 px-2 text-xs">
                    {t("grow.lecons.archiver")}
                  </BoutonSecondaire>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("grow.lecons.ajouter")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
        >
          <Champ label={t("grow.lecons.champs.type")}>
            <ChampSelect value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
              {TYPE_LECON.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`grow.lecons.types.${ty}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("grow.lecons.champs.texte")}>
            <ChampZoneTexte required maxLength={280} value={form.texte} onChange={(e) => setForm((f) => ({ ...f, texte: e.target.value }))} />
          </Champ>
          {form.type !== "regle_maison" && (
            <Champ label={t("grow.lecons.champs.preuve")}>
              <ChampTexte required value={form.preuve} onChange={(e) => setForm((f) => ({ ...f, preuve: e.target.value }))} />
            </Champ>
          )}
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
