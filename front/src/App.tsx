import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./lib/auth-context.js";
import { AppShell } from "./components/layout/AppShell.js";
import { Login } from "./screens/Login.js";
import { Init } from "./screens/Init.js";
import { Aujourdhui } from "./screens/Aujourdhui.js";
import { Plan } from "./screens/Plan.js";
import { FicheCampagne } from "./screens/plan/FicheCampagne.js";
import { FicheTache } from "./screens/plan/FicheTache.js";
import { Create } from "./screens/Create.js";
import { FicheContenu } from "./screens/create/FicheContenu.js";
import { BoardCanvas } from "./screens/create/BoardCanvas.js";
import { Grow } from "./screens/Grow.js";
import { Measure } from "./screens/Measure.js";
import { People } from "./screens/People.js";
import { FicheContact } from "./screens/people/FicheContact.js";
import { Cercle } from "./screens/people/Cercle.js";
import { Parametres } from "./screens/Parametres.js";
import { Catalogue } from "./screens/Catalogue.js";
import { FicheArticle } from "./screens/catalogue/FicheArticle.js";
import { ImportCsv } from "./screens/catalogue/ImportCsv.js";
import { Plus } from "./screens/Plus.js";

function ChargementPleinEcran() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <p className="text-dim">{t("commun.chargement")}</p>
    </div>
  );
}

/**
 * Portail unique : pas initialisé → /init ; initialisé sans session → /login ;
 * session active → application (AppShell). Aucun écran dont le seul chemin est conversationnel (RG-PAR1b) —
 * cette porte ne fait que déterminer QUI peut entrer, pas COMMENT on agit une fois dedans.
 */
export function App() {
  const { chargement, initStatut, utilisateur } = useAuth();
  const location = useLocation();

  if (chargement || !initStatut.verifie) return <ChargementPleinEcran />;

  if (!initStatut.initialise) {
    return (
      <Routes>
        <Route path="/init" element={<Init />} />
        <Route path="*" element={<Navigate to="/init" replace />} />
      </Routes>
    );
  }

  if (!utilisateur) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" state={{ depuis: location.pathname }} replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/aujourdhui" replace />} />
      <Route path="/init" element={<Navigate to="/aujourdhui" replace />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/aujourdhui" replace />} />
        <Route path="/aujourdhui" element={<Aujourdhui />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/plan/campagnes/:id" element={<FicheCampagne />} />
        <Route path="/plan/taches/:id" element={<FicheTache />} />
        <Route path="/create" element={<Create />} />
        <Route path="/create/contenus/:id" element={<FicheContenu />} />
        <Route path="/create/boards/:id" element={<BoardCanvas />} />
        <Route path="/grow" element={<Grow />} />
        <Route path="/measure" element={<Measure />} />
        <Route path="/people" element={<People />} />
        <Route path="/people/cercle" element={<Cercle />} />
        <Route path="/people/:id" element={<FicheContact />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/catalogue/import" element={<ImportCsv />} />
        <Route path="/catalogue/:id" element={<FicheArticle />} />
        <Route path="/plus" element={<Plus />} />
      </Route>
      <Route path="*" element={<Navigate to="/aujourdhui" replace />} />
    </Routes>
  );
}
