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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#191713]/60 p-0 backdrop-blur-[2px] md:items-center md:p-5" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-sheet border border-line bg-panel p-5 shadow-2xl shadow-black/20 md:max-w-lg md:rounded-sheet md:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-off">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="flex min-h-tap min-w-tap items-center justify-center rounded-field bg-panel2 text-dim hover:bg-danger-bg hover:text-danger-fg"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
