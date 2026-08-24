import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ENTITES_COMMENTABLES, type Audit } from "@achirah/shared";
import { ChampSelect } from "../../components/ui/Champ.js";
import { clientAudit, clientExports } from "../../lib/resources/systeme.js";

const ENTITES_AUDIT = [...ENTITES_COMMENTABLES, "campagne", "integration", "sauvegarde", "commentaire", "metrique_snapshot"];

export function JournalAudit() {
  const { t } = useTranslation();
  const [entiteType, setEntiteType] = useState("");
  const [lignes, setLignes] = useState<Audit[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    clientAudit.lister({ entite_type: entiteType || undefined }).then((r) => {
      setLignes(r.donnees);
      setTotal(r.total);
    });
  }, [entiteType]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-52">
          <ChampSelect value={entiteType} onChange={(e) => setEntiteType(e.target.value)}>
            <option value="">{t("audit.toutes_entites")}</option>
            {[...new Set(ENTITES_AUDIT)].map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </ChampSelect>
        </div>
        <span className="text-sm text-dim">{t("audit.total", { n: total })}</span>
        <div className="flex-1" />
        <a href={clientExports.auditUrl("csv")} className="min-h-tap flex items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
          {t("commun.exporter_csv")}
        </a>
        <a href={clientExports.auditUrl("json")} className="min-h-tap flex items-center rounded-field border border-line px-3 text-sm text-off hover:border-sable">
          {t("commun.exporter_json")}
        </a>
      </div>

      {!lignes && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {lignes && lignes.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      {lignes && lignes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-start text-xs text-dim">
                <th className="px-2 py-1 text-start">{t("audit.champs.at")}</th>
                <th className="px-2 py-1 text-start">{t("audit.champs.action")}</th>
                <th className="px-2 py-1 text-start">{t("audit.champs.entite")}</th>
                <th className="px-2 py-1 text-start">{t("audit.champs.via_agent")}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-2 py-1 text-dim">{new Date(a.at).toLocaleString()}</td>
                  <td className="px-2 py-1 text-off">{a.action}</td>
                  <td className="px-2 py-1 text-dim">{a.entite_type}</td>
                  <td className="px-2 py-1 text-dim">{a.via_agent ? t("commun.oui") : t("commun.non")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
