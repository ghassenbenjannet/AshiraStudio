import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { pastilleMarge, MARGE_SEUIL_ORANGE_DEFAUT, MARGE_SEUIL_VERT_DEFAUT, type Article, type ArticleCout } from "@achirah/shared";
import { Champ, ChampNombre, BoutonPrimaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientArticles } from "../../lib/resources/catalogue.js";

const CHAMPS: (keyof Omit<ArticleCout, "article_id">)[] = ["tissu_dt", "faconnage_dt", "fournitures_dt", "packaging_dt", "transport_unitaire_dt", "autre_dt"];
const COULEUR_PASTILLE_MARGE = { vert: "bg-olive", orange: "bg-sable", rouge: "bg-danger-fg" } as const;

/** E08 — Onglet Coûts (COGS), admin uniquement. Marge toujours calculée, jamais saisie. */
export function OngletCouts({ article }: { article: Article }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [couts, setCouts] = useState<Record<string, number>>({});
  const [cogs, setCogs] = useState<number | null>(null);
  const [margePct, setMargePct] = useState<number | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const charger = () =>
    clientArticles.obtenirCouts(article.id).then((r) => {
      setCouts(r.donnees ? Object.fromEntries(CHAMPS.map((c) => [c, r.donnees![c]])) : Object.fromEntries(CHAMPS.map((c) => [c, 0])));
      setCogs(r.cogs);
      setMargePct(r.marge_pct);
    });

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  async function enregistrer() {
    setEnregistrement(true);
    try {
      await clientArticles.enregistrerCouts(article.id, couts as any);
      toaster(t("referentiels.modifie"));
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnregistrement(false);
    }
  }

  const pastille = margePct === null ? "bg-dim" : COULEUR_PASTILLE_MARGE[pastilleMarge(margePct, MARGE_SEUIL_VERT_DEFAUT, MARGE_SEUIL_ORANGE_DEFAUT)];

  return (
    <div>
      <p className="mb-3 text-xs text-dim">{t("catalogue.couts.admin_uniquement")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
        className="grid gap-x-4 md:grid-cols-3"
      >
        {CHAMPS.map((champ) => (
          <Champ key={champ} label={t(`catalogue.couts.${champ}`)}>
            <ChampNombre value={couts[champ] ?? 0} onChange={(e) => setCouts((c) => ({ ...c, [champ]: Number(e.target.value) }))} />
          </Champ>
        ))}
        <div className="col-span-full mt-2 flex items-center gap-4">
          <BoutonPrimaire type="submit" disabled={enregistrement}>
            {t("commun.enregistrer")}
          </BoutonPrimaire>
          <span className="text-sm text-dim">
            {t("catalogue.couts.cogs")}: <strong className="text-off">{cogs !== null ? `${cogs.toFixed(2)} DT` : "—"}</strong>
          </span>
          <span className="flex items-center gap-2 text-sm text-dim">
            <span className={`h-2 w-2 rounded-full ${pastille}`} />
            {t("catalogue.couts.marge")}: <strong className="text-off">{margePct !== null ? `${margePct.toFixed(1)}%` : "—"}</strong>
          </span>
        </div>
      </form>
    </div>
  );
}
