import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { aCapacite, type AgentCampagne } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampZoneTexte, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { MarkdownLeger } from "../../components/ui/MarkdownLeger.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientAgents } from "../../lib/resources/agents.js";

const COULEURS = ["#c9a876", "#5c6146", "#f2ede1", "#15140f", "#8b6f47"];

const OUTILS_LECTURE = ["get_taches", "get_prochains_shootings", "get_campagnes", "get_articles", "get_personnes", "get_kpis", "get_contenus", "get_budget", "get_ambassadeurs", "get_tendances", "get_lecons"];
const OUTILS_DIRECTS = ["creer_tache", "creer_idee", "creer_contenu_brouillon", "proposer_expression"];
const OUTILS_CONFIRMATION = ["modifier_tache", "ajouter_poses", "ajouter_look", "creer_personne"];
const TOUS_OUTILS = [...OUTILS_LECTURE, ...OUTILS_DIRECTS, ...OUTILS_CONFIRMATION];

/** §4.10 Annexe E — 3 gabarits d'exemples livrés. */
const GABARITS = [
  { cle: "captions", nom: "Agent captions", instructions: "Rédige des captions courtes selon le registre par défaut de la gamme, dans l'ambiance de la campagne sélectionnée." },
  { cle: "logistique", nom: "Agent logistique", instructions: "Chaque matin, résume les tâches en retard et les shootings prêts/pas prêts à tourner." },
  { cle: "shooting", nom: "Agent shooting", instructions: "Prépare les call sheets, les briefs et propose un ordre de tournage selon l'heure lumière prévue." },
];

interface FormAgent {
  nom: string;
  avatar_couleur: string;
  instructions: string;
  outils_actives: string[];
}

const FORM_VIDE: FormAgent = { nom: "", avatar_couleur: COULEURS[0]!, instructions: "", outils_actives: [...TOUS_OUTILS] };

export function OngletAgentsCampagne({ campagneId }: { campagneId: string }) {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutGerer = !!utilisateur && aCapacite(utilisateur.role_systeme, "approbation.gerer");

  const [agents, setAgents] = useState<AgentCampagne[] | null>(null);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState<FormAgent>(FORM_VIDE);

  const [agentTest, setAgentTest] = useState<AgentCampagne | null>(null);
  const [messageTest, setMessageTest] = useState("");
  const [reponseTest, setReponseTest] = useState<string | null>(null);
  const [testEnCours, setTestEnCours] = useState(false);
  const [erreurTest, setErreurTest] = useState<string | null>(null);

  const charger = () => clientAgents.lister(campagneId).then(setAgents);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campagneId]);

  function appliquerGabarit(gabarit: (typeof GABARITS)[number]) {
    setForm((f) => ({ ...f, nom: gabarit.nom, instructions: gabarit.instructions }));
  }

  function toggleOutil(nom: string) {
    setForm((f) => ({ ...f, outils_actives: f.outils_actives.includes(nom) ? f.outils_actives.filter((o) => o !== nom) : [...f.outils_actives, nom] }));
  }

  async function creer() {
    try {
      await clientAgents.creer({ ...form, campagne_id: campagneId, actif: true });
      setDialogueOuvert(false);
      setForm(FORM_VIDE);
      charger();
      toaster(t("referentiels.cree"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function basculerActif(agent: AgentCampagne) {
    try {
      const modifie = await clientAgents.modifier(agent.id, { actif: !agent.actif });
      setAgents((liste) => liste?.map((a) => (a.id === agent.id ? modifie : a)) ?? null);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function envoyerTest() {
    if (!agentTest || !messageTest.trim()) return;
    setTestEnCours(true);
    setErreurTest(null);
    setReponseTest(null);
    try {
      const r = await clientAgents.tester(agentTest.id, messageTest);
      setReponseTest(r.contenu);
    } catch (err) {
      setErreurTest(err instanceof ApiError && err.status === 503 ? t("studio.ia_indisponible") : err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setTestEnCours(false);
    }
  }

  return (
    <div>
      {peutGerer && (
        <div className="mb-3 flex justify-end">
          <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
            {t("campagnes.agents.nouveau")}
          </BoutonPrimaire>
        </div>
      )}

      {!agents && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {agents && agents.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-2">
        {agents?.map((a) => (
          <li key={a.id} className="rounded-card border border-line bg-panel p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: a.avatar_couleur }} />
                <span className="font-medium text-off">{a.nom}</span>
                {!a.campagne_id && <span className="text-xs text-dim">({t("campagnes.agents.global")})</span>}
              </span>
              {peutGerer && (
                <label className="flex items-center gap-1 text-xs text-dim">
                  <input type="checkbox" checked={a.actif} onChange={() => void basculerActif(a)} />
                  {t("campagnes.agents.actif")}
                </label>
              )}
            </div>
            <p className="mb-2 text-sm text-dim">{a.instructions}</p>
            <BoutonSecondaire
              type="button"
              onClick={() => {
                setAgentTest(a);
                setMessageTest("");
                setReponseTest(null);
                setErreurTest(null);
              }}
            >
              {t("campagnes.agents.tester")}
            </BoutonSecondaire>
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("campagnes.agents.nouveau")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {GABARITS.map((g) => (
              <button key={g.cle} type="button" onClick={() => appliquerGabarit(g)} className="rounded-field border border-line px-2 py-1 text-xs text-dim hover:border-sable hover:text-off">
                {g.nom}
              </button>
            ))}
          </div>
          <Champ label={t("campagnes.agents.champs.nom")}>
            <ChampTexte required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          </Champ>
          <Champ label={t("campagnes.agents.champs.couleur")}>
            <div className="flex gap-2">
              {COULEURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, avatar_couleur: c }))}
                  className={`h-7 w-7 rounded-full border-2 ${form.avatar_couleur === c ? "border-off" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Champ>
          <Champ label={t("campagnes.agents.champs.instructions")}>
            <ChampZoneTexte required rows={4} value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
          </Champ>
          <Champ label={t("campagnes.agents.champs.outils")}>
            <div className="grid grid-cols-2 gap-1 rounded-field border border-line p-2">
              {TOUS_OUTILS.map((o) => (
                <label key={o} className="flex items-center gap-1 text-xs text-off">
                  <input type="checkbox" checked={form.outils_actives.includes(o)} onChange={() => toggleOutil(o)} />
                  {o}
                </label>
              ))}
            </div>
          </Champ>
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueOuvert(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>

      <Dialog ouvert={!!agentTest} onFermer={() => setAgentTest(null)} titre={agentTest ? `${t("campagnes.agents.tester")} — ${agentTest.nom}` : ""}>
        <p className="mb-2 text-xs text-dim">{t("campagnes.agents.test_note")}</p>
        <ChampZoneTexte rows={3} value={messageTest} onChange={(e) => setMessageTest(e.target.value)} placeholder={t("studio.placeholder")} />
        {erreurTest && <p className="mt-2 text-sm text-danger-fg">{erreurTest}</p>}
        {reponseTest && (
          <p className="mt-2 rounded-field border border-line bg-panel2 p-2 text-sm text-off">
            <MarkdownLeger texte={reponseTest} />
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <BoutonSecondaire type="button" onClick={() => setAgentTest(null)}>
            {t("commun.annuler")}
          </BoutonSecondaire>
          <BoutonPrimaire type="button" onClick={() => void envoyerTest()} disabled={testEnCours || !messageTest.trim()}>
            {t("studio.envoyer")}
          </BoutonPrimaire>
        </div>
      </Dialog>
    </div>
  );
}
