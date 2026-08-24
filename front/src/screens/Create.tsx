import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "../components/ui/Tabs.js";
import { Studio } from "./create/Studio.js";
import { IdeesListe } from "./create/IdeesListe.js";
import { ContenusListe } from "./create/ContenusListe.js";
import { AssetsGalerie } from "./create/AssetsGalerie.js";
import { BoardsListe } from "./create/BoardsListe.js";

/** CREATE — Studio, idées, contenus, assets, boards (E12/E13/E15/E16/E17). */
export function Create() {
  const { t } = useTranslation();
  const [onglet, setOnglet] = useState<"studio" | "idees" | "contenus" | "assets" | "boards">("studio");

  return (
    <div>
      <Tabs
        valeur={onglet}
        onChange={setOnglet}
        onglets={[
          { id: "studio", label: t("studio.titre") },
          { id: "contenus", label: t("contenus.titre") },
          { id: "idees", label: t("idees.titre") },
          { id: "assets", label: t("assets.titre") },
          { id: "boards", label: t("boards.titre") },
        ]}
      />
      {onglet === "studio" && <Studio />}
      {onglet === "contenus" && <ContenusListe />}
      {onglet === "idees" && <IdeesListe />}
      {onglet === "assets" && <AssetsGalerie />}
      {onglet === "boards" && <BoardsListe />}
    </div>
  );
}
