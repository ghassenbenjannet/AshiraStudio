import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BudgetLigne, ListeSimple } from "@achirah/shared";
import { aCapacite } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampNombre, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { clientPostesBudgetaires } from "../../lib/resources/referentiels.js";

function Barre({ prevu, engage, reel }: { prevu: number; engage: number; reel: number }) {
  const max = Math.max(prevu, engage, reel, 1);
  return (
    <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-panel2">
      <div className="h-full bg-sable" style={{ width: `${Math.min(100, (reel / max) * 100)}%` }} />
    </div>
  );
}

export function OngletBudget({ campagneId }: { campagneId: string }) {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutVoirMontants = !!utilisateur && aCapacite(utilisateur.role_systeme, "montants.voir");
  const peutGerer = !!utilisateur && aCapacite(utilisateur.role_systeme, "parametres.gerer");

  const [lignes, setLignes] = useState<BudgetLigne[] | null>(null);
  const [postes, setPostes] = useState<ListeSimple[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState({ poste_id: "", libelle: "", prevu_dt: "0", engage_dt: "0", reel_dt: "0" });

  const charger = () => clientCampagnes.listerBudget(campagneId).then(setLignes);
  useEffect(() => {
    charger();
    clientPostesBudgetaires.lister().then(setPostes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campagneId]);

  if (!peutVoirMontants) return <p className="text-sm text-dim">{t("commun.erreur_generique")}</p>;

  const totaux = (lignes ?? []).reduce(
    (acc, l) => ({ prevu: acc.prevu + l.prevu_dt, engage: acc.engage + l.engage_dt, reel: acc.reel + l.reel_dt }),
    { prevu: 0, engage: 0, reel: 0 },
  );
  const depassement = totaux.reel > totaux.prevu && totaux.prevu > 0;

  async function ajouter() {
    try {
      await clientCampagnes.ajouterBudget(campagneId, {
        poste_id: form.poste_id,
        libelle: form.libelle,
        prevu_dt: Number(form.prevu_dt),
        engage_dt: Number(form.engage_dt),
        reel_dt: Number(form.reel_dt),
      });
      setDialogueOuvert(false);
      setForm({ poste_id: "", libelle: "", prevu_dt: "0", engage_dt: "0", reel_dt: "0" });
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-card border border-line bg-panel p-3">
        <Barre {...totaux} />
        <p className="text-sm text-dim">
          {t("campagnes.budget.prevu")}: {totaux.prevu} DT · {t("campagnes.budget.engage")}: {totaux.engage} DT · {t("campagnes.budget.reel")}: {totaux.reel} DT
        </p>
        {depassement && <p className="mt-1 text-sm text-sable">{t("campagnes.budget.depassement")}</p>}
      </div>

      {peutGerer && (
        <div className="mb-3 flex justify-end">
          <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
            {t("campagnes.budget.ajouter")}
          </BoutonPrimaire>
        </div>
      )}

      {!lignes && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {lignes && lignes.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-dim">
              <th className="px-2 py-1 text-start">{t("campagnes.budget.libelle")}</th>
              <th className="px-2 py-1 text-start">{t("campagnes.budget.prevu")}</th>
              <th className="px-2 py-1 text-start">{t("campagnes.budget.engage")}</th>
              <th className="px-2 py-1 text-start">{t("campagnes.budget.reel")}</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0">
                <td className="px-2 py-1 text-off">{l.libelle}</td>
                <td className="px-2 py-1 text-off">{l.prevu_dt}</td>
                <td className="px-2 py-1 text-off">{l.engage_dt}</td>
                <td className="px-2 py-1 text-off">{l.reel_dt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("campagnes.budget.ajouter")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ajouter();
          }}
        >
          <Champ label={t("campagnes.budget.poste")}>
            <ChampSelect required value={form.poste_id} onChange={(e) => setForm((f) => ({ ...f, poste_id: e.target.value }))}>
              <option value="" disabled>
                —
              </option>
              {postes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("campagnes.budget.libelle")}>
            <ChampTexte required value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
          </Champ>
          <div className="grid grid-cols-3 gap-2">
            <Champ label={t("campagnes.budget.prevu")}>
              <ChampNombre value={form.prevu_dt} onChange={(e) => setForm((f) => ({ ...f, prevu_dt: e.target.value }))} />
            </Champ>
            <Champ label={t("campagnes.budget.engage")}>
              <ChampNombre value={form.engage_dt} onChange={(e) => setForm((f) => ({ ...f, engage_dt: e.target.value }))} />
            </Champ>
            <Champ label={t("campagnes.budget.reel")}>
              <ChampNombre value={form.reel_dt} onChange={(e) => setForm((f) => ({ ...f, reel_dt: e.target.value }))} />
            </Champ>
          </div>
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
