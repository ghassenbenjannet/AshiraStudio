import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Notification } from "@achirah/shared";
import { clientNotifications } from "../../lib/resources/collaboration.js";

const CHEMIN_PAR_ENTITE: Record<string, (id: string) => string> = {
  tache: (id) => `/plan/taches/${id}`,
  campagne: (id) => `/plan/campagnes/${id}`,
};

const INTERVALLE_SONDAGE_MS = 60_000;

export function NotificationsCloche() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [liste, setListe] = useState<Notification[] | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const nonLues = liste?.filter((n) => !n.lu).length ?? 0;

  const charger = () => clientNotifications.lister().then(setListe);

  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, INTERVALLE_SONDAGE_MS);
    return () => clearInterval(intervalle);
  }, []);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, []);

  async function surClicNotification(n: Notification) {
    if (!n.lu) {
      await clientNotifications.marquerLu(n.id);
      setListe((l) => l?.map((x) => (x.id === n.id ? { ...x, lu: true } : x)) ?? null);
    }
    const versChemin = CHEMIN_PAR_ENTITE[n.entite_type];
    if (versChemin) {
      navigate(versChemin(n.entite_id));
      setOuvert(false);
    }
  }

  async function toutMarquerLu() {
    await clientNotifications.marquerToutLu();
    setListe((l) => l?.map((n) => ({ ...n, lu: true })) ?? null);
  }

  return (
    <div ref={conteneurRef} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        className="relative flex min-h-tap min-w-tap items-center justify-center rounded-field border border-line text-dim hover:text-off"
        aria-label={t("notifications.titre")}
      >
        🔔
        {nonLues > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-fg px-1 text-[10px] font-medium text-bg">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute end-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-card border border-line bg-panel shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-sm font-medium text-off">{t("notifications.titre")}</span>
            {nonLues > 0 && (
              <button type="button" onClick={() => void toutMarquerLu()} className="text-xs text-dim underline hover:text-off">
                {t("notifications.tout_marquer_lu")}
              </button>
            )}
          </div>
          {!liste && <p className="p-3 text-sm text-dim">{t("commun.chargement")}</p>}
          {liste && liste.length === 0 && <p className="p-3 text-sm text-dim">{t("notifications.aucune")}</p>}
          <ul>
            {liste?.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void surClicNotification(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-line px-3 py-2 text-start text-sm hover:bg-panel2 ${n.lu ? "text-dim" : "text-off"}`}
                >
                  <span>{t(`notifications.types.${n.type}`)}</span>
                  <span className="text-xs text-dim">{new Date(n.created_at).toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
