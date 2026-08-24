import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { STATUT_IDEE, aCapacite, type Idee, type Tache, type Campagne, type ListeSimple, type IdeeGeneree } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampZoneTexte, ChampSelect, ChampNombre, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { MarkdownLeger } from "../../components/ui/MarkdownLeger.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientIdees } from "../../lib/resources/idees.js";
import { clientTaches } from "../../lib/resources/taches.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { clientPlateformesContenu } from "../../lib/resources/referentiels.js";

const BADGE_STATUT: Record<string, string> = { nouvelle: "text-sable", utilisee: "text-olive", ecartee: "text-dim" };

export function IdeesListe() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [idees, setIdees] = useState<Idee[] | null>(null);
  const [statut, setStatut] = useState("");
  const [q, setQ] = useState("");
  const [taches, setTaches] = useState<Tache[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState({ contenu: "", tache_id: "" });

  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [plateformes, setPlateformes] = useState<ListeSimple[]>([]);
  const [dialogueGenerateurOuvert, setDialogueGenerateurOuvert] = useState(false);
  const [formGenerateur, setFormGenerateur] = useState({ objectif: "", plateformes: [] as string[], effort: "facile" as "facile" | "moyen" | "lourd", quantite: 5, campagne_id: "" });
  const [genereesEnCours, setGenereesEnCours] = useState(false);
  const [erreurGenerateur, setErreurGenerateur] = useState<string | null>(null);
  const [idesGenerees, setIdeesGenerees] = useState<IdeeGeneree[] | null>(null);
  const [ideesSauvegardees, setIdeesSauvegardees] = useState<Set<number>>(new Set());

  const charger = () => clientIdees.lister({ statut: statut || undefined, q: q || undefined }).then(setIdees);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut, q]);
  useEffect(() => {
    clientTaches.lister({}).then(setTaches);
    clientCampagnes.lister().then(setCampagnes);
    clientPlateformesContenu.lister().then(setPlateformes);
  }, []);

  function togglePlateformeGenerateur(id: string) {
    setFormGenerateur((f) => ({ ...f, plateformes: f.plateformes.includes(id) ? f.plateformes.filter((p) => p !== id) : [...f.plateformes, id] }));
  }

  async function genererIdees() {
    setGenereesEnCours(true);
    setErreurGenerateur(null);
    setIdeesGenerees(null);
    setIdeesSauvegardees(new Set());
    try {
      const resultat = await clientIdees.generer({
        objectif: formGenerateur.objectif,
        plateformes: formGenerateur.plateformes,
        effort: formGenerateur.effort,
        quantite: formGenerateur.quantite,
        campagne_id: formGenerateur.campagne_id || undefined,
      });
      setIdeesGenerees(resultat);
    } catch (err) {
      setErreurGenerateur(err instanceof ApiError && err.status === 503 ? t("studio.ia_indisponible") : err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setGenereesEnCours(false);
    }
  }

  async function sauvegarderIdeeGeneree(idee: IdeeGeneree, index: number) {
    const contenu = [
      `**${idee.hook}**`,
      idee.storyboard,
      idee.plans_a_filmer.length ? `Plans : ${idee.plans_a_filmer.join(" · ")}` : "",
      `Durée : ${idee.duree}`,
      `Caption : ${idee.caption}`,
      idee.son ? `Son : ${idee.son}` : "",
      idee.lieu ? `Lieu : ${idee.lieu}` : "",
      idee.pieces.length ? `Pièces : ${idee.pieces.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await clientIdees.creer({ contenu, source: "generateur", score: idee.score, score_justification: idee.score_justification });
      setIdeesSauvegardees((s) => new Set(s).add(index));
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function creer() {
    try {
      await clientIdees.creer({ contenu: form.contenu, source: "manuel", tache_id: form.tache_id || null });
      setDialogueOuvert(false);
      setForm({ contenu: "", tache_id: "" });
      charger();
      toaster(t("referentiels.cree"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function changerStatut(id: string, nouveauStatut: Idee["statut"]) {
    try {
      const modifiee = await clientIdees.modifier(id, { statut: nouveauStatut });
      setIdees((liste) => liste?.map((i) => (i.id === id ? modifiee : i)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  function copier(texte: string) {
    navigator.clipboard?.writeText(texte).then(() => toaster(t("idees.copiee")));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-44">
          <ChampSelect value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">{t("idees.tous_statuts")}</option>
            {STATUT_IDEE.map((s) => (
              <option key={s} value={s}>
                {t(`idees.statuts.${s}`)}
              </option>
            ))}
          </ChampSelect>
        </div>
        <div className="w-56">
          <ChampTexte placeholder={t("commun.rechercher")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex-1" />
        {peutEditer && (
          <>
            <BoutonSecondaire type="button" onClick={() => setDialogueGenerateurOuvert(true)}>
              {t("idees.generer")}
            </BoutonSecondaire>
            <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
              {t("idees.nouvelle")}
            </BoutonPrimaire>
          </>
        )}
      </div>

      {!idees && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {idees && idees.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-2">
        {idees?.map((idee) => (
          <li key={idee.id} className="rounded-card border border-line bg-panel p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${BADGE_STATUT[idee.statut]}`}>{t(`idees.statuts.${idee.statut}`)}</span>
              <span className="text-xs text-dim">{t(`idees.sources.${idee.source}`)}</span>
            </div>
            <p className="mb-2 text-sm text-off">
              <MarkdownLeger texte={idee.contenu} />
            </p>
            <div className="flex flex-wrap gap-2">
              <BoutonSecondaire type="button" onClick={() => copier(idee.contenu)}>
                {t("idees.copier")}
              </BoutonSecondaire>
              {peutEditer && idee.statut !== "utilisee" && (
                <BoutonSecondaire type="button" onClick={() => void changerStatut(idee.id, "utilisee")}>
                  {t("idees.marquer_utilisee")}
                </BoutonSecondaire>
              )}
              {peutEditer && idee.statut !== "ecartee" && (
                <BoutonSecondaire type="button" onClick={() => void changerStatut(idee.id, "ecartee")}>
                  {t("idees.ecarter")}
                </BoutonSecondaire>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("idees.nouvelle")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
        >
          <Champ label={t("idees.champs.contenu")}>
            <ChampZoneTexte required rows={5} value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} />
          </Champ>
          <Champ label={t("idees.champs.tache_liee")}>
            <ChampSelect value={form.tache_id} onChange={(e) => setForm((f) => ({ ...f, tache_id: e.target.value }))}>
              <option value="">—</option>
              {taches.map((ta) => (
                <option key={ta.id} value={ta.id}>
                  {ta.titre}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueOuvert(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>

      <Dialog ouvert={dialogueGenerateurOuvert} onFermer={() => setDialogueGenerateurOuvert(false)} titre={t("idees.generer")}>
        {!idesGenerees ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void genererIdees();
            }}
          >
            <Champ label={t("idees.champs.objectif")}>
              <ChampTexte required value={formGenerateur.objectif} onChange={(e) => setFormGenerateur((f) => ({ ...f, objectif: e.target.value }))} />
            </Champ>
            <Champ label={t("contenus.champs.plateformes")}>
              <div className="flex flex-wrap gap-2">
                {plateformes.map((p) => (
                  <label key={p.id} className="flex items-center gap-1 rounded-field border border-line px-2 py-1 text-sm text-off">
                    <input type="checkbox" checked={formGenerateur.plateformes.includes(p.id)} onChange={() => togglePlateformeGenerateur(p.id)} />
                    {p.nom}
                  </label>
                ))}
              </div>
            </Champ>
            <div className="grid grid-cols-2 gap-2">
              <Champ label={t("idees.champs.effort")}>
                <ChampSelect value={formGenerateur.effort} onChange={(e) => setFormGenerateur((f) => ({ ...f, effort: e.target.value as typeof f.effort }))}>
                  <option value="facile">{t("idees.efforts.facile")}</option>
                  <option value="moyen">{t("idees.efforts.moyen")}</option>
                  <option value="lourd">{t("idees.efforts.lourd")}</option>
                </ChampSelect>
              </Champ>
              <Champ label={t("idees.champs.quantite")}>
                <ChampNombre min={3} max={10} value={formGenerateur.quantite} onChange={(e) => setFormGenerateur((f) => ({ ...f, quantite: Number(e.target.value) }))} />
              </Champ>
            </div>
            <Champ label={t("contenus.champs.campagne")}>
              <ChampSelect value={formGenerateur.campagne_id} onChange={(e) => setFormGenerateur((f) => ({ ...f, campagne_id: e.target.value }))}>
                <option value="">{t("studio.campagne_defaut")}</option>
                {campagnes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </ChampSelect>
            </Champ>
            {erreurGenerateur && <p className="mb-3 text-sm text-danger-fg">{erreurGenerateur}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <BoutonSecondaire type="button" onClick={() => setDialogueGenerateurOuvert(false)}>
                {t("commun.annuler")}
              </BoutonSecondaire>
              <BoutonPrimaire type="submit" disabled={genereesEnCours || formGenerateur.plateformes.length === 0}>
                {t("idees.generer")}
              </BoutonPrimaire>
            </div>
          </form>
        ) : (
          <div>
            <p className="mb-3 text-xs text-dim">{t("idees.score_disclaimer")}</p>
            <div className="flex flex-col gap-3">
              {idesGenerees.map((idee, i) => (
                <div key={i} className="rounded-card border border-line bg-panel2 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium text-off">{idee.hook}</p>
                    <span className="text-sable">{idee.score}/100</span>
                  </div>
                  <p className="mb-1 text-dim">{idee.storyboard}</p>
                  <p className="mb-1 text-xs text-dim">{idee.score_justification}</p>
                  <p className="mb-2 text-xs text-off">
                    {idee.duree} · {idee.caption}
                  </p>
                  {peutEditer &&
                    (ideesSauvegardees.has(i) ? (
                      <span className="text-xs text-olive">{t("idees.sauvegardee")}</span>
                    ) : (
                      <BoutonSecondaire type="button" onClick={() => void sauvegarderIdeeGeneree(idee, i)}>
                        {t("idees.sauvegarder")}
                      </BoutonSecondaire>
                    ))}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <BoutonSecondaire
                type="button"
                onClick={() => {
                  setIdeesGenerees(null);
                  setDialogueGenerateurOuvert(false);
                }}
              >
                {t("commun.retour")}
              </BoutonSecondaire>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
