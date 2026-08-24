import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OBJECTIF_CAMPAGNE, type TypeCampagne } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, ChampZoneTexte, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { clientTypesCampagne } from "../../lib/resources/referentiels.js";
import { ApiError } from "../../lib/api.js";
import { useToast } from "../../lib/toast-context.js";

export function NouvelleCampagneDialog({ ouvert, onFermer, onCree }: { ouvert: boolean; onFermer: () => void; onCree: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toaster } = useToast();
  const [types, setTypes] = useState<TypeCampagne[]>([]);
  const [form, setForm] = useState({ nom: "", type_campagne_id: "", date_debut: "", date_fin: "", objectif: "lancement" as (typeof OBJECTIF_CAMPAGNE)[number], description: "" });
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (ouvert) clientTypesCampagne.lister().then(setTypes);
  }, [ouvert]);

  async function creer() {
    setErreur(null);
    try {
      const campagne = await clientCampagnes.creer({
        nom: form.nom,
        type_campagne_id: form.type_campagne_id,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        objectif: form.objectif,
        description: form.description || null,
        budget_total_dt: 0,
        canaux: [],
      });
      toaster(t("referentiels.cree"));
      onFermer();
      onCree();
      navigate(`/plan/campagnes/${campagne.id}`);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    }
  }

  return (
    <Dialog ouvert={ouvert} onFermer={onFermer} titre={t("campagnes.nouvelle")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void creer();
        }}
      >
        <Champ label={t("campagnes.champs.nom")}>
          <ChampTexte required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
        </Champ>
        <Champ label={t("campagnes.champs.type_campagne")}>
          <ChampSelect required value={form.type_campagne_id} onChange={(e) => setForm((f) => ({ ...f, type_campagne_id: e.target.value }))}>
            <option value="" disabled>
              —
            </option>
            {types.map((ty) => (
              <option key={ty.id} value={ty.id}>
                {ty.nom}
              </option>
            ))}
          </ChampSelect>
        </Champ>
        <div className="grid gap-x-4 md:grid-cols-2">
          <Champ label={t("campagnes.champs.date_debut")}>
            <ChampTexte type="date" required value={form.date_debut} onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} />
          </Champ>
          <Champ label={t("campagnes.champs.date_fin")}>
            <ChampTexte type="date" required value={form.date_fin} onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} />
          </Champ>
        </div>
        <Champ label={t("campagnes.champs.objectif")}>
          <ChampSelect value={form.objectif} onChange={(e) => setForm((f) => ({ ...f, objectif: e.target.value as (typeof OBJECTIF_CAMPAGNE)[number] }))}>
            {OBJECTIF_CAMPAGNE.map((o) => (
              <option key={o} value={o}>
                {t(`campagnes.objectifs.${o}`)}
              </option>
            ))}
          </ChampSelect>
        </Champ>
        <Champ label={t("campagnes.champs.description")}>
          <ChampZoneTexte value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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
