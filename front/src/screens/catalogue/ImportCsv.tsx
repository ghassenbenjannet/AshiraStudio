import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ArticleImportResultatLigne } from "@achirah/shared";
import { BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { clientArticles } from "../../lib/resources/catalogue.js";

const STYLE_ACTION: Record<string, string> = {
  nouveau: "text-olive",
  mise_a_jour: "text-sable",
  erreur: "text-danger-fg",
};

/** E09 — Import CSV : dropzone, prévisualisation ligne à ligne, dry_run, import atomique par ligne. */
export function ImportCsv() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toaster } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [texteCsv, setTexteCsv] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [apercu, setApercu] = useState<{ resultats: ArticleImportResultatLigne[]; nb_nouveaux: number; nb_mises_a_jour: number; nb_erreurs: number } | null>(null);
  const [rapportFinal, setRapportFinal] = useState<typeof apercu>(null);
  const [enCours, setEnCours] = useState(false);
  const [survole, setSurvole] = useState(false);

  async function chargerFichier(fichier: File) {
    setNomFichier(fichier.name);
    const texte = await fichier.text();
    setTexteCsv(texte);
    setRapportFinal(null);
    setEnCours(true);
    try {
      const rapport = await clientArticles.importer(texte, true);
      setApercu(rapport);
    } catch (err) {
      toaster(err instanceof Error ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  }

  async function confirmerImport() {
    if (!texteCsv) return;
    setEnCours(true);
    try {
      const rapport = await clientArticles.importer(texteCsv, false);
      setRapportFinal(rapport);
      toaster(t("referentiels.cree"));
    } catch (err) {
      toaster(err instanceof Error ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => navigate("/catalogue")} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-off">{t("catalogue.import.titre")}</h1>
        <a href={clientArticles.importerGabaritUrl} download className="min-h-tap text-sm text-sable underline-offset-2 hover:underline">
          {t("catalogue.import.gabarit")}
        </a>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSurvole(true);
        }}
        onDragLeave={() => setSurvole(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvole(false);
          const fichier = e.dataTransfer.files[0];
          if (fichier) void chargerFichier(fichier);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mb-4 flex min-h-32 cursor-pointer items-center justify-center rounded-card border-2 border-dashed p-6 text-center text-sm ${
          survole ? "border-sable text-sable" : "border-line text-dim"
        }`}
      >
        {nomFichier ? nomFichier : t("catalogue.import.zone")}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            if (fichier) void chargerFichier(fichier);
          }}
        />
      </div>

      {enCours && <p className="text-sm text-dim">{t("commun.chargement")}</p>}

      {apercu && (
        <div>
          <h2 className="mb-2 font-display text-lg text-off">
            {t("catalogue.import.apercu")} — {apercu.nb_nouveaux} {t("catalogue.import.action_nouveau").toLowerCase()}, {apercu.nb_mises_a_jour}{" "}
            {t("catalogue.import.action_maj").toLowerCase()}, {apercu.nb_erreurs} {t("catalogue.import.action_erreur").toLowerCase()}
          </h2>
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-line text-start text-xs text-dim">
                  <th className="px-3 py-2 text-start">{t("catalogue.import.ligne")}</th>
                  <th className="px-3 py-2 text-start">{t("catalogue.champs.reference")}</th>
                  <th className="px-3 py-2 text-start">{t("commun.confirmer")}</th>
                  <th className="px-3 py-2 text-start">Motif</th>
                </tr>
              </thead>
              <tbody>
                {apercu.resultats.map((r) => (
                  <tr key={r.ligne} className="border-b border-line last:border-0">
                    <td className="px-3 py-1 text-off">{r.ligne}</td>
                    <td className="px-3 py-1 text-off">{r.donnees.reference}</td>
                    <td className={`px-3 py-1 font-medium ${STYLE_ACTION[r.action]}`}>{t(`catalogue.import.action_${r.action === "mise_a_jour" ? "maj" : r.action}`)}</td>
                    <td className="px-3 py-1 text-dim">{r.motif ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!rapportFinal && (apercu.nb_nouveaux > 0 || apercu.nb_mises_a_jour > 0) && (
            <div className="mt-4 flex justify-end">
              <BoutonPrimaire type="button" disabled={enCours} onClick={() => void confirmerImport()}>
                {t("catalogue.import.confirmer_import")}
              </BoutonPrimaire>
            </div>
          )}

          {rapportFinal && (
            <div className="mt-4 rounded-card border border-line bg-panel p-3">
              <p className="mb-2 text-sm text-off">{t("catalogue.import.rapport")}</p>
              <BoutonSecondaire type="button" onClick={() => navigate("/catalogue")}>
                {t("commun.retour")}
              </BoutonSecondaire>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
