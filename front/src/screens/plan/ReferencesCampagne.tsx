import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CampagneArticle } from "@achirah/shared";
import { ChampTexte, BoutonSecondaire } from "../../components/ui/Champ.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";

/** Champ d'ajout intelligent (§4.3) : URL Achirah / texte / photo, discriminé côté serveur. */
export function ReferencesCampagne({ campagneId, peutEditer }: { campagneId: string; peutEditer: boolean }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [references, setReferences] = useState<CampagneArticle[] | null>(null);
  const [saisie, setSaisie] = useState("");

  const charger = () => clientCampagnes.listerArticles(campagneId).then(setReferences);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campagneId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const valeur = saisie.trim();
    if (!valeur) return;
    try {
      if (/^https?:\/\//i.test(valeur)) {
        await clientCampagnes.ajouterArticle(campagneId, { mode: "lien", url: valeur });
      } else {
        await clientCampagnes.ajouterArticle(campagneId, { mode: "texte", texte: valeur });
      }
      setSaisie("");
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-medium text-dim">{t("campagnes.champ_intelligent.titre")}</h3>
      {peutEditer && (
        <form onSubmit={ajouter} className="mb-3 flex gap-2">
          <ChampTexte value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={t("campagnes.champ_intelligent.url_placeholder")} />
          <BoutonSecondaire type="submit">{t("referentiels.ajouter")}</BoutonSecondaire>
        </form>
      )}
      <ul className="flex flex-wrap gap-2">
        {references?.map((r) => (
          <li key={r.id} className="rounded-field border border-line bg-panel2 px-2 py-1 text-xs text-off">
            {r.source === "lien" && (r.titre_extrait ?? r.url)}
            {r.source === "texte" && r.texte}
            {r.source === "catalogue" && r.article_coloris_id}
            {r.source === "photo" && "📷"}
            <span className="ms-1 text-dim">· {t(`campagnes.champ_intelligent.${r.source}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
