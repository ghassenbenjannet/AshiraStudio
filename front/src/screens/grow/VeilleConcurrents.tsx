import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Concurrent, ReleveConcurrent } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampNombre, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientConcurrents } from "../../lib/resources/grow.js";

export function VeilleConcurrents() {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [liste, setListe] = useState<Concurrent[] | null>(null);
  const [dialogueNouveau, setDialogueNouveau] = useState(false);
  const [formConcurrent, setFormConcurrent] = useState({ nom: "", instagram: "", segment: "" });

  const [concurrentOuvert, setConcurrentOuvert] = useState<Concurrent | null>(null);
  const [releves, setReleves] = useState<ReleveConcurrent[] | null>(null);
  const [formReleve, setFormReleve] = useState({ date: new Date().toISOString().slice(0, 10), followers: "", posts_semaine: "", observation: "" });

  const charger = () => clientConcurrents.lister().then(setListe);
  useEffect(() => {
    charger();
  }, []);

  async function creerConcurrent() {
    try {
      await clientConcurrents.creer({ nom: formConcurrent.nom, instagram: formConcurrent.instagram || null, segment: formConcurrent.segment || null });
      setDialogueNouveau(false);
      setFormConcurrent({ nom: "", instagram: "", segment: "" });
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function ouvrir(concurrent: Concurrent) {
    setConcurrentOuvert(concurrent);
    setReleves(await clientConcurrents.listerReleves(concurrent.id));
  }

  async function ajouterReleve() {
    if (!concurrentOuvert) return;
    try {
      await clientConcurrents.ajouterReleve(concurrentOuvert.id, {
        date: formReleve.date,
        followers: Number(formReleve.followers),
        posts_semaine: Number(formReleve.posts_semaine),
        observation: formReleve.observation || null,
      });
      setReleves(await clientConcurrents.listerReleves(concurrentOuvert.id));
      setFormReleve({ date: new Date().toISOString().slice(0, 10), followers: "", posts_semaine: "", observation: "" });
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <BoutonPrimaire type="button" onClick={() => setDialogueNouveau(true)}>
          {t("grow.veille.nouveau")}
        </BoutonPrimaire>
      </div>
      {!liste && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {liste && liste.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-1">
        {liste?.map((concurrent) => (
          <li key={concurrent.id}>
            <button
              type="button"
              onClick={() => void ouvrir(concurrent)}
              className="flex min-h-tap w-full items-center justify-between rounded-card border border-line bg-panel px-3 py-2 text-sm hover:border-sable"
            >
              <span className="text-off">{concurrent.nom}</span>
              <span className="text-xs text-dim">{concurrent.segment}</span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueNouveau} onFermer={() => setDialogueNouveau(false)} titre={t("grow.veille.nouveau")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creerConcurrent();
          }}
        >
          <Champ label={t("grow.veille.champs.nom")}>
            <ChampTexte required value={formConcurrent.nom} onChange={(e) => setFormConcurrent((f) => ({ ...f, nom: e.target.value }))} />
          </Champ>
          <Champ label={t("grow.veille.champs.instagram")}>
            <ChampTexte value={formConcurrent.instagram} onChange={(e) => setFormConcurrent((f) => ({ ...f, instagram: e.target.value }))} />
          </Champ>
          <Champ label={t("grow.veille.champs.segment")}>
            <ChampTexte value={formConcurrent.segment} onChange={(e) => setFormConcurrent((f) => ({ ...f, segment: e.target.value }))} />
          </Champ>
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueNouveau(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>

      <Dialog ouvert={!!concurrentOuvert} onFermer={() => setConcurrentOuvert(null)} titre={concurrentOuvert?.nom ?? ""}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ajouterReleve();
          }}
          className="mb-4"
        >
          <div className="grid grid-cols-3 gap-2">
            <Champ label={t("mesure.champs.date")}>
              <ChampTexte type="date" value={formReleve.date} onChange={(e) => setFormReleve((f) => ({ ...f, date: e.target.value }))} />
            </Champ>
            <Champ label={t("grow.veille.champs.followers")}>
              <ChampNombre required value={formReleve.followers} onChange={(e) => setFormReleve((f) => ({ ...f, followers: e.target.value }))} />
            </Champ>
            <Champ label={t("grow.veille.champs.posts_semaine")}>
              <ChampNombre required value={formReleve.posts_semaine} onChange={(e) => setFormReleve((f) => ({ ...f, posts_semaine: e.target.value }))} />
            </Champ>
          </div>
          <Champ label={t("grow.veille.champs.observation")}>
            <ChampTexte value={formReleve.observation} onChange={(e) => setFormReleve((f) => ({ ...f, observation: e.target.value }))} />
          </Champ>
          <div className="flex justify-end">
            <BoutonSecondaire type="submit">{t("grow.veille.ajouter_releve")}</BoutonSecondaire>
          </div>
        </form>

        {releves && releves.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-start text-xs text-dim">
                <th className="px-2 py-1 text-start">{t("mesure.champs.date")}</th>
                <th className="px-2 py-1 text-start">{t("grow.veille.champs.followers")}</th>
                <th className="px-2 py-1 text-start">Δ</th>
                <th className="px-2 py-1 text-start">{t("grow.veille.champs.posts_semaine")}</th>
              </tr>
            </thead>
            <tbody>
              {releves
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((r, i, arr) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-2 py-1 text-off">{r.date}</td>
                    <td className="px-2 py-1 text-off">{r.followers}</td>
                    <td className="px-2 py-1 text-dim">{i > 0 ? (r.followers - arr[i - 1]!.followers >= 0 ? "+" : "") + (r.followers - arr[i - 1]!.followers) : "—"}</td>
                    <td className="px-2 py-1 text-off">{r.posts_semaine}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Dialog>
    </div>
  );
}
