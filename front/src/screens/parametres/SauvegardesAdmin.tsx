import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BoutonPrimaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientSauvegardes, type Sauvegarde } from "../../lib/resources/systeme.js";

function formaterTaille(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export function SauvegardesAdmin() {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [liste, setListe] = useState<Sauvegarde[] | null>(null);
  const [enCours, setEnCours] = useState(false);

  const charger = () => clientSauvegardes.lister().then(setListe);
  useEffect(() => {
    charger();
  }, []);

  async function declencher() {
    setEnCours(true);
    try {
      await clientSauvegardes.creer();
      toaster(t("sauvegardes.creee"));
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-dim">{t("sauvegardes.description")}</p>
        <BoutonPrimaire type="button" onClick={() => void declencher()} disabled={enCours}>
          {t("sauvegardes.declencher")}
        </BoutonPrimaire>
      </div>

      {!liste && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {liste && liste.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-2">
        {liste?.map((s) => (
          <li key={s.nom} className="flex items-center justify-between rounded-card border border-line bg-panel px-3 py-2 text-sm">
            <span className="text-off">{new Date(s.at).toLocaleString()}</span>
            <span className="text-dim">{formaterTaille(s.taille_octets)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
