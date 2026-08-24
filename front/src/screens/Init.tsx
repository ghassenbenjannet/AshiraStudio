import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context.js";
import { ApiError } from "../lib/api.js";
import { Filigrane } from "../components/ui/Filigrane.js";
import { MOTS_DE_PASSE_LONGUEUR_MIN } from "@achirah/shared";

/** E02 — Initialisation : 1er compte admin + seed complet + progression (§2.1, Annexes A-F). */
export function Init() {
  const { t } = useTranslation();
  const { initialiser } = useAuth();
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await initialiser(email, nom, motDePasse);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
      setEnCours(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-bg px-4">
      <Filigrane />
      <form onSubmit={soumettre} className="relative z-10 w-full max-w-sm rounded-card border border-line bg-panel p-6">
        <h1 className="mb-1 font-display text-2xl text-off">{t("init.titre")}</h1>
        <p className="mb-6 text-sm text-dim">{t("init.sous_titre")}</p>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-dim">{t("init.nom")}</span>
          <input
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="min-h-tap w-full rounded-field border border-line bg-panel2 px-3 text-off outline-none focus:border-sable"
            dir="auto"
          />
        </label>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-dim">{t("auth.email")}</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-tap w-full rounded-field border border-line bg-panel2 px-3 text-off outline-none focus:border-sable"
            dir="auto"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-dim">{t("auth.mot_de_passe")}</span>
          <input
            type="password"
            required
            minLength={MOTS_DE_PASSE_LONGUEUR_MIN}
            autoComplete="new-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="min-h-tap w-full rounded-field border border-line bg-panel2 px-3 text-off outline-none focus:border-sable"
          />
        </label>

        {erreur && (
          <p className="mb-4 rounded-field bg-danger-bg px-3 py-2 text-sm text-danger-fg" role="alert">
            {erreur}
          </p>
        )}

        {enCours && <p className="mb-4 text-sm text-dim">{t("init.etape_seed")}</p>}

        <button
          type="submit"
          disabled={enCours}
          className="min-h-tap w-full rounded-field bg-sable px-3 font-medium text-bg disabled:opacity-60"
        >
          {enCours ? t("init.en_cours") : t("init.creer_compte")}
        </button>
      </form>
    </div>
  );
}
