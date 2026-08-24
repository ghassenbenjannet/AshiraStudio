import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Tache, type Personne } from "@achirah/shared";
import { clientTaches } from "../../lib/resources/taches.js";
import { clientPersonnes } from "../../lib/resources/contacts.js";

/** Équipe = personnes assignées aux tâches de la campagne — pas de table dédiée, dérivé (§4.3 hub). */
export function OngletEquipe({ campagneId }: { campagneId: string }) {
  const { t } = useTranslation();
  const [personnes, setPersonnes] = useState<Personne[] | null>(null);

  useEffect(() => {
    Promise.all([clientTaches.lister({ campagne_id: campagneId }), clientPersonnes.lister({ actif: "1" })]).then(([taches, toutes]: [Tache[], Personne[]]) => {
      const ids = new Set(taches.flatMap((t) => t.assigne_ids));
      setPersonnes(toutes.filter((p) => ids.has(p.id)));
    });
  }, [campagneId]);

  if (!personnes) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;
  if (personnes.length === 0) return <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>;

  return (
    <ul className="divide-y divide-line rounded-card border border-line">
      {personnes.map((p) => (
        <li key={p.id} className="px-4 py-3 text-sm text-off">
          {p.nom}
        </li>
      ))}
    </ul>
  );
}
