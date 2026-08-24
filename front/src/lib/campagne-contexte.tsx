import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Campagne } from "@achirah/shared";
import { clientCampagnes } from "./resources/campagnes.js";

const CLE_STOCKAGE = "achirah.campagne_contexte";

type Mode = "campagne" | "toutes";

interface EtatStocke {
  mode: Mode;
  id: string | null;
}

function lireStockage(): EtatStocke | null {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return null;
    return JSON.parse(brut) as EtatStocke;
  } catch {
    return null;
  }
}

function ecrireStockage(etat: EtatStocke) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
  } catch {
    // Stockage indisponible (navigation privée, quota) : le contexte reste en mémoire pour la session.
  }
}

interface CampagneContexteValeur {
  campagnes: Campagne[];
  campagneActive: Campagne | null;
  campagneActiveId: string | null;
  mode: Mode;
  chargement: boolean;
  definirCampagneActive: (id: string) => void;
  activerToutesCampagnes: () => void;
  rafraichir: () => void;
}

const CampagneContexte = createContext<CampagneContexteValeur | null>(null);

/**
 * CR-02 §A — la campagne devient le monde par défaut. Contexte global côté client uniquement
 * (aucune table, aucun champ nouveau) : une préférence de navigation persistée en localStorage,
 * jamais une vérité de données. Sélection initiale automatique (active > préparation > aucune),
 * ensuite entièrement pilotée par l'utilisateur via le sélecteur (RG-PAR1 : jamais de blocage).
 */
export function CampagneContexteProvider({ children }: { children: ReactNode }) {
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [mode, setMode] = useState<Mode>("toutes");
  const [campagneActiveId, setCampagneActiveId] = useState<string | null>(null);
  const [initialise, setInitialise] = useState(false);

  const charger = useCallback(() => {
    setChargement(true);
    return clientCampagnes
      .lister()
      .then(setCampagnes)
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (initialise || chargement) return;
    const stocke = lireStockage();
    if (stocke?.mode === "toutes") {
      setMode("toutes");
      setCampagneActiveId(stocke.id ?? null);
      setInitialise(true);
      return;
    }
    if (stocke?.id && campagnes.some((c) => c.id === stocke.id)) {
      setMode("campagne");
      setCampagneActiveId(stocke.id);
      setInitialise(true);
      return;
    }
    const active = campagnes.find((c) => c.statut === "active");
    const preparation = campagnes.find((c) => c.statut === "preparation");
    const defaut = active ?? preparation ?? null;
    if (defaut) {
      setMode("campagne");
      setCampagneActiveId(defaut.id);
    } else {
      setMode("toutes");
    }
    setInitialise(true);
  }, [campagnes, chargement, initialise]);

  const definirCampagneActive = useCallback((id: string) => {
    setMode("campagne");
    setCampagneActiveId(id);
    ecrireStockage({ mode: "campagne", id });
  }, []);

  const activerToutesCampagnes = useCallback(() => {
    setMode("toutes");
    setCampagneActiveId((id) => {
      ecrireStockage({ mode: "toutes", id });
      return id;
    });
  }, []);

  const campagneActive = useMemo(
    () => (mode === "campagne" ? (campagnes.find((c) => c.id === campagneActiveId) ?? null) : null),
    [campagnes, campagneActiveId, mode],
  );

  const valeur = useMemo<CampagneContexteValeur>(
    () => ({
      campagnes,
      campagneActive,
      campagneActiveId: mode === "campagne" ? campagneActiveId : null,
      mode,
      chargement,
      definirCampagneActive,
      activerToutesCampagnes,
      rafraichir: () => void charger(),
    }),
    [campagnes, campagneActive, campagneActiveId, mode, chargement, definirCampagneActive, activerToutesCampagnes, charger],
  );

  return <CampagneContexte.Provider value={valeur}>{children}</CampagneContexte.Provider>;
}

export function useCampagneContexte(): CampagneContexteValeur {
  const ctx = useContext(CampagneContexte);
  if (!ctx) throw new Error("useCampagneContexte doit être utilisé dans un CampagneContexteProvider");
  return ctx;
}
