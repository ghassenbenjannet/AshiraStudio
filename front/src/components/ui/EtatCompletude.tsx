/** CR-02 §C — pastille d'état partagée par les onglets (hub campagne, fiche article) et les
 *  sections repliables (call sheet) : ✓ complet · ● en cours · ○ vide · ⚠ manque bloquant. */
export type EtatCompletude = "complet" | "en_cours" | "vide" | "manquant";

const SYMBOLE: Record<EtatCompletude, string> = {
  complet: "✓",
  en_cours: "●",
  vide: "○",
  manquant: "⚠",
};

const COULEUR: Record<EtatCompletude, string> = {
  complet: "text-olive",
  en_cours: "text-sable",
  vide: "text-dim",
  manquant: "text-danger-fg",
};

export function PastilleEtat({ etat, className = "" }: { etat: EtatCompletude; className?: string }) {
  return (
    <span aria-hidden="true" className={`text-xs leading-none ${COULEUR[etat]} ${className}`}>
      {SYMBOLE[etat]}
    </span>
  );
}
