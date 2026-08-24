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
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {onglets.map((onglet) => (
        <button
          key={onglet.id}
          role="tab"
          aria-selected={valeur === onglet.id}
          type="button"
          onClick={() => onChange(onglet.id)}
          className={`min-h-tap shrink-0 whitespace-nowrap border-b-2 px-3 text-sm transition-colors ${
            valeur === onglet.id ? "border-sable text-sable" : "border-transparent text-dim hover:text-off"
          }`}
        >
          {onglet.label}
        </button>
      ))}
    </div>
  );
}
