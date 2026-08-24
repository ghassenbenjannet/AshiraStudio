import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { tacheEnRetard, aCapacite, type Tache, type Campagne } from "@achirah/shared";
import { BoutonPrimaire, BoutonSecondaire, ChampTexte } from "../components/ui/Champ.js";
import { MarkdownLeger } from "../components/ui/MarkdownLeger.js";
import { useAuth } from "../lib/auth-context.js";
import { useCampagneContexte } from "../lib/campagne-contexte.js";
import { ApiError } from "../lib/api.js";
import { clientTaches } from "../lib/resources/taches.js";
import { clientCampagnes } from "../lib/resources/campagnes.js";
import { clientBrain, type BriefQuotidien } from "../lib/resources/brain.js";
import { NouvelleTacheDialog } from "./plan/NouvelleTacheDialog.js";

function joursRestants(dateIso: string): number {
  return Math.round((new Date(dateIso).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function ListeTaches({ taches, vide, campagneParId }: { taches: Tache[]; vide: string; campagneParId: Map<string, string> }) {
  const { t } = useTranslation();
  if (taches.length === 0) return <p className="text-sm text-dim">{vide}</p>;
  return (
    <ul className="flex flex-col gap-1">
      {taches.map((tache) => (
        <li key={tache.id}>
          <Link to={`/plan/taches/${tache.id}`} className="flex min-h-tap items-center justify-between gap-2 rounded-field px-2 py-1 text-sm hover:bg-panel2">
            <span className="min-w-0"><span className="block truncate font-medium text-off">{tache.titre}</span><span className="block truncate text-xs text-dim">{campagneParId.get(tache.campagne_id) ?? "Campagne"} · {t(`taches.types.${tache.type}`)}</span></span>
            <span className="shrink-0 text-xs text-dim">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** E03 — Aujourd'hui : cockpit. Blocs Business/Marketing/Social/Brief IA arrivent en Phases ⑤/⑥. */
export function Aujourdhui() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const { campagneActive, campagneActiveId, mode } = useCampagneContexte();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [enRetard, setEnRetard] = useState<Tache[] | null>(null);
  const [aujourdhui, setAujourdhui] = useState<Tache[] | null>(null);
  const [prochainsShootings, setProchainsShootings] = useState<Tache[] | null>(null);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [dette, setDette] = useState<Campagne[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [brief, setBrief] = useState<BriefQuotidien | null>(null);
  const [erreurBrief, setErreurBrief] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [reponse, setReponse] = useState<string | null>(null);
  const [questionEnCours, setQuestionEnCours] = useState(false);
  const [erreurQuestion, setErreurQuestion] = useState<string | null>(null);

  useEffect(() => {
    const filtreCampagne = mode === "campagne" ? (campagneActiveId ?? undefined) : undefined;
    clientTaches.lister({ quand: "retard", campagne_id: filtreCampagne }).then(setEnRetard);
    clientTaches.lister({ quand: "aujourdhui", campagne_id: filtreCampagne }).then(setAujourdhui);
    clientTaches.lister({ type: "shooting", campagne_id: filtreCampagne }).then((liste) => {
      const aVenir = liste.filter((t) => t.date_echeance >= new Date().toISOString().slice(0, 10) && t.statut !== "fait");
      setProchainsShootings(aVenir.slice(0, 3));
    });
    clientCampagnes.lister().then(setCampagnes);
    clientCampagnes.detteDeMesure().then((liste) => setDette(filtreCampagne ? liste.filter((c) => c.id === filtreCampagne) : liste));
    clientBrain
      .brief()
      .then(setBrief)
      .catch((err) => setErreurBrief(err instanceof ApiError && err.status === 503 ? t("aujourdhui.brief_ia_indisponible") : t("commun.erreur_generique")));
  }, [t, campagneActiveId, mode]);

  async function poserQuestion() {
    if (!question.trim()) return;
    setQuestionEnCours(true);
    setErreurQuestion(null);
    setReponse(null);
    try {
      const r = await clientBrain.question(question);
      setReponse(r.contenu);
    } catch (err) {
      setErreurQuestion(err instanceof ApiError && err.status === 503 ? t("aujourdhui.brief_ia_indisponible") : t("commun.erreur_generique"));
    } finally {
      setQuestionEnCours(false);
    }
  }

  const campagneParId = new Map(campagnes.map((campagne) => [campagne.id, campagne.nom]));

  return (
    <div>
      <section className="relative mb-5 overflow-hidden rounded-[20px] bg-sable p-5 text-white sm:p-6">
        <div aria-hidden="true" className="absolute -right-6 -top-14 font-display text-[180px] leading-none text-white opacity-[0.07]">ع</div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Aujourd’hui chez Achirah</p>
            <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">
              Bonjour {utilisateur?.nom.split(" ")[0] ?? "l’équipe"}
            </h1>
            {campagneActive && (
              <Link to={`/plan/campagnes/${campagneActive.id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white">
                <span>{campagneActive.nom}</span>
                <span className="rounded-full bg-white/15 px-2 py-1 text-xs">J{joursRestants(campagneActive.date_fin) >= 0 ? "-" : "+"}{Math.abs(joursRestants(campagneActive.date_fin))}</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
            {!campagneActive && mode === "toutes" && (
              <p className="mt-3 text-sm font-medium text-white/80">{t("nav.contexte.toutes")}</p>
            )}
          </div>
          {peutEditer && (
            <button type="button" onClick={() => setDialogueOuvert(true)} className="min-h-tap rounded-[11px] bg-white px-4 text-sm font-semibold text-sable shadow-sm hover:bg-[#FFF7EF]">
              + {t("aujourdhui.nouvelle_tache")}
            </button>
          )}
        </div>
      </section>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-card border border-line bg-panel p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-danger-fg"><span className="h-2 w-2 rounded-full bg-danger-fg" />{t("aujourdhui.en_retard")}</h2>
          {enRetard ? <ListeTaches taches={enRetard} vide={t("aujourdhui.aucune_tache")} campagneParId={campagneParId} /> : <p className="text-sm text-dim">{t("commun.chargement")}</p>}
        </section>
        <section className="rounded-card border border-line bg-panel p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-olive"><span className="h-2 w-2 rounded-full bg-olive" />{t("aujourdhui.aujourdhui")}</h2>
          {aujourdhui ? <ListeTaches taches={aujourdhui} vide={t("aujourdhui.aucune_tache")} campagneParId={campagneParId} /> : <p className="text-sm text-dim">{t("commun.chargement")}</p>}
        </section>
      </div>

      <section className="mb-4 rounded-card border border-line bg-panel p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-medium text-dim">{t("aujourdhui.prochain_shooting")}</h2>
        {prochainsShootings ? <ListeTaches taches={prochainsShootings} vide={t("aujourdhui.aucun_shooting")} campagneParId={campagneParId} /> : <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      </section>

      {dette.length > 0 && (
        <section className="mb-4 rounded-card border border-[#F2C8B5] bg-[#FDEEE6] p-4">
          <h2 className="mb-1 text-sm font-medium text-sable">{t("aujourdhui.dette_mesure")}</h2>
          <p className="text-sm text-off">
            {dette.length} {t("campagnes.dette_mesure")}
          </p>
        </section>
      )}

      <section className="mb-4 rounded-card border border-line bg-panel p-4">
        <h2 className="mb-2 text-sm font-medium text-dim">{t("aujourdhui.brief_ia")}</h2>
        {erreurBrief && <p className="text-sm text-dim">{erreurBrief}</p>}
        {!brief && !erreurBrief && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
        {brief && (
          <div>
            <ul className="mb-3 list-inside list-disc text-sm text-off">
              {brief.constats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <div className="flex flex-col gap-1">
              {brief.actions.map((a, i) => (
                <p key={i} className="text-sm">
                  <span className="font-medium text-sable">{a.titre}</span> — <span className="text-dim">{a.description}</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mb-4 rounded-card border border-line bg-panel p-4">
        <h2 className="mb-2 text-sm font-medium text-dim">{t("aujourdhui.demander")}</h2>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <ChampTexte
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void poserQuestion();
              }}
              placeholder={t("aujourdhui.demander_placeholder")}
            />
          </div>
          <BoutonSecondaire type="button" onClick={() => void poserQuestion()} disabled={questionEnCours || !question.trim()}>
            {t("aujourdhui.demander")}
          </BoutonSecondaire>
        </div>
        {erreurQuestion && <p className="mt-2 text-sm text-danger-fg">{erreurQuestion}</p>}
        {reponse && (
          <p className="mt-2 text-sm text-off">
            <MarkdownLeger texte={reponse} />
          </p>
        )}
      </section>

      {peutEditer && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-dim">{t("aujourdhui.raccourcis")}</h2>
          <div className="flex flex-wrap gap-2">
            <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
              {t("aujourdhui.nouvelle_tache")}
            </BoutonPrimaire>
            <BoutonSecondaire type="button" onClick={() => navigate("/create")}>
              {t("aujourdhui.nouvelle_idee")}
            </BoutonSecondaire>
          </div>
        </section>
      )}

      <NouvelleTacheDialog
        ouvert={dialogueOuvert}
        onFermer={() => setDialogueOuvert(false)}
        campagnes={campagnes}
        campagneParDefaut={campagneActiveId ?? undefined}
        onCree={() => {}}
      />
    </div>
  );
}
