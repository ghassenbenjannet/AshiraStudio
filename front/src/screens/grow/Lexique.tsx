import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { aCapacite, type Expression, type Registre } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientExpressions } from "../../lib/resources/grow.js";
import { clientRegistres } from "../../lib/resources/referentiels.js";

const COULEUR_STATUT: Record<string, string> = { validee: "text-olive", interdite: "text-danger-fg", a_valider: "text-sable" };

export function Lexique() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutValider = !!utilisateur && aCapacite(utilisateur.role_systeme, "approbation.gerer");

  const [liste, setListe] = useState<Expression[] | null>(null);
  const [registres, setRegistres] = useState<Registre[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState({ texte: "", transliteration: "", registre_id: "", contexte_usage: "" });

  const charger = () => clientExpressions.lister().then(setListe);
  useEffect(() => {
    charger();
    clientRegistres.lister().then(setRegistres);
  }, []);

  const enAttente = liste?.filter((e) => e.statut === "a_valider").length ?? 0;

  async function proposer() {
    try {
      await clientExpressions.proposer({ texte: form.texte, transliteration: form.transliteration || null, registre_id: form.registre_id, contexte_usage: form.contexte_usage || null });
      setDialogueOuvert(false);
      setForm({ texte: "", transliteration: "", registre_id: "", contexte_usage: "" });
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function valider(id: string, statut: "validee" | "interdite") {
    try {
      const modifiee = await clientExpressions.valider(id, statut);
      setListe((l) => l?.map((e) => (e.id === id ? modifiee : e)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        {enAttente > 0 ? <span className="text-sm text-sable">{t("grow.lexique.en_attente", { n: enAttente })}</span> : <span />}
        <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
          {t("grow.lexique.proposer")}
        </BoutonPrimaire>
      </div>
      {!liste && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      <ul className="flex flex-col gap-1">
        {liste?.map((expr) => (
          <li key={expr.id} className="flex items-center justify-between gap-2 rounded-card border border-line bg-panel px-3 py-2 text-sm">
            <span>
              <span className="text-off">{expr.texte}</span>
              {expr.contexte_usage && <span className="ms-2 text-xs text-dim">{expr.contexte_usage}</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className={`text-xs font-medium ${COULEUR_STATUT[expr.statut]}`}>{t(`grow.lexique.statuts.${expr.statut}`)}</span>
              {peutValider && expr.statut === "a_valider" && (
                <>
                  <BoutonSecondaire type="button" onClick={() => void valider(expr.id, "validee")} className="!min-h-8 px-2 text-xs">
                    {t("grow.lexique.valider")}
                  </BoutonSecondaire>
                  <BoutonSecondaire type="button" onClick={() => void valider(expr.id, "interdite")} className="!min-h-8 px-2 text-xs">
                    {t("grow.lexique.interdire")}
                  </BoutonSecondaire>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("grow.lexique.proposer")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void proposer();
          }}
        >
          <Champ label={t("grow.lexique.champs.texte")}>
            <ChampTexte required value={form.texte} onChange={(e) => setForm((f) => ({ ...f, texte: e.target.value }))} />
          </Champ>
          <Champ label={t("grow.lexique.champs.transliteration")}>
            <ChampTexte value={form.transliteration} onChange={(e) => setForm((f) => ({ ...f, transliteration: e.target.value }))} />
          </Champ>
          <Champ label={t("grow.lexique.champs.registre")}>
            <ChampSelect required value={form.registre_id} onChange={(e) => setForm((f) => ({ ...f, registre_id: e.target.value }))}>
              <option value="" disabled>
                —
              </option>
              {registres.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("grow.lexique.champs.contexte")}>
            <ChampTexte value={form.contexte_usage} onChange={(e) => setForm((f) => ({ ...f, contexte_usage: e.target.value }))} />
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
