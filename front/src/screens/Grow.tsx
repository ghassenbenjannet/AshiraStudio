import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "../components/ui/Tabs.js";
import { RecommandationsListe } from "./grow/RecommandationsListe.js";
import { TendancesListe } from "./grow/TendancesListe.js";
import { VeilleConcurrents } from "./grow/VeilleConcurrents.js";
import { Lexique } from "./grow/Lexique.js";
import { Lecons } from "./grow/Lecons.js";

/** GROW (E21) — recommandations, tendances (E22), veille concurrents (E23), lexique (E25), leçons (E26). */
export function Grow() {
  const { t } = useTranslation();
  const [onglet, setOnglet] = useState<"recommandations" | "tendances" | "veille" | "lexique" | "lecons">("recommandations");

  return (
    <div>
      <Tabs
        valeur={onglet}
        onChange={setOnglet}
        onglets={[
          { id: "recommandations", label: t("grow.onglets.recommandations") },
          { id: "tendances", label: t("grow.onglets.tendances") },
          { id: "veille", label: t("grow.onglets.veille") },
          { id: "lexique", label: t("grow.onglets.lexique") },
          { id: "lecons", label: t("grow.onglets.lecons") },
        ]}
      />
      {onglet === "recommandations" && <RecommandationsListe />}
      {onglet === "tendances" && <TendancesListe />}
      {onglet === "veille" && <VeilleConcurrents />}
      {onglet === "lexique" && <Lexique />}
      {onglet === "lecons" && <Lecons />}
    </div>
  );
}
