import { useState, type ReactNode } from "react";
import { PastilleEtat, type EtatCompletude } from "./EtatCompletude.js";

/**
 * CR-02 §C — section repliable avec pastille d'état, utilisée sur les écrans à défilement unique
 * (call sheet). Ouverte par défaut si `ouvertParDefaut` (calculé par l'écran appelant : la première
 * section incomplète) ; les autres restent repliées mais toujours dépliables — jamais bloquant
 * (RG-PAR1), c'est un raccourci de lecture, pas un flux imposé.
 */
export function SectionRepliable({
  titre,
  etat,
  ouvertParDefaut,
  children,
}: {
  titre: string;
  etat: EtatCompletude;
  ouvertParDefaut: boolean;
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  return (
    <section className="mb-4 rounded-card border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="flex min-h-tap w-full items-center justify-between gap-2 px-4 py-3 text-start"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-off">
          <PastilleEtat etat={etat} />
          {titre}
        </span>
        <span aria-hidden="true" className={`text-dim transition-transform ${ouvert ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {ouvert && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
