import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseClasses =
  "min-h-tap w-full rounded-field border border-line bg-panel2 px-3 text-off outline-none focus:border-sable disabled:opacity-60";

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
      <span className="mb-1 block text-dim">{label}</span>
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

export function BoutonPrimaire(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-tap rounded-field bg-sable px-4 font-medium text-bg disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function BoutonSecondaire(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-tap rounded-field border border-line px-4 text-off hover:border-sable disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}
