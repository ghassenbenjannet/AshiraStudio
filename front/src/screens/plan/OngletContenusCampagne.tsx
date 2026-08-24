import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Contenu } from "@achirah/shared";
import { clientContenus } from "../../lib/resources/contenus.js";

const BADGE_STATUT: Record<string, string> = {
  brouillon: "text-dim",
  en_revue: "text-sable",
  approuve: "text-olive",
  planifie: "text-olive",
  publie: "text-olive",
  archive: "text-dim",
};

/** Vue filtrée en lecture de l'onglet Contenus de la campagne — la création se fait depuis Créer. */
export function OngletContenusCampagne({ campagneId }: { campagneId: string }) {
  const { t } = useTranslation();
  const [contenus, setContenus] = useState<Contenu[] | null>(null);

  useEffect(() => {
    clientContenus.lister({ campagne_id: campagneId }).then(setContenus);
  }, [campagneId]);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Link to="/create" className="text-sm text-dim underline hover:text-off">
          {t("campagnes.gerer_dans_creer")}
        </Link>
      </div>
      {!contenus && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {contenus && contenus.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-1">
        {contenus?.map((ct) => (
          <li key={ct.id}>
            <Link
              to={`/create/contenus/${ct.id}`}
              className="flex min-h-tap items-center justify-between gap-2 rounded-card border border-line bg-panel px-3 py-2 text-sm hover:border-sable"
            >
              <span>
                <span className="block text-off">{ct.titre}</span>
                <span className="text-xs text-dim">{t(`contenus.types.${ct.type}`)}</span>
              </span>
              <span className={`text-xs font-medium ${BADGE_STATUT[ct.statut]}`}>{t(`contenus.statuts.${ct.statut}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
