import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { tacheEnRetard, type Tache } from "@achirah/shared";
import { clientTaches } from "../../lib/resources/taches.js";

export function OngletTachesCampagne({ campagneId }: { campagneId: string }) {
  const { t } = useTranslation();
  const [taches, setTaches] = useState<Tache[] | null>(null);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    clientTaches.lister({ campagne_id: campagneId }).then(setTaches);
  }, [campagneId]);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Link to={`/plan/taches?campagne_id=${campagneId}`} className="text-xs text-dim underline hover:text-off">
          {t("taches.voir_board")}
        </Link>
      </div>
      {!taches && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {taches && taches.length === 0 && <p className="text-sm text-dim">{t("aujourdhui.aucune_tache")}</p>}
      {taches && taches.length > 0 && (
        <ul className="divide-y divide-line rounded-card border border-line">
          {taches
            .slice()
            .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance))
            .map((tache) => (
              <li key={tache.id}>
                <Link to={`/plan/taches/${tache.id}`} className="flex min-h-tap items-center justify-between gap-3 px-4 py-3 hover:bg-panel2">
                  <span className="text-sm text-off">{tache.titre}</span>
                  <span className={`text-xs ${tacheEnRetard(tache, aujourdhui) ? "text-danger-fg" : "text-dim"}`}>
                    {tache.statut === "fait" ? "✓ " : ""}
                    {tache.date_echeance}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
