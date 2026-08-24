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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#191713] px-4 py-8">
      <Filigrane />
      <form onSubmit={soumettre} className="relative z-10 w-full max-w-[420px] rounded-[24px] border border-white/10 bg-panel p-7 shadow-2xl shadow-black/30 sm:p-8">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-[14px] bg-sable font-display text-2xl font-semibold text-white">ع</div>
        <h1 className="mb-1 font-display text-[28px] font-semibold tracking-[-0.02em] text-off">{t("app.nom")}</h1>
        <p className="mb-7 text-sm text-dim">{t("auth.connexion")}</p>

        <label className="mb-3 block text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-[#5B5449]">{t("auth.email")}</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[48px] w-full rounded-field border border-line bg-panel2 px-3.5 text-sm text-off outline-none hover:border-[#D9CFC0] focus:border-sable focus:bg-panel"
            dir="auto"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-[#5B5449]">{t("auth.mot_de_passe")}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="min-h-[48px] w-full rounded-field border border-line bg-panel2 px-3.5 text-sm text-off outline-none hover:border-[#D9CFC0] focus:border-sable focus:bg-panel"
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
          className="min-h-[48px] w-full rounded-field bg-sable px-3 text-sm font-semibold text-white shadow-sm hover:bg-[#C4491A] disabled:opacity-60"
        >
          {enCours ? t("auth.en_cours") : t("auth.se_connecter")}
        </button>
      </form>
    </div>
  );
}
