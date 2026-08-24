import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { STATUT_CYCLE_ARTICLE, aCapacite, type Article, type Gamme } from "@achirah/shared";
import { ChampTexte, ChampSelect, BoutonPrimaire } from "../components/ui/Champ.js";
import { useAuth } from "../lib/auth-context.js";
import { clientArticles } from "../lib/resources/catalogue.js";
import { clientGammes } from "../lib/resources/referentiels.js";
import { NouvelArticleDialog } from "./catalogue/NouvelArticleDialog.js";
import { clientExports } from "../lib/resources/systeme.js";

const PASTILLE: Record<string, string> = {
  idee: "bg-dim",
  croquis: "bg-dim",
  prototype: "bg-sable",
  fit_valide: "bg-sable",
  production: "bg-sable",
  stock: "bg-olive",
  epuise: "bg-danger-fg",
  archive: "bg-dim",
};

/** E07 — Catalogue, groupé par gamme, statuts de cycle, recherche. */
export function Catalogue() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [gammeId, setGammeId] = useState("");
  const [statut, setStatut] = useState("");
  const [dialogueOuvert, setDialogueOuvert] = useState(false);

  const charger = () => clientArticles.lister({ q: recherche || undefined, gamme_id: gammeId || undefined, statut: statut || undefined }).then(setArticles);

  useEffect(() => {
    clientGammes.lister().then(setGammes);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => void charger(), 250);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, gammeId, statut]);

  const gammeParId = useMemo(() => new Map(gammes.map((g) => [g.id, g])), [gammes]);
  const parGamme = useMemo(() => {
    const groupes = new Map<string, Article[]>();
    (articles ?? []).forEach((a) => {
      const liste = groupes.get(a.gamme_id) ?? [];
      liste.push(a);
      groupes.set(a.gamme_id, liste);
    });
    return groupes;
  }, [articles]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-off">{t("catalogue.titre")}</h1>
        <div className="flex gap-2">
          <a href={clientExports.catalogueUrl("csv")} className="flex min-h-tap items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
            {t("commun.exporter_csv")}
          </a>
          {peutEditer && (
            <>
              <Link to="/catalogue/import" className="flex min-h-tap items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
                {t("catalogue.importer")}
              </Link>
              <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
                {t("catalogue.nouvel_article")}
              </BoutonPrimaire>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <ChampTexte placeholder={t("commun.rechercher")} value={recherche} onChange={(e) => setRecherche(e.target.value)} className="!w-48" />
        <ChampSelect value={gammeId} onChange={(e) => setGammeId(e.target.value)} className="!w-40">
          <option value="">{t("catalogue.filtrer_gamme")}</option>
          {gammes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </ChampSelect>
        <ChampSelect value={statut} onChange={(e) => setStatut(e.target.value)} className="!w-40">
          <option value="">{t("catalogue.filtrer_statut")}</option>
          {STATUT_CYCLE_ARTICLE.map((s) => (
            <option key={s} value={s}>
              {t(`catalogue.statuts.${s}`)}
            </option>
          ))}
        </ChampSelect>
      </div>

      {!articles && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {articles && articles.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}

      {Array.from(parGamme.entries()).map(([gid, liste]) => (
        <section key={gid} className="mb-6">
          <h2 className="mb-2 font-display text-lg text-off">{gammeParId.get(gid)?.nom ?? gid}</h2>
          <ul className="divide-y divide-line rounded-card border border-line">
            {liste.map((a) => (
              <li key={a.id}>
                <Link to={`/catalogue/${a.id}`} className="flex min-h-tap items-center justify-between gap-3 px-4 py-3 hover:bg-panel2">
                  <div>
                    <p className="text-sm text-off">
                      {a.reference} — {a.nom}
                    </p>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-dim">
                    <span className={`h-2 w-2 rounded-full ${PASTILLE[a.statut_cycle]}`} />
                    {t(`catalogue.statuts.${a.statut_cycle}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <NouvelArticleDialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} onCree={charger} gammes={gammes} />
    </div>
  );
}
