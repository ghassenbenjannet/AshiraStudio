import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { tacheEnRetard, type Tache } from "@achirah/shared";
import { BoutonSecondaire } from "../../components/ui/Champ.js";

const COULEUR_TYPE: Record<string, string> = {
  shooting: "bg-sable",
  livraison: "bg-olive",
  contenu: "bg-dim",
  paiement: "bg-dim",
  autre: "bg-dim",
};

function debutSemaine(date: Date): Date {
  const d = new Date(date);
  const jour = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - jour);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** E18 — Calendrier éditorial (vue mois), source tâches/shootings — contenus/posts ajoutés en Phase ④/⑥. */
export function CalendrierEditorial({
  taches,
  campagneParId,
  onOuvrirTache,
}: {
  taches: Tache[];
  campagneParId: Map<string, string>;
  onOuvrirTache: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [mois, setMois] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const semaines = useMemo(() => {
    const debutMois = new Date(mois);
    const finMois = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);
    const premierJour = debutSemaine(debutMois);
    const dernierJour = new Date(finMois);
    dernierJour.setDate(dernierJour.getDate() + ((7 - ((finMois.getDay() + 6) % 7) - 1) % 7));

    const jours: Date[] = [];
    for (let d = new Date(premierJour); d <= dernierJour; d.setDate(d.getDate() + 1)) jours.push(new Date(d));
    const groupes: Date[][] = [];
    for (let i = 0; i < jours.length; i += 7) groupes.push(jours.slice(i, i + 7));
    return groupes;
  }, [mois]);

  const tachesParJour = useMemo(() => {
    const carte = new Map<string, Tache[]>();
    taches.forEach((tache) => {
      const liste = carte.get(tache.date_echeance) ?? [];
      liste.push(tache);
      carte.set(tache.date_echeance, liste);
    });
    return carte;
  }, [taches]);

  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <BoutonSecondaire type="button" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))}>
          ← {t("calendrier.precedent")}
        </BoutonSecondaire>
        <h3 className="font-display text-lg text-off">{mois.toLocaleDateString(i18n.language, { month: "long", year: "numeric" })}</h3>
        <BoutonSecondaire type="button" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))}>
          {t("calendrier.suivant")} →
        </BoutonSecondaire>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {semaines.map((semaine, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {semaine.map((jour) => {
                const iso = jour.toISOString().slice(0, 10);
                const dansLeMois = jour.getMonth() === mois.getMonth();
                const evenements = tachesParJour.get(iso) ?? [];
                return (
                  <div key={iso} className={`min-h-24 rounded-field border border-line p-1 ${dansLeMois ? "bg-panel" : "bg-transparent opacity-40"} ${iso === aujourdhui ? "border-sable" : ""}`}>
                    <p className="mb-1 text-xs text-dim">{jour.getDate()}</p>
                    {evenements.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => onOuvrirTache(ev.id)}
                        title={`${ev.titre} — ${campagneParId.get(ev.campagne_id) ?? ""}`}
                        className={`mb-0.5 block w-full truncate rounded-field px-1 py-0.5 text-start text-[11px] text-bg ${COULEUR_TYPE[ev.type]} ${
                          tacheEnRetard(ev, aujourdhui) ? "ring-1 ring-danger-fg" : ""
                        }`}
                      >
                        {ev.titre}
                      </button>
                    ))}
                    {evenements.length > 3 && <p className="text-[10px] text-dim">+{evenements.length - 3}</p>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
