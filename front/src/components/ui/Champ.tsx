import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Bouton, type BoutonProps } from "./Bouton";

const baseClasses =
  "min-h-tap w-full rounded-field border border-line bg-panel2 px-3 text-sm text-off outline-none placeholder:text-dim/60 hover:border-[#D9CFC0] focus:border-sable focus:bg-panel disabled:opacity-60";

export function Champ({
  label,
  children,
  erreur,
}: {
  label: string;
  children: ReactNode;
  erreur?: string;
}) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1.5 block text-xs font-semibold text-[#5B5449]">{label}</span>
      {children}
      {erreur && <span className="mt-1 block text-xs text-danger-fg">{erreur}</span>}
    </label>
  );
}

export function ChampTexte(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} dir="auto" className={baseClasses} />;
}

export function ChampNombre(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} type="number" className={baseClasses} />;
}

export function ChampZoneTexte(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} dir="auto" className={`${baseClasses} min-h-24 py-2`} />;
}

export function ChampSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={baseClasses} />;
}

export function BoutonPrimaire(props: Omit<BoutonProps, "variante">) {
  return <Bouton {...props} variante="primaire" />;
}

export function BoutonSecondaire(props: Omit<BoutonProps, "variante">) {
  return <Bouton {...props} variante="secondaire" />;
}
