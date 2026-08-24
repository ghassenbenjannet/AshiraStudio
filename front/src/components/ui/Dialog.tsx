import { type ReactNode, useEffect } from "react";

/** Formulaires : bottom sheet mobile / modal desktop (§3). */
export function Dialog({
  ouvert,
  onFermer,
  titre,
  children,
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!ouvert) return;
    const surEchap = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", surEchap);
    return () => document.removeEventListener("keydown", surEchap);
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-sheet border border-line bg-panel p-5 md:max-w-lg md:rounded-card"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-off">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="flex min-h-tap min-w-tap items-center justify-center rounded-field text-dim hover:text-off"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
