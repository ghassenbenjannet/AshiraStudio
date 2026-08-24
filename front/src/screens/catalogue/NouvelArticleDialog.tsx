import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CategorieProduit, Gamme } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { clientArticles } from "../../lib/resources/catalogue.js";
import { clientCategoriesProduit } from "../../lib/resources/referentiels.js";
import { ApiError } from "../../lib/api.js";

export function NouvelArticleDialog({
  ouvert,
  onFermer,
  onCree,
  gammes,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onCree: () => void;
  gammes: Gamme[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategorieProduit[]>([]);
  const [form, setForm] = useState({ reference: "", nom: "", gamme_id: "", categorie_id: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    if (ouvert) clientCategoriesProduit.lister().then(setCategories);
  }, [ouvert]);

  async function creer() {
    setEnregistrement(true);
    setErreur(null);
    try {
      const article = await clientArticles.creer({ reference: form.reference.toUpperCase(), nom: form.nom, gamme_id: form.gamme_id, categorie_id: form.categorie_id });
      onFermer();
      onCree();
      navigate(`/catalogue/${article.id}`);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <Dialog ouvert={ouvert} onFermer={onFermer} titre={t("catalogue.nouvel_article")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void creer();
        }}
      >
        <Champ label={t("catalogue.champs.reference")}>
          <ChampTexte required placeholder="ST-09" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
        </Champ>
        <Champ label={t("catalogue.champs.nom")}>
          <ChampTexte required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
        </Champ>
        <Champ label={t("catalogue.champs.gamme")}>
          <ChampSelect required value={form.gamme_id} onChange={(e) => setForm((f) => ({ ...f, gamme_id: e.target.value }))}>
            <option value="" disabled>
              {t("catalogue.filtrer_gamme")}
            </option>
            {gammes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nom} ({g.code_prefixe})
              </option>
            ))}
          </ChampSelect>
        </Champ>
        <Champ label={t("catalogue.champs.categorie")}>
          <ChampSelect required value={form.categorie_id} onChange={(e) => setForm((f) => ({ ...f, categorie_id: e.target.value }))}>
            <option value="" disabled>
              {t("catalogue.champs.categorie")}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </ChampSelect>
        </Champ>

        {erreur && <p className="mb-3 text-sm text-danger-fg">{erreur}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <BoutonSecondaire type="button" onClick={onFermer}>
            {t("commun.annuler")}
          </BoutonSecondaire>
          <BoutonPrimaire type="submit" disabled={enregistrement}>
            {t("commun.enregistrer")}
          </BoutonPrimaire>
        </div>
      </form>
    </Dialog>
  );
}
