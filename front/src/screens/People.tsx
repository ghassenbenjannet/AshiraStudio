import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { aCapacite, TYPE_PERSONNE, type CategorieContact, type Personne } from "@achirah/shared";
import { Dialog } from "../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../components/ui/Champ.js";
import { useAuth } from "../lib/auth-context.js";
import { useToast } from "../lib/toast-context.js";
import { ApiError } from "../lib/api.js";
import { clientCategoriesContact, clientPersonnes } from "../lib/resources/contacts.js";
import { CategoriesContactDialog } from "./people/CategoriesContactDialog.js";
import { clientExports } from "../lib/resources/systeme.js";

/** E10 — Contacts. */
export function People() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [categories, setCategories] = useState<CategorieContact[]>([]);
  const [personnes, setPersonnes] = useState<Personne[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [type, setType] = useState("");
  const [actifsUniquement, setActifsUniquement] = useState(true);
  const [dialogueCategoriesOuvert, setDialogueCategoriesOuvert] = useState(false);
  const [dialogueCreationOuvert, setDialogueCreationOuvert] = useState(false);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({ nom: "", categorie_id: "", type: "externe" as "interne" | "externe" });

  const chargerCategories = () => clientCategoriesContact.lister().then(setCategories);
  const chargerPersonnes = () =>
    clientPersonnes
      .lister({
        q: recherche || undefined,
        categorie_id: categorieId || undefined,
        type: type || undefined,
        actif: actifsUniquement ? "1" : undefined,
      })
      .then(setPersonnes);

  useEffect(() => {
    chargerCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => void chargerPersonnes(), 250);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, categorieId, type, actifsUniquement]);

  const categorieParId = useMemo(() => new Map(categories.map((c) => [c.id, c.nom])), [categories]);

  async function creerContact() {
    setErreurCreation(null);
    try {
      await clientPersonnes.creer({
        nom: nouveau.nom,
        categorie_ids: nouveau.categorie_id ? [nouveau.categorie_id] : [],
        type: nouveau.type,
        actif: true,
      });
      toaster(t("referentiels.cree"));
      setDialogueCreationOuvert(false);
      setNouveau({ nom: "", categorie_id: "", type: "externe" });
      chargerPersonnes();
    } catch (err) {
      setErreurCreation(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-off">{t("contacts.titre")}</h1>
        <div className="flex gap-2">
          <Link to="/people/cercle" className="min-h-tap flex items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
            {t("cercle.titre")}
          </Link>
          <a href={clientExports.contactsUrl("csv")} className="min-h-tap flex items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
            {t("commun.exporter_csv")}
          </a>
          {peutEditer && (
            <>
              <BoutonSecondaire type="button" onClick={() => setDialogueCategoriesOuvert(true)}>
                {t("categories_contact.titre")}
              </BoutonSecondaire>
              <BoutonPrimaire type="button" onClick={() => setDialogueCreationOuvert(true)}>
                {t("contacts.nouveau")}
              </BoutonPrimaire>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <ChampTexte placeholder={t("commun.rechercher")} value={recherche} onChange={(e) => setRecherche(e.target.value)} className="!w-48" />
        <ChampSelect value={categorieId} onChange={(e) => setCategorieId(e.target.value)} className="!w-44">
          <option value="">{t("contacts.filtrer_categorie")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </ChampSelect>
        <ChampSelect value={type} onChange={(e) => setType(e.target.value)} className="!w-36">
          <option value="">{t("contacts.filtrer_type")}</option>
          {TYPE_PERSONNE.map((tp) => (
            <option key={tp} value={tp}>
              {t(`contacts.${tp}`)}
            </option>
          ))}
        </ChampSelect>
        <label className="flex min-h-tap items-center gap-2 text-sm text-dim">
          <input type="checkbox" checked={actifsUniquement} onChange={(e) => setActifsUniquement(e.target.checked)} />
          {t("contacts.actifs_uniquement")}
        </label>
      </div>

      {!personnes && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {personnes && personnes.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}

      {personnes && personnes.length > 0 && (
        <ul className="divide-y divide-line rounded-card border border-line">
          {personnes.map((p) => (
            <li key={p.id}>
              <Link to={`/people/${p.id}`} className={`flex min-h-tap items-center justify-between gap-3 px-4 py-3 hover:bg-panel2 ${!p.actif ? "opacity-50" : ""}`}>
                <div>
                  <p className="text-sm text-off">{p.nom}</p>
                  <p className="text-xs text-dim">{p.categorie_ids.map((id) => categorieParId.get(id)).filter(Boolean).join(" · ")}</p>
                </div>
                <span className="text-xs text-dim">{t(`contacts.${p.type}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CategoriesContactDialog
        ouvert={dialogueCategoriesOuvert}
        onFermer={() => setDialogueCategoriesOuvert(false)}
        categories={categories}
        onChange={chargerCategories}
      />

      <Dialog ouvert={dialogueCreationOuvert} onFermer={() => setDialogueCreationOuvert(false)} titre={t("contacts.nouveau")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creerContact();
          }}
        >
          <Champ label={t("contacts.champs.nom")}>
            <ChampTexte required value={nouveau.nom} onChange={(e) => setNouveau((n) => ({ ...n, nom: e.target.value }))} />
          </Champ>
          <Champ label={t("contacts.champs.categories")}>
            <ChampSelect required value={nouveau.categorie_id} onChange={(e) => setNouveau((n) => ({ ...n, categorie_id: e.target.value }))}>
              <option value="" disabled>
                {t("contacts.filtrer_categorie")}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("contacts.champs.type")}>
            <ChampSelect value={nouveau.type} onChange={(e) => setNouveau((n) => ({ ...n, type: e.target.value as "interne" | "externe" }))}>
              {TYPE_PERSONNE.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`contacts.${tp}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>

          {erreurCreation && <p className="mb-3 text-sm text-danger-fg">{erreurCreation}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueCreationOuvert(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
