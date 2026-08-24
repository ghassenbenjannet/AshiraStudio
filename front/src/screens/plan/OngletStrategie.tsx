import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Campagne } from "@achirah/shared";
import { Champ, ChampTexte, ChampZoneTexte, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { Dialog } from "../../components/ui/Dialog.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { clientLecons } from "../../lib/resources/grow.js";
import { ReferencesCampagne } from "./ReferencesCampagne.js";
import { CommentairesPanel } from "../../components/collaboration/CommentairesPanel.js";
import { clientExports } from "../../lib/resources/systeme.js";

export function OngletStrategie({ campagne, peutEditer, onChange }: { campagne: Campagne; peutEditer: boolean; onChange: () => void }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [description, setDescription] = useState(campagne.description ?? "");
  const [dialogueFermetureOuvert, setDialogueFermetureOuvert] = useState(false);
  const [rapport, setRapport] = useState({ marche: "", pas_marche: "", decisions: "" });
  const [erreurFermeture, setErreurFermeture] = useState<string | null>(null);
  const [leconsProposees, setLeconsProposees] = useState<Set<"marche" | "pas_marche" | "decisions">>(new Set());

  useEffect(() => setDescription(campagne.description ?? ""), [campagne.description]);

  async function enregistrerDescription() {
    try {
      await clientCampagnes.modifier(campagne.id, { description: description || null });
      toaster(t("referentiels.modifie"));
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function activer() {
    try {
      await clientCampagnes.activer(campagne.id);
      toaster(t("campagnes.activer"));
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function passerLivree() {
    try {
      await clientCampagnes.modifier(campagne.id, { statut: "livree" });
      onChange();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function fermer() {
    setErreurFermeture(null);
    try {
      await clientCampagnes.fermer(campagne.id, rapport);
      toaster(t("campagnes.fermer"));
      setDialogueFermetureOuvert(false);
      onChange();
    } catch (err) {
      setErreurFermeture(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    }
  }

  const TYPE_PAR_CHAMP = { marche: "gagnant", pas_marche: "perdant", decisions: "regle_maison" } as const;

  async function proposerLecon(champ: "marche" | "pas_marche" | "decisions") {
    if (!campagne.rapport) return;
    try {
      await clientLecons.creer({
        type: TYPE_PAR_CHAMP[champ],
        texte: campagne.rapport[champ].slice(0, 280),
        preuve: TYPE_PAR_CHAMP[champ] === "regle_maison" ? null : `${campagne.nom} — ${t(`campagnes.rapport.${champ}`)}`,
        campagne_id: campagne.id,
      });
      setLeconsProposees((s) => new Set(s).add(champ));
      toaster(t("grow.lecons.proposee"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function genererRituel() {
    try {
      const taches = await clientCampagnes.genererRituel(campagne.id);
      toaster(`${t("campagnes.rituel_genere")} (${taches.length})`);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {peutEditer && campagne.statut === "preparation" && (
          <BoutonPrimaire type="button" onClick={() => void activer()}>
            {t("campagnes.activer")}
          </BoutonPrimaire>
        )}
        {peutEditer && campagne.statut === "active" && (
          <BoutonSecondaire type="button" onClick={() => void passerLivree()}>
            → {t("campagnes.statuts.livree")}
          </BoutonSecondaire>
        )}
        {peutEditer && campagne.statut === "livree" && (
          <BoutonPrimaire type="button" onClick={() => setDialogueFermetureOuvert(true)}>
            {t("campagnes.fermer")}
          </BoutonPrimaire>
        )}
        {peutEditer && (
          <BoutonSecondaire type="button" onClick={() => void genererRituel()}>
            {t("campagnes.generer_rituel")}
          </BoutonSecondaire>
        )}
        <a
          href={clientExports.rapportCampagnePdfUrl(campagne.id)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-tap items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable"
        >
          {t("campagnes.exporter_rapport_pdf")}
        </a>
      </div>

      <div className="mb-4 grid gap-x-4 text-sm md:grid-cols-3">
        <p>
          <span className="text-dim">{t("campagnes.champs.date_debut")}:</span> {campagne.date_debut}
        </p>
        <p>
          <span className="text-dim">{t("campagnes.champs.date_fin")}:</span> {campagne.date_fin}
        </p>
        <p>
          <span className="text-dim">{t("campagnes.champs.objectif")}:</span> {t(`campagnes.objectifs.${campagne.objectif}`)}
        </p>
      </div>

      {Object.keys(campagne.kpi_cibles).length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-sm text-dim">
            {t("campagnes.kpi_cibles")} {campagne.kpi_cibles_verrouillees && `(${t("campagnes.kpi_verrouillees")})`}
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-off">
            {Object.entries(campagne.kpi_cibles).map(([k, v]) => (
              <span key={k} className="rounded-field border border-line bg-panel2 px-2 py-1">
                {k}: {String(v)}
                {campagne.resultats[k] !== undefined && <span className="text-dim"> → {String(campagne.resultats[k])}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {campagne.rapport && (
        <div className="mb-4 rounded-card border border-line bg-panel p-3 text-sm">
          <p className="mb-2 font-medium text-off">{t("campagnes.rapport.titre")}</p>
          {(["marche", "pas_marche", "decisions"] as const).map((champ) => (
            <div key={champ} className="mb-2 flex items-center justify-between gap-2">
              <p>
                <span className="text-dim">{t(`campagnes.rapport.${champ}`)}:</span> {campagne.rapport![champ]}
              </p>
              {peutEditer &&
                (leconsProposees.has(champ) ? (
                  <span className="shrink-0 text-xs text-olive">{t("grow.lecons.proposee")}</span>
                ) : (
                  <BoutonSecondaire type="button" onClick={() => void proposerLecon(champ)} className="!min-h-8 shrink-0 px-2 text-xs">
                    {t("grow.lecons.proposer_depuis_rapport")}
                  </BoutonSecondaire>
                ))}
            </div>
          ))}
        </div>
      )}

      <Champ label={t("campagnes.champs.description")}>
        <ChampZoneTexte disabled={!peutEditer} value={description} onChange={(e) => setDescription(e.target.value)} onBlur={enregistrerDescription} rows={4} />
      </Champ>

      <ReferencesCampagne campagneId={campagne.id} peutEditer={peutEditer} />

      <div className="mt-6 rounded-card border border-line bg-panel p-4">
        <CommentairesPanel entiteType="campagne" entiteId={campagne.id} />
      </div>

      <Dialog ouvert={dialogueFermetureOuvert} onFermer={() => setDialogueFermetureOuvert(false)} titre={t("campagnes.rapport.titre")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void fermer();
          }}
        >
          <Champ label={t("campagnes.rapport.marche")}>
            <ChampTexte required value={rapport.marche} onChange={(e) => setRapport((r) => ({ ...r, marche: e.target.value }))} />
          </Champ>
          <Champ label={t("campagnes.rapport.pas_marche")}>
            <ChampTexte required value={rapport.pas_marche} onChange={(e) => setRapport((r) => ({ ...r, pas_marche: e.target.value }))} />
          </Champ>
          <Champ label={t("campagnes.rapport.decisions")}>
            <ChampTexte required value={rapport.decisions} onChange={(e) => setRapport((r) => ({ ...r, decisions: e.target.value }))} />
          </Champ>
          {erreurFermeture && <p className="mb-3 text-sm text-danger-fg">{erreurFermeture}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueFermetureOuvert(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("campagnes.fermer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
