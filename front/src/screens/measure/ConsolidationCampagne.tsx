import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Campagne } from "@achirah/shared";
import { ChampSelect } from "../../components/ui/Champ.js";
import { clientCampagnes, type Consolidation } from "../../lib/resources/campagnes.js";

function LigneChiffre({ label, chiffre, unite }: { label: string; chiffre: { valeur: number | null; methode: string }; unite?: string }) {
  return (
    <div className="flex items-center justify-between rounded-field border border-line px-3 py-2 text-sm">
      <span className="text-dim">{label}</span>
      <span className="text-off">
        {chiffre.valeur === null ? "—" : `${chiffre.valeur}${unite ?? ""}`}
        <span className="ms-2 text-xs text-dim">({chiffre.methode})</span>
      </span>
    </div>
  );
}

export function ConsolidationCampagne({ campagnes }: { campagnes: Campagne[] }) {
  const { t } = useTranslation();
  const [campagneId, setCampagneId] = useState(campagnes[0]?.id ?? "");
  const [donnees, setDonnees] = useState<Consolidation | null>(null);

  useEffect(() => {
    if (!campagneId && campagnes[0]) setCampagneId(campagnes[0].id);
  }, [campagnes, campagneId]);

  useEffect(() => {
    if (campagneId) clientCampagnes.consolidation(campagneId).then(setDonnees);
  }, [campagneId]);

  return (
    <div>
      <div className="mb-4 w-64">
        <ChampSelect value={campagneId} onChange={(e) => setCampagneId(e.target.value)}>
          {campagnes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </ChampSelect>
      </div>
      {!donnees && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {donnees && (
        <div className="flex flex-col gap-2">
          <LigneChiffre label={t("mesure.consolidation.budget_reel")} chiffre={{ valeur: donnees.budget.reel, methode: donnees.budget.methode }} unite=" DT" />
          <LigneChiffre label={t("mesure.consolidation.reach_cumule")} chiffre={donnees.reach_cumule} />
          <LigneChiffre label={t("mesure.consolidation.contenus_publies")} chiffre={donnees.contenus_publies} />
          <LigneChiffre label={t("mesure.consolidation.sessions")} chiffre={donnees.sessions_attribuees} />
          <LigneChiffre label={t("mesure.consolidation.commandes")} chiffre={donnees.commandes_attribuees} />
          <LigneChiffre label={t("mesure.consolidation.ca")} chiffre={donnees.ca_attribue} unite=" DT" />
          <LigneChiffre label={t("mesure.consolidation.roas")} chiffre={donnees.roas} />
        </div>
      )}
    </div>
  );
}
