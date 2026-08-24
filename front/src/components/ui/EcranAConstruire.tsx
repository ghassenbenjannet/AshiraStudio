import { useTranslation } from "react-i18next";

/** Espace réservé honnête pour un écran pas encore construit — jamais un faux contenu. */
export function EcranAConstruire({ titre }: { titre: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line p-8 text-center">
      <h1 className="font-display text-xl text-off">{titre}</h1>
      <p className="max-w-sm text-sm text-dim">{t("commun.a_construire")}</p>
    </div>
  );
}
