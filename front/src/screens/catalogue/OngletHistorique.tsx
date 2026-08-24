import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { clientArticles } from "../../lib/resources/catalogue.js";

interface EntreeHistorique {
  id: string;
  de: string | null;
  vers: string;
  at: string;
  par: string;
}

export function OngletHistorique({ articleId }: { articleId: string }) {
  const { t } = useTranslation();
  const [lignes, setLignes] = useState<EntreeHistorique[] | null>(null);

  useEffect(() => {
    clientArticles.historique(articleId).then((l) => setLignes(l as EntreeHistorique[]));
  }, [articleId]);

  if (!lignes) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  return (
    <ul className="divide-y divide-line rounded-card border border-line">
      {lignes
        .slice()
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((ligne) => (
          <li key={ligne.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-off">
              {ligne.de ? t(`catalogue.statuts.${ligne.de}`) : "—"} → {t(`catalogue.statuts.${ligne.vers}`)}
            </span>
            <span className="text-xs text-dim">{new Date(ligne.at).toLocaleString()}</span>
          </li>
        ))}
    </ul>
  );
}
