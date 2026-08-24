import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TYPE_TACHE, type Campagne } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { clientTaches } from "../../lib/resources/taches.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";

export function NouvelleTacheDialog({
  ouvert,
  onFermer,
  campagnes,
  onCree,
  campagneParDefaut,
}: {
  ouvert: boolean;
  onFermer: () => void;
  campagnes: Campagne[];
  onCree: () => void;
  campagneParDefaut?: string;
}) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [form, setForm] = useState({ titre: "", type: "autre" as (typeof TYPE_TACHE)[number], date_echeance: "", campagne_id: campagneParDefaut ?? "", lieu: "" });
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    setErreur(null);
    try {
      await clientTaches.creer({ titre: form.titre, type: form.type, date_echeance: form.date_echeance, campagne_id: form.campagne_id, lieu: form.lieu || null, assigne_ids: [] });
      toaster(t("referentiels.cree"));
      onFermer();
      onCree();
      setForm({ titre: "", type: "autre", date_echeance: "", campagne_id: campagneParDefaut ?? "", lieu: "" });
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    }
  }

  return (
    <Dialog ouvert={ouvert} onFermer={onFermer} titre={t("taches.nouvelle")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void creer();
        }}
      >
        <Champ label={t("taches.champs.titre")}>
          <ChampTexte required value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
        </Champ>
        <Champ label={t("taches.champs.type")}>
          <ChampSelect value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as (typeof TYPE_TACHE)[number] }))}>
            {TYPE_TACHE.map((ty) => (
              <option key={ty} value={ty}>
                {t(`taches.types.${ty}`)}
              </option>
            ))}
          </ChampSelect>
        </Champ>
        <Champ label={t("taches.champs.date_echeance")}>
          <ChampTexte type="date" required value={form.date_echeance} onChange={(e) => setForm((f) => ({ ...f, date_echeance: e.target.value }))} />
        </Champ>
        <Champ label={t("campagnes.champs.nom")}>
          <ChampSelect required value={form.campagne_id} onChange={(e) => setForm((f) => ({ ...f, campagne_id: e.target.value }))}>
            <option value="" disabled>
              —
            </option>
            {campagnes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </ChampSelect>
        </Champ>
        <Champ label={t("taches.champs.lieu")}>
          <ChampTexte value={form.lieu} onChange={(e) => setForm((f) => ({ ...f, lieu: e.target.value }))} />
        </Champ>

        {erreur && <p className="mb-3 text-sm text-danger-fg">{erreur}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <BoutonSecondaire type="button" onClick={onFermer}>
            {t("commun.annuler")}
          </BoutonSecondaire>
          <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
        </div>
      </form>
    </Dialog>
  );
}
