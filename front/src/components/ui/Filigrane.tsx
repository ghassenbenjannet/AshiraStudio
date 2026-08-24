/** Filigrane calligraphie عشيرة ≤3% d'opacité — login, écrans vides (§7.1). */
export function Filigrane() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
    >
      <span className="font-display text-[28vw] leading-none text-off opacity-[0.03]" dir="rtl">
        عشيرة
      </span>
    </div>
  );
}
