import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Asset } from "@achirah/shared";
import { clientAssets } from "../../lib/resources/assets.js";

/** Vue filtrée en lecture de l'onglet Assets de la campagne — la gestion complète se fait depuis Créer. */
export function OngletAssetsCampagne({ campagneId }: { campagneId: string }) {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Asset[] | null>(null);

  useEffect(() => {
    clientAssets.lister({ campagne_id: campagneId }).then(setAssets);
  }, [campagneId]);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Link to="/create" className="text-sm text-dim underline hover:text-off">
          {t("campagnes.gerer_dans_creer")}
        </Link>
      </div>
      {!assets && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {assets && assets.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {assets?.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-field border border-line bg-panel">
            <div className="flex aspect-square items-center justify-center bg-panel2">
              {a.type === "photo" || a.type === "ugc" ? <img src={a.fichier_url} alt={a.nom} className="h-full w-full object-cover" /> : <span className="text-dim">{a.type === "video" ? "🎬" : "📄"}</span>}
            </div>
            <p className="truncate px-1 py-1 text-[11px] text-dim">{a.nom}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
