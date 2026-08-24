import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { tacheEnRetard, aCapacite, type Tache, type Campagne } from "@achirah/shared";
import { BoutonPrimaire, BoutonSecondaire } from "../components/ui/Champ.js";
import { useAuth } from "../lib/auth-context.js";
import { clientTaches } from "../lib/resources/taches.js";
import { clientCampagnes } from "../lib/resources/campagnes.js";
import { NouvelleTacheDialog } from "./plan/NouvelleTacheDialog.js";

function joursRestants(dateIso: string): number {
  return Math.round((new Date(dateIso).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function ListeTaches({ taches, vide }: { taches: Tache[]; vide: string }) {
  const { t } = useTranslation();
  if (taches.length === 0) return <p className="text-sm text-dim">{vide}</p>;
  return (
    <ul className="flex flex-col gap-1">
      {taches.map((tache) => (
        <li key={tache.id}>
          <Link to={`/plan/taches/${tache.id}`} className="flex min-h-tap items-center justify-between gap-2 rounded-field px-2 py-1 text-sm hover:bg-panel2">
            <span className="text-off">{tache.titre}</span>
            <span className="text-xs text-dim">{t(`taches.types.${tache.type}`)}</span>
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
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [enRetard, setEnRetard] = useState<Tache[] | null>(null);
  const [aujourdhui, setAujourdhui] = useState<Tache[] | null>(null);
  const [prochainsShootings, setProchainsShootings] = useState<Tache[] | null>(null);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [dette, setDette] = useState<Campagne[]>([]);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);

  useEffect(() => {
    clientTaches.lister({ quand: "retard" }).then(setEnRetard);
    clientTaches.lister({ quand: "aujourdhui" }).then(setAujourdhui);
    clientTaches.lister({ type: "shooting" }).then((liste) => {
      const aVenir = liste.filter((t) => t.date_echeance >= new Date().toISOString().slice(0, 10) && t.statut !== "fait");
      setProchainsShootings(aVenir.slice(0, 3));
    });
    clientCampagnes.lister("active").then(setCampagnes);
    clientCampagnes.detteDeMesure().then(setDette);
  }, []);

  const chapitreActif = campagnes[0];

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-off">{t("nav.espaces.home")}</h1>

      {chapitreActif && (
        <div className="mb-4 rounded-card border border-line bg-panel p-4">
          <Link to={`/plan/campagnes/${chapitreActif.id}`} className="font-display text-lg text-off hover:text-sable">
            {chapitreActif.nom}
          </Link>
          <p className="text-sm text-dim">J{joursRestants(chapitreActif.date_fin) >= 0 ? "-" : "+"}{Math.abs(joursRestants(chapitreActif.date_fin))} · {chapitreActif.date_fin}</p>
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <section className="rounded-card border border-line bg-panel p-4">
          <h2 className="mb-2 text-sm font-medium text-danger-fg">{t("aujourdhui.en_retard")}</h2>
          {enRetard ? <ListeTaches taches={enRetard} vide={t("aujourdhui.aucune_tache")} /> : <p className="text-sm text-dim">{t("commun.chargement")}</p>}
        </section>
        <section className="rounded-card border border-line bg-panel p-4">
          <h2 className="mb-2 text-sm font-medium text-sable">{t("aujourdhui.aujourdhui")}</h2>
          {aujourdhui ? <ListeTaches taches={aujourdhui} vide={t("aujourdhui.aucune_tache")} /> : <p className="text-sm text-dim">{t("commun.chargement")}</p>}
        </section>
      </div>

      <section className="mb-4 rounded-card border border-line bg-panel p-4">
        <h2 className="mb-2 text-sm font-medium text-dim">{t("aujourdhui.prochain_shooting")}</h2>
        {prochainsShootings ? <ListeTaches taches={prochainsShootings} vide={t("aujourdhui.aucun_shooting")} /> : <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      </section>

      {dette.length > 0 && (
        <section className="mb-4 rounded-card border border-sable/40 bg-panel2 p-4">
          <h2 className="mb-1 text-sm font-medium text-sable">{t("aujourdhui.dette_mesure")}</h2>
          <p className="text-sm text-off">
            {dette.length} {t("campagnes.dette_mesure")}
          </p>
        </section>
      )}

      <section className="mb-4 rounded-card border border-dashed border-line p-4 text-center">
        <h2 className="mb-1 text-sm font-medium text-dim">{t("aujourdhui.brief_ia")}</h2>
        <p className="text-sm text-dim">{t("aujourdhui.brief_ia_indisponible")}</p>
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

      <NouvelleTacheDialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} campagnes={campagnes} onCree={() => {}} />
    </div>
  );
}
