import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Utilisateur } from "@achirah/shared";
import { api, ApiError } from "./api.js";

type EtatInit = { verifie: false } | { verifie: true; initialise: boolean };

interface AuthContextValeur {
  utilisateur: Utilisateur | null;
  chargement: boolean;
  initStatut: EtatInit;
  connecter: (email: string, motDePasse: string) => Promise<void>;
  deconnecter: () => Promise<void>;
  initialiser: (email: string, nom: string, motDePasse: string) => Promise<void>;
  rafraichir: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValeur | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const [initStatut, setInitStatut] = useState<EtatInit>({ verifie: false });

  const rafraichir = useCallback(async () => {
    try {
      const { initialise } = await api<{ initialise: boolean }>("/init/statut");
      setInitStatut({ verifie: true, initialise });
      if (!initialise) {
        setUtilisateur(null);
        return;
      }
      const { utilisateur: u } = await api<{ utilisateur: Utilisateur }>("/auth/me");
      setUtilisateur(u);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUtilisateur(null);
      }
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const connecter = useCallback(async (email: string, motDePasse: string) => {
    const { utilisateur: u } = await api<{ utilisateur: Utilisateur }>("/auth/login", {
      method: "POST",
      body: { email, mot_de_passe: motDePasse },
    });
    setUtilisateur(u);
  }, []);

  const deconnecter = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUtilisateur(null);
  }, []);

  const initialiser = useCallback(async (email: string, nom: string, motDePasse: string) => {
    const { utilisateur: u } = await api<{ utilisateur: Utilisateur }>("/init", {
      method: "POST",
      body: { email, nom, mot_de_passe: motDePasse },
    });
    setInitStatut({ verifie: true, initialise: true });
    setUtilisateur(u);
  }, []);

  const valeur = useMemo(
    () => ({ utilisateur, chargement, initStatut, connecter, deconnecter, initialiser, rafraichir }),
    [utilisateur, chargement, initStatut, connecter, deconnecter, initialiser, rafraichir],
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValeur {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
