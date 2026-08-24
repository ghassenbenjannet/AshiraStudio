import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MetriqueSnapshot, Campagne } from "@achirah/shared";
import { Champ, ChampTexte, ChampNombre, ChampSelect, BoutonPrimaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientMesure } from "../../lib/resources/mesure.js";

export interface ChampKpi {
  cle: string;
  label: string;
}

/** §4.8 — Formulaire manuel hebdo (2 min) commun aux 3 niveaux Social/Paid/Site. */
export function NiveauMesure({ plateformes, champs, campagnes }: { plateformes: { valeur: string; label: string }[]; champs: ChampKpi[]; campagnes: Campagne[] }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [snapshots, setSnapshots] = useState<MetriqueSnapshot[] | null>(null);
  const [plateforme, setPlateforme] = useState(plateformes[0]?.valeur ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [campagneId, setCampagneId] = useState("");
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    if (!plateforme && plateformes[0]) setPlateforme(plateformes[0].valeur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateformes]);

  const charger = () => clientMesure.listerSnapshots({ plateforme: plateforme || undefined }).then(setSnapshots);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateforme]);

  async function enregistrer() {
    setEnregistrement(true);
    try {
      const kpis: Record<string, number> = {};
      for (const champ of champs) {
        const brut = valeurs[champ.cle];
        if (brut !== undefined && brut !== "") kpis[champ.cle] = Number(brut);
      }
      await clientMesure.creerSnapshot({ plateforme, date, kpis, campagne_id: campagneId || null });
      toaster(t("referentiels.cree"));
      setValeurs({});
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
        className="mb-6 rounded-card border border-line bg-panel p-4"
      >
        <div className="grid gap-x-4 md:grid-cols-3">
          <Champ label={t("mesure.champs.plateforme")}>
            <ChampSelect value={plateforme} onChange={(e) => setPlateforme(e.target.value)}>
              {plateformes.map((p) => (
                <option key={p.valeur} value={p.valeur}>
                  {p.label}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("mesure.champs.date")}>
            <ChampTexte type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Champ>
          <Champ label={t("mesure.champs.campagne")}>
            <ChampSelect value={campagneId} onChange={(e) => setCampagneId(e.target.value)}>
              <option value="">{t("mesure.champs.aucune_campagne")}</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
        </div>
        <div className="grid gap-x-4 gap-y-1 md:grid-cols-3">
          {champs.map((champ) => (
            <Champ key={champ.cle} label={champ.label}>
              <ChampNombre value={valeurs[champ.cle] ?? ""} onChange={(e) => setValeurs((v) => ({ ...v, [champ.cle]: e.target.value }))} />
            </Champ>
          ))}
        </div>
        <div className="flex justify-end">
          <BoutonPrimaire type="submit" disabled={enregistrement}>
            {t("commun.enregistrer")}
          </BoutonPrimaire>
        </div>
      </form>

      {!snapshots && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {snapshots && snapshots.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      {snapshots && snapshots.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-dim">
              <th className="px-2 py-1 text-start">{t("mesure.champs.date")}</th>
              {champs.map((champ) => (
                <th key={champ.cle} className="px-2 py-1 text-start">
                  {champ.label}
                </th>
              ))}
              <th className="px-2 py-1 text-start">{t("mesure.source")}</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-2 py-1 text-off">{s.date}</td>
                {champs.map((champ) => (
                  <td key={champ.cle} className="px-2 py-1 text-off">
                    {s.kpis[champ.cle] ?? "—"}
                  </td>
                ))}
                <td className="px-2 py-1 text-dim">{t(`mesure.sources.${s.source}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
