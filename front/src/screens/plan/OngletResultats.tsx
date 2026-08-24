import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Campagne } from "@achirah/shared";
import { Champ, ChampNombre } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";

/** CR-02 §C — saisie des résultats face aux cibles KPI (RG-ECO2 : requis avant `fermer`). Aucun
 *  nouvel endpoint : `resultats` est déjà un champ du PATCH générique de campagne. */
export function OngletResultats({ campagne, peutEditer, onChange }: { campagne: Campagne; peutEditer: boolean; onChange: () => void }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const cles = Object.keys(campagne.kpi_cibles);
  const [valeurs, setValeurs] = useState<Record<string, string>>(
    Object.fromEntries(cles.map((cle) => [cle, campagne.resultats[cle] !== undefined ? String(campagne.resultats[cle]) : ""])),
  );

  async function enregistrer(cle: string) {
    const brut = valeurs[cle];
    const valeur = brut === "" ? undefined : Number(brut);
    try {
      await clientCampagnes.modifier(campagne.id, { resultats: { ...campagne.resultats, [cle]: valeur } });
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  if (cles.length === 0) {
    return <p className="text-sm text-dim">{t("campagnes.resultats.aucune_cible")}</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-dim">{t("campagnes.resultats.description")}</p>
      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        {cles.map((cle) => (
          <Champ key={cle} label={`${cle} (${t("campagnes.resultats.cible")}: ${String(campagne.kpi_cibles[cle as keyof typeof campagne.kpi_cibles])})`}>
            <ChampNombre
              disabled={!peutEditer}
              value={valeurs[cle] ?? ""}
              onChange={(e) => setValeurs((v) => ({ ...v, [cle]: e.target.value }))}
              onBlur={() => void enregistrer(cle)}
            />
          </Champ>
        ))}
      </div>
    </div>
  );
}
