import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { aCapacite, type Campagne, type AgentCampagne } from "@achirah/shared";
import { ChampSelect, ChampZoneTexte, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { MarkdownLeger } from "../../components/ui/MarkdownLeger.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientConversations, type ConversationDetail, type ActionAgent } from "../../lib/resources/conversations.js";
import { clientAgents } from "../../lib/resources/agents.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { clientAssets } from "../../lib/resources/assets.js";
import { clientIdees } from "../../lib/resources/idees.js";
import type { Conversation } from "@achirah/shared";

interface ChipRapide {
  cle: string;
  gabarit: string;
}

const CHIPS_RAPIDES: ChipRapide[] = [
  { cle: "idees", gabarit: "Propose-moi 3 idées de contenu tournables cette semaine." },
  { cle: "brief_shooting", gabarit: "Prépare le brief du prochain shooting." },
  { cle: "caption", gabarit: "Rédige 3 variantes de caption pour le dernier contenu en brouillon." },
  { cle: "message_ambassadeur", gabarit: "Rédige un message prêt à envoyer pour relancer un ambassadeur inactif." },
  { cle: "fiche_produit", gabarit: "Rédige une fiche produit (≤80 mots, tailles en cm) pour un article du catalogue." },
  { cle: "planning_semaine", gabarit: "Propose un planning de contenu pour la semaine prochaine." },
];

export function Studio() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [agents, setAgents] = useState<AgentCampagne[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [agentId, setAgentId] = useState<string>("");
  const [campagneId, setCampagneId] = useState<string>("__defaut__");
  const [texte, setTexte] = useState("");
  const [imagesEnAttente, setImagesEnAttente] = useState<string[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurIa, setErreurIa] = useState<string | null>(null);
  const fichierRef = useRef<HTMLInputElement>(null);
  const finDuFil = useRef<HTMLDivElement>(null);

  const chargerListe = () => clientConversations.lister().then(setConversations);
  useEffect(() => {
    chargerListe();
    clientAgents.lister().then(setAgents);
    clientCampagnes.lister().then(setCampagnes);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setDetail(null);
      return;
    }
    clientConversations.obtenir(conversationId).then(setDetail);
  }, [conversationId]);

  useEffect(() => {
    finDuFil.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  async function nouvelleConversation() {
    const conv = await clientConversations.creer(agentId || null);
    setConversations((liste) => [conv, ...liste]);
    setConversationId(conv.id);
  }

  async function envoyer() {
    if (!texte.trim()) return;
    setErreurIa(null);
    let id = conversationId;
    if (!id) {
      const conv = await clientConversations.creer(agentId || null);
      setConversations((liste) => [conv, ...liste]);
      setConversationId(conv.id);
      id = conv.id;
    }
    setEnvoiEnCours(true);
    const texteEnvoye = texte;
    setTexte("");
    const imagesEnvoyees = imagesEnAttente;
    setImagesEnAttente([]);
    try {
      await clientConversations.envoyerMessage(id, {
        contenu: texteEnvoye,
        images: imagesEnvoyees.length ? imagesEnvoyees : undefined,
        campagne_id: campagneId === "__defaut__" ? undefined : campagneId === "__aucune__" ? undefined : campagneId,
        agent_id: agentId || undefined,
      });
      const rafraichi = await clientConversations.obtenir(id);
      setDetail(rafraichi);
      chargerListe();
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setErreurIa(err.message);
        const rafraichi = await clientConversations.obtenir(id);
        setDetail(rafraichi);
        chargerListe();
      } else {
        toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
      }
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function surFichiers(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return;
    const restants = 4 - imagesEnAttente.length;
    const liste = Array.from(fichiers).slice(0, restants);
    try {
      const assets = await clientAssets.televerser(liste, { type: "photo", source: "studio" });
      setImagesEnAttente((prev) => [...prev, ...assets.map((a) => a.id)]);
    } catch (err) {
      toaster(err instanceof Error ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function sauvegarderEnIdee(texteMessage: string) {
    try {
      await clientIdees.creer({ contenu: texteMessage, source: "studio" });
      toaster(t("studio.idee_sauvegardee"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function traiterAction(action: ActionAgent, confirmer: boolean) {
    if (!conversationId) return;
    try {
      if (confirmer) await clientConversations.confirmerAction(conversationId, action.id);
      else await clientConversations.annulerAction(conversationId, action.id);
      const rafraichi = await clientConversations.obtenir(conversationId);
      setDetail(rafraichi);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <aside className="order-2 md:order-1">
        {peutEditer && (
          <BoutonSecondaire type="button" onClick={() => void nouvelleConversation()} className="mb-2 w-full">
            {t("studio.nouvelle_conversation")}
          </BoutonSecondaire>
        )}
        <ul className="flex flex-col gap-1">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                type="button"
                onClick={() => setConversationId(conv.id)}
                className={`w-full truncate rounded-field px-2 py-1.5 text-start text-sm ${conv.id === conversationId ? "bg-panel2 text-off" : "text-dim hover:text-off"}`}
              >
                {conv.titre || t("studio.sans_titre")}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="order-1 md:order-2">
        <div className="mb-3 flex flex-wrap gap-2">
          {CHIPS_RAPIDES.map((chip) => (
            <button
              key={chip.cle}
              type="button"
              onClick={() => setTexte(chip.gabarit)}
              className="rounded-field border border-line px-3 py-1.5 text-sm text-off hover:border-sable"
            >
              {t(`studio.chips.${chip.cle}`)}
            </button>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <div className="w-48">
            <ChampSelect value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">{t("studio.agent_standard")}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </ChampSelect>
          </div>
          <div className="w-56">
            <ChampSelect value={campagneId} onChange={(e) => setCampagneId(e.target.value)}>
              <option value="__defaut__">{t("studio.campagne_defaut")}</option>
              <option value="__aucune__">{t("studio.campagne_aucune")}</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </ChampSelect>
          </div>
        </div>

        <div className="mb-3 min-h-[300px] rounded-card border border-line bg-panel p-3">
          {!detail && <p className="text-sm text-dim">{t("studio.aucune_conversation")}</p>}
          {detail?.messages.map((m) => (
            <div key={m.id} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-card px-3 py-2 text-sm ${m.role === "user" ? "bg-sable text-bg" : "bg-panel2 text-off"}`}>
                <p className="whitespace-pre-wrap">
                  <MarkdownLeger texte={m.contenu} />
                </p>
                {m.role === "assistant" && m.contenu && peutEditer && (
                  <button type="button" onClick={() => void sauvegarderEnIdee(m.contenu)} className="mt-1 text-xs text-dim underline hover:text-off">
                    {t("studio.sauvegarder_en_idee")}
                  </button>
                )}
                {detail.actions
                  .filter((a) => a.message_id === m.id && a.statut === "en_attente")
                  .map((action) => (
                    <div key={action.id} className="mt-2 rounded-field border border-sable/40 bg-panel p-2 text-xs text-off">
                      <p className="mb-1 font-medium">{t(`studio.outils.${action.outil}`)}</p>
                      <pre className="mb-2 max-w-full overflow-x-auto whitespace-pre-wrap text-[11px] text-dim">{JSON.stringify(action.apres_previsualise, null, 1)}</pre>
                      {peutEditer && (
                        <div className="flex gap-2">
                          <BoutonPrimaire type="button" onClick={() => void traiterAction(action, true)} className="!min-h-8 px-2 text-xs">
                            {t("studio.confirmer")}
                          </BoutonPrimaire>
                          <BoutonSecondaire type="button" onClick={() => void traiterAction(action, false)} className="!min-h-8 px-2 text-xs">
                            {t("commun.annuler")}
                          </BoutonSecondaire>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {erreurIa && <p className="rounded-field border border-danger-fg/40 bg-panel2 p-2 text-sm text-danger-fg">{t("studio.ia_indisponible")}</p>}
          <div ref={finDuFil} />
        </div>

        {peutEditer && (
          <div>
            {imagesEnAttente.length > 0 && <p className="mb-1 text-xs text-dim">{t("studio.images_jointes", { n: imagesEnAttente.length })}</p>}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <ChampZoneTexte
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void envoyer();
                    }
                  }}
                  rows={2}
                  placeholder={t("studio.placeholder")}
                />
              </div>
              <input ref={fichierRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => void surFichiers(e.target.files)} />
              <BoutonSecondaire type="button" onClick={() => fichierRef.current?.click()} disabled={imagesEnAttente.length >= 4}>
                📎
              </BoutonSecondaire>
              <BoutonPrimaire type="button" onClick={() => void envoyer()} disabled={envoiEnCours || !texte.trim()}>
                {t("studio.envoyer")}
              </BoutonPrimaire>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
