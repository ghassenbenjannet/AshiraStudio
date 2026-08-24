import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./i18n/index.js";
import "./styles/index.css";
import { App } from "./App.js";
import { AuthProvider } from "./lib/auth-context.js";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Élément #root introuvable");

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
