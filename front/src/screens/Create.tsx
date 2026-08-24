import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs } from "../components/ui/Tabs.js";
import { IdeesListe } from "./create/IdeesListe.js";
import { ContenusListe } from "./create/ContenusListe.js";
import { AssetsGalerie } from "./create/AssetsGalerie.js";
import { BoardsListe } from "./create/BoardsListe.js";

/** CREATE — idées, contenus, assets, boards (E13/E15/E16/E17). Le Studio IA (E12) arrive en Phase ⑤. */
export function Create() {
  const { t } = useTranslation();
  const [onglet, setOnglet] = useState<"idees" | "contenus" | "assets" | "boards">("contenus");

  return (
    <div>
      <Tabs
        valeur={onglet}
        onChange={setOnglet}
        onglets={[
          { id: "contenus", label: t("contenus.titre") },
          { id: "idees", label: t("idees.titre") },
          { id: "assets", label: t("assets.titre") },
          { id: "boards", label: t("boards.titre") },
        ]}
      />
      {onglet === "contenus" && <ContenusListe />}
      {onglet === "idees" && <IdeesListe />}
      {onglet === "assets" && <AssetsGalerie />}
      {onglet === "boards" && <BoardsListe />}
    </div>
  );
}
