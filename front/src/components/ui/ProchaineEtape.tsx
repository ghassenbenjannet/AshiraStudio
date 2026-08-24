import { Bouton } from "./Bouton.js";

export interface ActionProchaineEtape {
  label: string;
  onClick: () => void;
}

/**
 * CR-02 §C — bandeau réutilisable « Prochaine étape » : `[état actuel] → [ce qui manque] →
 * [une action]`. Purement informatif (RG-PAR1) — `action` est un raccourci, jamais un passage
 * obligé ; le chemin manuel (onglets, formulaires) reste toujours disponible à côté. Les segments
 * sont déjà traduits par l'écran appelant à partir des codes renvoyés par le serveur
 * (`ProchaineEtape` — voir `shared/src/schemas/common.ts`).
 */
export function ProchaineEtape({ etat, manque, action }: { etat: string; manque?: string | null; action?: ActionProchaineEtape | null }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-panel p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium text-off">{etat}</span>
        {manque && (
          <>
            <span aria-hidden="true" className="text-dim">
              →
            </span>
            <span className="text-dim">{manque}</span>
          </>
        )}
      </div>
      {action && (
        <Bouton type="button" variante="secondaire" taille="sm" onClick={action.onClick} className="shrink-0">
          {action.label}
        </Bouton>
      )}
    </div>
  );
}
