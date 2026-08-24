import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Recommandation } from "@achirah/shared";
import { BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientRecommandations } from "../../lib/resources/grow.js";

const COULEUR_IMPACT: Record<string, string> = { haut: "text-danger-fg", moyen: "text-sable", bas: "text-dim" };

export function RecommandationsListe() {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [liste, setListe] = useState<Recommandation[] | null>(null);
  const [depliee, setDepliee] = useState<string | null>(null);
  const [generationEnCours, setGenerationEnCours] = useState(false);

  const charger = () => clientRecommandations.lister("nouvelle").then(setListe);
  useEffect(() => {
    charger();
  }, []);

  async function generer() {
    setGenerationEnCours(true);
    try {
      await clientRecommandations.generer();
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setGenerationEnCours(false);
    }
  }

  async function traiter(id: string, statut: "faite" | "ignoree") {
    try {
      await clientRecommandations.modifier(id, statut);
      setListe((l) => l?.filter((r) => r.id !== id) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <BoutonPrimaire type="button" onClick={() => void generer()} disabled={generationEnCours}>
          {t("grow.recommandations.generer")}
        </BoutonPrimaire>
      </div>
      {!liste && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {liste && liste.length === 0 && <p className="text-sm text-dim">{t("grow.recommandations.aucune")}</p>}
      <ul className="flex flex-col gap-2">
        {liste?.map((r) => (
          <li key={r.id} className="rounded-card border border-line bg-panel p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-off">{r.titre}</span>
              <span className={`text-xs font-medium ${COULEUR_IMPACT[r.impact]}`}>{t(`grow.recommandations.impacts.${r.impact}`)}</span>
            </div>
            <button type="button" onClick={() => setDepliee(depliee === r.id ? null : r.id)} className="mb-2 text-xs text-dim underline hover:text-off">
              {t("grow.recommandations.pourquoi")}
            </button>
            {depliee === r.id && (
              <div className="mb-2 rounded-field border border-line bg-panel2 p-2 text-xs text-off">
                <p className="mb-1">{r.justification}</p>
                {r.source_donnees.map((s, i) => (
                  <p key={i} className="text-dim">
                    {s.libelle} : {s.valeur} ({s.date})
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <BoutonSecondaire type="button" onClick={() => void traiter(r.id, "faite")}>
                {t("grow.recommandations.faite")}
              </BoutonSecondaire>
              <BoutonSecondaire type="button" onClick={() => void traiter(r.id, "ignoree")}>
                {t("grow.recommandations.ignorer")}
              </BoutonSecondaire>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
