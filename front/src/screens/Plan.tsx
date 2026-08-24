import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "../components/ui/Tabs.js";
import { CampagnesListe } from "./plan/CampagnesListe.js";
import { TachesBoard } from "./plan/TachesBoard.js";

/** PLAN — campagnes, tâches (le board couvre Liste/Kanban/Calendrier — E04+E18), budgets (dans chaque campagne). */
export function Plan() {
  const { t } = useTranslation();
  const [onglet, setOnglet] = useState<"campagnes" | "taches">("campagnes");

  return (
    <div>
      <Tabs
        valeur={onglet}
        onChange={setOnglet}
        onglets={[
          { id: "campagnes", label: t("campagnes.titre") },
          { id: "taches", label: t("taches.titre") },
        ]}
      />
      {onglet === "campagnes" ? <CampagnesListe /> : <TachesBoard />}
    </div>
  );
}
