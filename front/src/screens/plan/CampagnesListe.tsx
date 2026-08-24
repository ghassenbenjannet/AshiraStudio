import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { STATUT_CAMPAGNE, aCapacite, type Campagne } from "@achirah/shared";
import { ChampSelect, BoutonPrimaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useCampagneContexte } from "../../lib/campagne-contexte.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { NouvelleCampagneDialog } from "./NouvelleCampagneDialog.js";
import { clientExports } from "../../lib/resources/systeme.js";
import { Icone } from "../../components/ui/Icone.js";

const PASTILLE: Record<string, string> = {
  preparation: "bg-dim",
  active: "bg-sable",
  livree: "bg-olive",
  fermee: "bg-dim",
  abandonnee: "bg-danger-fg",
};

export function CampagnesListe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const { definirCampagneActive, rafraichir } = useCampagneContexte();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");
  const [campagnes, setCampagnes] = useState<Campagne[] | null>(null);
  const [statut, setStatut] = useState("");
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [dette, setDette] = useState<Campagne[]>([]);

  const charger = () => clientCampagnes.lister(statut || undefined).then(setCampagnes);

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut]);

  useEffect(() => {
    clientCampagnes.detteDeMesure().then(setDette);
  }, []);

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-off">{t("campagnes.gerer")}</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <ChampSelect value={statut} onChange={(e) => setStatut(e.target.value)} className="!w-44">
          <option value="">{t("campagnes.filtrer_statut")}</option>
          {STATUT_CAMPAGNE.map((s) => (
            <option key={s} value={s}>
              {t(`campagnes.statuts.${s}`)}
            </option>
          ))}
        </ChampSelect>
        <div className="flex gap-2">
          <a href={clientExports.campagnesUrl("csv")} className="flex min-h-tap items-center gap-2 rounded-field border border-line bg-panel px-3 text-sm font-semibold text-off outline-none hover:border-sable hover:text-sable focus-visible:ring-2 focus-visible:ring-sable/35">
            <Icone nom="exporter" taille={17} />
            {t("commun.exporter_csv")}
          </a>
          {peutEditer && (
            <BoutonPrimaire type="button" icone="ajouter" onClick={() => setDialogueOuvert(true)}>
              {t("campagnes.nouvelle")}
            </BoutonPrimaire>
          )}
        </div>
      </div>

      {dette.length > 0 && (
        <p className="mb-3 rounded-field border border-sable/40 bg-panel2 px-3 py-2 text-sm text-sable">
          {dette.length} {t("campagnes.dette_mesure")}
        </p>
      )}

      {!campagnes && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {campagnes && (
        <ul className="divide-y divide-line rounded-card border border-line">
          {campagnes.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => navigate(`/plan/campagnes/${c.id}`)}
                className="flex min-h-tap w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-panel2"
              >
                <div>
                  <p className="text-sm text-off">{c.nom}</p>
                  <p className="text-xs text-dim">
                    {c.date_debut} → {c.date_fin}
                  </p>
                </div>
                <span className="flex items-center gap-2 text-xs text-dim">
                  <span className={`h-2 w-2 rounded-full ${PASTILLE[c.statut]}`} />
                  {t(`campagnes.statuts.${c.statut}`)}
                  <Icone nom="suivant" taille={16} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <NouvelleCampagneDialog
        ouvert={dialogueOuvert}
        onFermer={() => setDialogueOuvert(false)}
        onCree={(campagne) => {
          charger();
          rafraichir();
          definirCampagneActive(campagne.id);
        }}
      />
    </div>
  );
}
