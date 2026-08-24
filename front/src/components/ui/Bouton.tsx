import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icone, type NomIcone } from "./Icone";

export type VarianteBouton = "primaire" | "secondaire" | "tertiaire" | "danger" | "succes";
export type TailleBouton = "sm" | "md" | "lg";

export type BoutonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBouton;
  taille?: TailleBouton;
  icone?: NomIcone;
  iconeDroite?: NomIcone;
  charge?: boolean;
  children?: ReactNode;
};

const variantes: Record<VarianteBouton, string> = {
  primaire: "border-sable bg-sable text-white shadow-sm shadow-sable/15 hover:border-[#B94218] hover:bg-[#B94218]",
  secondaire: "border-line bg-panel text-off hover:border-sable hover:bg-[#FFF8F3] hover:text-sable",
  tertiaire: "border-transparent bg-transparent text-[#5B5449] hover:bg-panel2 hover:text-off",
  danger: "border-[#F2C6C2] bg-[#FFF4F3] text-danger-fg hover:border-danger-fg hover:bg-[#FFE8E5]",
  succes: "border-[#BBDCC8] bg-[#F0FAF4] text-[#277247] hover:border-[#277247] hover:bg-[#E4F5EB]",
};

const tailles: Record<TailleBouton, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-tap px-4 text-sm",
  lg: "min-h-12 px-5 text-sm",
};

export function Bouton({
  variante = "primaire",
  taille = "md",
  icone,
  iconeDroite,
  charge = false,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: BoutonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || charge}
      aria-busy={charge || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-field border font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sable/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantes[variante]} ${tailles[taille]} ${className}`}
    >
      {charge ? (
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : icone ? (
        <Icone nom={icone} taille={taille === "sm" ? 16 : 18} />
      ) : null}
      {children}
      {iconeDroite && <Icone nom={iconeDroite} taille={taille === "sm" ? 16 : 18} />}
    </button>
  );
}

export function BoutonIcone({
  label,
  icone,
  variante = "tertiaire",
  className = "",
  ...props
}: Omit<BoutonProps, "children" | "iconeDroite"> & { label: string; icone: NomIcone }) {
  return (
    <Bouton
      {...props}
      aria-label={label}
      title={label}
      icone={icone}
      variante={variante}
      className={`aspect-square !p-0 ${className}`}
    />
  );
}
