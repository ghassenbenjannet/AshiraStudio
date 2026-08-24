import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TYPE_NOTIFICATION, type TypeNotification, type CanalNotification } from "@achirah/shared";
import { clientNotifications } from "../../lib/resources/collaboration.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";

const CANAUX: CanalNotification[] = ["in_app", "email", "push"];

export function ReglagesNotifications() {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [reglages, setReglages] = useState<Record<TypeNotification, CanalNotification[]> | null>(null);

  useEffect(() => {
    clientNotifications.reglages().then((liste) => {
      const carte = Object.fromEntries(liste.map((r) => [r.type, r.canaux])) as Record<TypeNotification, CanalNotification[]>;
      setReglages(carte);
    });
  }, []);

  async function basculer(type: TypeNotification, canal: CanalNotification) {
    if (!reglages) return;
    const actuels = reglages[type] ?? ["in_app"];
    const suivants = actuels.includes(canal) ? actuels.filter((c) => c !== canal) : [...actuels, canal];
    setReglages((r) => (r ? { ...r, [type]: suivants } : r));
    try {
      await clientNotifications.modifierReglage(type, suivants);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
      setReglages((r) => (r ? { ...r, [type]: actuels } : r));
    }
  }

  if (!reglages) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-start text-xs text-dim">
            <th className="px-2 py-2 text-start">{t("notifications.champs.type")}</th>
            {CANAUX.map((canal) => (
              <th key={canal} className="px-2 py-2 text-center">
                {t(`notifications.canaux.${canal}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TYPE_NOTIFICATION.map((type) => (
            <tr key={type} className="border-b border-line last:border-0">
              <td className="px-2 py-2 text-off">{t(`notifications.types.${type}`)}</td>
              {CANAUX.map((canal) => (
                <td key={canal} className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={(reglages[type] ?? ["in_app"]).includes(canal)}
                    onChange={() => void basculer(type, canal)}
                    className="h-4 w-4"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-dim">{t("notifications.canaux_note")}</p>
    </div>
  );
}
