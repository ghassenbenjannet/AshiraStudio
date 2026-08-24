import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CategorieContact } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { ChampTexte, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { clientCategoriesContact } from "../../lib/resources/contacts.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";

export function CategoriesContactDialog({
  ouvert,
  onFermer,
  categories,
  onChange,
}: {
  ouvert: boolean;
  onFermer: () => void;
  categories: CategorieContact[];
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [nouveauNom, setNouveauNom] = useState("");

  async function ajouter() {
    if (!nouveauNom.trim()) return;
    try {
      await clientCategoriesContact.creer({ nom: nouveauNom.trim(), icone: null, systeme: false, ordre: categories.length });
      setNouveauNom("");
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function supprimer(cat: CategorieContact) {
    try {
      await clientCategoriesContact.supprimer(cat.id);
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <Dialog ouvert={ouvert} onFermer={onFermer} titre={t("categories_contact.titre")}>
      <ul className="mb-4 divide-y divide-line rounded-card border border-line">
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm text-off">{cat.nom}</span>
            {cat.systeme ? (
              <span className="text-xs text-dim">{t("categories_contact.systeme_protegee")}</span>
            ) : (
              <button type="button" onClick={() => void supprimer(cat)} className="min-h-tap text-xs text-danger-fg">
                {t("commun.supprimer")}
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ajouter();
        }}
        className="flex gap-2"
      >
        <ChampTexte value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} placeholder={t("categories_contact.ajouter")} />
        <BoutonPrimaire type="submit">{t("referentiels.ajouter")}</BoutonPrimaire>
      </form>
      <div className="mt-4 flex justify-end">
        <BoutonSecondaire type="button" onClick={onFermer}>
          {t("commun.retour")}
        </BoutonSecondaire>
      </div>
    </Dialog>
  );
}
