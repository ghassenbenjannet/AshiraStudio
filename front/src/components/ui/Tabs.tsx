export function Tabs<T extends string>({
  valeur,
  onChange,
  onglets,
}: {
  valeur: T;
  onChange: (v: T) => void;
  onglets: { id: T; label: string }[];
}) {
  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1" role="tablist">
      {onglets.map((onglet) => (
        <button
          key={onglet.id}
          role="tab"
          aria-selected={valeur === onglet.id}
          type="button"
          onClick={() => onChange(onglet.id)}
          className={`min-h-tap shrink-0 whitespace-nowrap rounded-[10px] border px-3.5 text-sm font-medium transition-colors ${
            valeur === onglet.id ? "border-[#F2C8B5] bg-[#FDEEE6] font-semibold text-sable" : "border-line bg-panel text-dim hover:border-sable hover:text-off"
          }`}
        >
          {onglet.label}
        </button>
      ))}
    </div>
  );
}
