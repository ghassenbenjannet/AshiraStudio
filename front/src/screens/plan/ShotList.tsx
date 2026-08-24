import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { clientShootings, clientPoses } from "../../lib/resources/taches.js";
import type { Pose, Look } from "@achirah/shared";

export function ShotList({
  shootingId,
  looksVersion,
  peutEditer,
  onChange,
}: {
  shootingId: string;
  looksVersion: number;
  peutEditer: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const [poses, setPoses] = useState<Pose[] | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [nouvelle, setNouvelle] = useState("");
  const [lookVise, setLookVise] = useState("");

  const charger = () => clientShootings.listerPoses(shootingId).then(setPoses);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shootingId]);

  useEffect(() => {
    clientShootings.listerLooks(shootingId).then(setLooks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shootingId, looksVersion]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!nouvelle.trim()) return;
    await clientShootings.creerPose(shootingId, { description: nouvelle.trim(), ordre: poses?.length ?? 0, look_id: lookVise || null });
    setNouvelle("");
    charger();
    onChange();
  }

  async function supprimer(id: string) {
    await clientPoses.supprimer(id);
    charger();
    onChange();
  }

  async function assignerLook(pose: Pose, lookId: string) {
    setPoses((liste) => liste?.map((p) => (p.id === pose.id ? { ...p, look_id: lookId || null } : p)) ?? null);
    await clientPoses.modifier(pose.id, { look_id: lookId || null });
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

  const nomDuLook = (lookId: string | null | undefined) => looks.find((l) => l.id === lookId)?.nom;

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
              <span className="flex-1">
                {pose.description}
                {pose.look_id && <span className="ms-1 text-xs text-sable">— {nomDuLook(pose.look_id) ?? t("callsheet.looks.titre")}</span>}
              </span>
              {peutEditer && looks.length > 0 && (
                <select
                  value={pose.look_id ?? ""}
                  onChange={(e) => void assignerLook(pose, e.target.value)}
                  className="min-h-tap rounded-field border border-line bg-panel px-1 text-xs text-dim"
                  aria-label={t("callsheet.poses.lier_look")}
                >
                  <option value="">{t("callsheet.poses.aucun_look")}</option>
                  {looks.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
              )}
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
        <form onSubmit={ajouter} className="flex flex-wrap gap-2">
          <input
            value={nouvelle}
            onChange={(e) => setNouvelle(e.target.value)}
            placeholder={t("callsheet.poses.description_placeholder")}
            className="min-h-tap min-w-[12rem] flex-1 rounded-field border border-line bg-panel2 px-3 text-off"
          />
          {looks.length > 0 && (
            <select
              value={lookVise}
              onChange={(e) => setLookVise(e.target.value)}
              className="min-h-tap rounded-field border border-line bg-panel2 px-2 text-sm text-off"
              aria-label={t("callsheet.poses.lier_look")}
            >
              <option value="">{t("callsheet.poses.aucun_look")}</option>
              {looks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="min-h-tap rounded-field bg-sable px-3 text-sm font-medium text-bg">
            {t("callsheet.poses.ajouter")}
          </button>
        </form>
      )}
    </div>
  );
}
