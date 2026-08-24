import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  type: "info" | "erreur";
  action?: { label: string; onClick: () => void };
}

interface ToastContextValeur {
  toaster: (message: string, options?: { type?: Toast["type"]; action?: Toast["action"] }) => void;
}

const ToastContext = createContext<ToastContextValeur | null>(null);

/** Toasts en bas, 3 s, une action max (§7.2). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const compteur = useRef(0);

  const toaster = useCallback<ToastContextValeur["toaster"]>((message, options) => {
    const id = ++compteur.current;
    setToasts((t) => [...t, { id, message, type: options?.type ?? "info", action: options?.action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toaster }}>
      {children}
      <div className="fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex items-center gap-3 rounded-card border px-4 py-2 text-sm shadow-none ${
              t.type === "erreur" ? "border-danger-fg/40 bg-danger-bg text-danger-fg" : "border-line bg-panel text-off"
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button type="button" onClick={t.action.onClick} className="min-h-tap font-medium text-sable">
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValeur {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans un ToastProvider");
  return ctx;
}
