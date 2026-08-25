import { useState } from "react";
import { useTranslation } from "react-i18next";
import { aCapacite } from "@achirah/shared";
import { Tabs } from "../components/ui/Tabs.js";
import { TableReferentiel, type ChampConfig } from "../components/referentiels/TableReferentiel.js";
import { useAuth } from "../lib/auth-context.js";
import {
  clientGammes,
  clientCategoriesProduit,
  clientColoris,
  clientMatieres,
  clientCodesEntretien,
  clientGrillesTaille,
  clientPostesBudgetaires,
  clientCanaux,
  clientPlateformesContenu,
  clientOccasions,
  clientModelesChecklist,
  clientRegistres,
  clientTypesCampagne,
  clientModelesRituel,
} from "../lib/resources/referentiels.js";
import { UtilisateursAdmin } from "./parametres/UtilisateursAdmin.js";
import { ReglagesNotifications } from "./parametres/ReglagesNotifications.js";
import { JournalAudit } from "./parametres/JournalAudit.js";
import { SauvegardesAdmin } from "./parametres/SauvegardesAdmin.js";
import { Observabilite } from "./parametres/Observabilite.js";
import { Configuration } from "./parametres/Configuration.js";
import { Integrations } from "./measure/Integrations.js";
import { CharteInterface } from "./parametres/CharteInterface.js";

const champsGamme: ChampConfig[] = [
  { cle: "nom", label: "Nom", type: "texte", requis: true },
  { cle: "code_prefixe", label: "Préfixe (2-3 lettres)", type: "texte", requis: true, verrouilleSiExistant: true },
  { cle: "couleur", label: "Couleur", type: "couleur" },
  { cle: "marge_cible_pct", label: "Marge cible (%)", type: "nombre" },
  { cle: "alerte_baisse_prix", label: "Alerter en cas de baisse de prix", type: "case" },
  { cle: "message_alerte", label: "Message d'alerte", type: "texte" },
];

const champsCategorieProduit: ChampConfig[] = [
  { cle: "nom", label: "Nom", type: "texte", requis: true },
  { cle: "slot_look", label: "Emplacement (haut|bas|chaussures|accessoire)", type: "texte", requis: true },
  { cle: "grille_tailles_id", label: "ID grille de tailles", type: "texte", requis: true },
  { cle: "gabarit_mesures", label: "Gabarit (haut|bas|tete|aucun)", type: "texte", requis: true },
];

const champsColoris: ChampConfig[] = [
  { cle: "nom_commercial", label: "Nom commercial", type: "texte", requis: true },
  { cle: "code_3l", label: "Code (3 lettres)", type: "texte", requis: true },
  { cle: "hex", label: "Couleur (hex)", type: "couleur", requis: true },
];

const champsMatiere: ChampConfig[] = [
  { cle: "nom", label: "Nom", type: "texte", requis: true },
  { cle: "nom_ar", label: "Nom (arabe)", type: "texte" },
  { cle: "note", label: "Note", type: "texte" },
];

const champsNomOrdre: ChampConfig[] = [{ cle: "nom", label: "Nom", type: "texte", requis: true }];

const champsGrilleTaille: ChampConfig[] = [
  { cle: "nom", label: "Nom", type: "texte", requis: true },
  { cle: "valeurs", label: "Valeurs (séparées par virgule)", type: "valeurs", requis: true },
];

const champsModeleChecklist: ChampConfig[] = [
  { cle: "nom", label: "Nom", type: "texte", requis: true },
  { cle: "items", label: "Éléments (séparés par virgule)", type: "valeurs" },
];

const champsRegistre: ChampConfig[] = [
  { cle: "code", label: "Code", type: "texte", requis: true },
  { cle: "nom", label: "Nom", type: "texte", requis: true },
  { cle: "description", label: "Description", type: "texte" },
];

const champsTypeCampagne: ChampConfig[] = [
  { cle: "nom", label: "Nom", type: "texte", requis: true },
  { cle: "modele_rituel_id", label: "ID modèle de rituel (optionnel)", type: "texte" },
];

const champsModeleRituel: ChampConfig[] = [{ cle: "nom", label: "Nom", type: "texte", requis: true }];

/** E31 — Paramètres : référentiels (Partie V) + utilisateurs. */
export function Parametres() {
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const [onglet, setOnglet] = useState<"referentiels" | "utilisateurs" | "configuration" | "interface" | "notifications" | "audit" | "sauvegardes" | "observabilite">("utilisateurs");
  const peutGererReferentiels = !!utilisateur && aCapacite(utilisateur.role_systeme, "approbation.gerer");
  const peutGererUtilisateurs = !!utilisateur && aCapacite(utilisateur.role_systeme, "parametres.gerer");
  const peutGererSysteme = !!utilisateur && aCapacite(utilisateur.role_systeme, "parametres.gerer");

  const onglets = [
    { id: "referentiels" as const, label: t("referentiels.onglet_referentiels") },
    { id: "utilisateurs" as const, label: t("referentiels.onglet_utilisateurs") },
    ...(peutGererSysteme ? [{ id: "configuration" as const, label: t("configuration.titre") }] : []),
    { id: "interface" as const, label: "Charte UI" },
    { id: "notifications" as const, label: t("notifications.titre") },
    ...(peutGererSysteme
      ? [
          { id: "audit" as const, label: t("audit.titre") },
          { id: "sauvegardes" as const, label: t("sauvegardes.titre") },
          { id: "observabilite" as const, label: t("observabilite.titre") },
        ]
      : []),
  ];

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-off">{t("nav.espaces.parametres")}</h1>
      <Tabs valeur={onglet} onChange={setOnglet} onglets={onglets} />

      {onglet === "referentiels" && (
        <div>
          <TableReferentiel titre={t("referentiels.sections.gammes")} champs={champsGamme} colonneAffichage={(l: any) => `${l.nom} (${l.code_prefixe})`} client={clientGammes} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.categories_produit")} champs={champsCategorieProduit} colonneAffichage={(l: any) => l.nom} client={clientCategoriesProduit} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.coloris")} champs={champsColoris} colonneAffichage={(l: any) => `${l.nom_commercial} (${l.code_3l})`} client={clientColoris} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.matieres")} champs={champsMatiere} colonneAffichage={(l: any) => l.nom} client={clientMatieres} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.codes_entretien")} champs={champsNomOrdre} colonneAffichage={(l: any) => l.nom} client={clientCodesEntretien} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.grilles_taille")} champs={champsGrilleTaille} colonneAffichage={(l: any) => `${l.nom} — ${l.valeurs.join(", ")}`} client={clientGrillesTaille} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.postes_budgetaires")} champs={champsNomOrdre} colonneAffichage={(l: any) => l.nom} client={clientPostesBudgetaires} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.canaux")} champs={champsNomOrdre} colonneAffichage={(l: any) => l.nom} client={clientCanaux} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.plateformes_contenu")} champs={champsNomOrdre} colonneAffichage={(l: any) => l.nom} client={clientPlateformesContenu} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.occasions")} champs={champsNomOrdre} colonneAffichage={(l: any) => l.nom} client={clientOccasions} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.modeles_checklist")} champs={champsModeleChecklist} colonneAffichage={(l: any) => `${l.nom} (${l.items.length})`} client={clientModelesChecklist} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.registres")} champs={champsRegistre} colonneAffichage={(l: any) => `${l.code} — ${l.nom}`} client={clientRegistres} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.types_campagne")} champs={champsTypeCampagne} colonneAffichage={(l: any) => l.nom} client={clientTypesCampagne} peutEditer={peutGererReferentiels} />
          <TableReferentiel titre={t("referentiels.sections.modeles_rituel")} champs={champsModeleRituel} colonneAffichage={(l: any) => `${l.nom} (${l.jalons.length} jalons)`} client={clientModelesRituel} peutEditer={peutGererReferentiels} />
        </div>
      )}

      {onglet === "utilisateurs" && <UtilisateursAdmin peutGerer={peutGererUtilisateurs} />}
      {onglet === "configuration" && peutGererSysteme && (
        <div className="flex flex-col gap-5">
          <Configuration />
          <section className="rounded-card border border-line bg-panel p-4 sm:p-5">
            <div className="mb-4"><h2 className="font-display text-xl font-semibold text-off">{t("configuration.blocs.plateformes.titre")}</h2><p className="mt-1 text-sm text-dim">{t("configuration.blocs.plateformes.aide")}</p></div>
            <Integrations />
          </section>
        </div>
      )}
      {onglet === "interface" && <CharteInterface />}
      {onglet === "notifications" && <ReglagesNotifications />}
      {onglet === "audit" && peutGererSysteme && <JournalAudit />}
      {onglet === "sauvegardes" && peutGererSysteme && <SauvegardesAdmin />}
      {onglet === "observabilite" && peutGererSysteme && <Observabilite />}
    </div>
  );
}
