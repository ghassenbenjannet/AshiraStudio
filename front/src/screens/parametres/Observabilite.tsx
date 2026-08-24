import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { clientObservabilite, type StatutObservabilite } from "../../lib/resources/systeme.js";

function formaterDuree(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function formaterOctets(octets: number | null): string {
  if (octets === null) return "—";
  return octets < 1024 * 1024 ? `${Math.round(octets / 1024)} Ko` : `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function LigneStatut({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex items-center justify-between rounded-field border border-line px-3 py-2 text-sm">
      <span className="text-dim">{label}</span>
      <span className="text-off">{valeur}</span>
    </div>
  );
}

export function Observabilite() {
  const { t } = useTranslation();
  const [statut, setStatut] = useState<StatutObservabilite | null>(null);

  useEffect(() => {
    clientObservabilite.statut().then(setStatut);
  }, []);

  if (!statut) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  return (
    <div className="flex flex-col gap-2">
      <LigneStatut label={t("observabilite.uptime")} valeur={formaterDuree(statut.uptime_secondes)} />
      <LigneStatut label={t("observabilite.taille_db")} valeur={formaterOctets(statut.taille_db_octets)} />
      <LigneStatut label={t("observabilite.derniere_sauvegarde")} valeur={statut.derniere_sauvegarde ? new Date(statut.derniere_sauvegarde.at).toLocaleString() : t("observabilite.aucune")} />
      <LigneStatut label={t("observabilite.tokens_ia")} valeur={`${statut.tokens_ia_aujourdhui.toLocaleString()} / ${statut.budget_tokens_jour.toLocaleString()}`} />
      <LigneStatut label={t("observabilite.ia_configuree")} valeur={statut.ia_configuree ? t("commun.oui") : t("commun.non")} />
      <LigneStatut label={t("observabilite.audits_aujourdhui")} valeur={String(statut.audits_aujourdhui)} />

      {statut.integrations.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-sm text-dim">{t("observabilite.integrations")}</p>
          <div className="flex flex-col gap-1">
            {statut.integrations.map((i) => (
              <LigneStatut key={i.plateforme} label={i.plateforme} valeur={t(`mesure.integrations.statuts.${i.statut}`)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
