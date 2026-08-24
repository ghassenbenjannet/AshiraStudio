import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context.js";
import { ApiError } from "../lib/api.js";
import { Filigrane } from "../components/ui/Filigrane.js";

/** E01 — Login. */
export function Login() {
  const { t } = useTranslation();
  const { connecter } = useAuth();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await connecter(email, motDePasse);
    } catch (err) {
      if (err instanceof ApiError && err.code === "compte_verrouille") {
        setErreur(t("auth.compte_verrouille"));
      } else {
        setErreur(t("auth.erreur_identifiants"));
      }
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-bg px-4">
      <Filigrane />
      <form onSubmit={soumettre} className="relative z-10 w-full max-w-sm rounded-card border border-line bg-panel p-6">
        <h1 className="mb-1 font-display text-2xl text-off">{t("app.nom")}</h1>
        <p className="mb-6 text-sm text-dim">{t("auth.connexion")}</p>

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
            autoComplete="current-password"
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

        <button
          type="submit"
          disabled={enCours}
          className="min-h-tap w-full rounded-field bg-sable px-3 font-medium text-bg disabled:opacity-60"
        >
          {enCours ? t("auth.en_cours") : t("auth.se_connecter")}
        </button>
      </form>
    </div>
  );
}
