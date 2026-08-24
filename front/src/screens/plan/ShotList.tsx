import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { clientShootings, clientPoses } from "../../lib/resources/taches.js";
import type { Pose } from "@achirah/shared";

export function ShotList({ shootingId, peutEditer, onChange }: { shootingId: string; peutEditer: boolean; onChange: () => void }) {
  const { t } = useTranslation();
  const [poses, setPoses] = useState<Pose[] | null>(null);
  const [nouvelle, setNouvelle] = useState("");

  const charger = () => clientShootings.listerPoses(shootingId).then(setPoses);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shootingId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!nouvelle.trim()) return;
    await clientShootings.creerPose(shootingId, { description: nouvelle.trim(), ordre: poses?.length ?? 0 });
    setNouvelle("");
    charger();
    onChange();
  }

  async function supprimer(id: string) {
    await clientPoses.supprimer(id);
    charger();
    onChange();
  }

  function deplacer(index: number, direction: -1 | 1) {
    if (!poses) return;
    const cible = index + direction;
    if (cible < 0 || cible >= poses.length) return;
    const copie = [...poses];
    const [item] = copie.splice(index, 1);
    copie.splice(cible, 0, item!);
    setPoses(copie);
    copie.forEach((p, i) => {
      if (p.ordre !== i) void clientPoses.modifier(p.id, { ordre: i });
    });
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-dim">{t("callsheet.poses.titre")}</h3>
      <ul className="mb-2 flex flex-col gap-1">
        {poses
          ?.slice()
          .sort((a, b) => a.ordre - b.ordre)
          .map((pose, i) => (
            <li key={pose.id} className="flex items-center gap-2 rounded-field border border-line bg-panel2 px-2 py-1 text-sm text-off">
              <span className="text-dim">{i + 1}.</span>
              <span className="flex-1">{pose.description}</span>
              {peutEditer && (
                <>
                  <button type="button" onClick={() => deplacer(i, -1)} className="min-h-tap min-w-tap text-dim hover:text-off">
                    ↑
                  </button>
                  <button type="button" onClick={() => deplacer(i, 1)} className="min-h-tap min-w-tap text-dim hover:text-off">
                    ↓
                  </button>
                  <button type="button" onClick={() => void supprimer(pose.id)} className="min-h-tap min-w-tap text-dim hover:text-danger-fg">
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
      </ul>
      {peutEditer && (
        <form onSubmit={ajouter} className="flex gap-2">
          <input
            value={nouvelle}
            onChange={(e) => setNouvelle(e.target.value)}
            placeholder={t("callsheet.poses.description_placeholder")}
            className="min-h-tap flex-1 rounded-field border border-line bg-panel2 px-3 text-off"
          />
          <button type="submit" className="min-h-tap rounded-field bg-sable px-3 text-sm font-medium text-bg">
            {t("callsheet.poses.ajouter")}
          </button>
        </form>
      )}
    </div>
  );
}
