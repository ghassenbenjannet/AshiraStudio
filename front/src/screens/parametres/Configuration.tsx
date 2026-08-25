import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionRepliable } from "../../components/ui/SectionRepliable.js";
import { PastilleEtat, type EtatCompletude } from "../../components/ui/EtatCompletude.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { ApiError } from "../../lib/api.js";
import { clientConfiguration, type BlocConfiguration, type CategorieConfiguration, type ParametreConfiguration } from "../../lib/resources/systeme.js";
import { useToast } from "../../lib/toast-context.js";

const ETAT_VERS_COMPLETUDE: Record<BlocConfiguration["etat"], EtatCompletude> = {
  configure: "complet",
  non_configure: "vide",
  test_echoue: "manquant",
};

/** Valeurs possibles par clé — l'ordre d'affichage. Les libellés viennent de `configuration.options.*` (i18n). */
const OPTIONS_SELECT: Partial<Record<string, string[]>> = {
  "ia.fournisseur": ["anthropic", "openai", "google", "mistral", "openrouter", "ollama", "openai_compatible"],
  "email.mode": ["smtp", "service"],
  "email.smtp_tls": ["true", "false"],
  "stockage.mode": ["local", "s3"],
};

/** CDC v4, Lot 2.3 (§8.3) — un bloc de la configuration, ses champs et son bouton « Tester ». */
function BlocParametre({ bloc, onModifie }: { bloc: BlocConfiguration; onModifie: () => Promise<void> }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [modifies, setModifies] = useState<Set<string>>(new Set());
  const [enregistrement, setEnregistrement] = useState(false);
  const [test, setTest] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    setValeurs(Object.fromEntries(bloc.parametres.map((p) => [p.cle, p.chiffre ? "" : (p.valeur ?? "")])));
    setModifies(new Set());
  }, [bloc]);

  function changer(cle: string, valeur: string) {
    setValeurs((v) => ({ ...v, [cle]: valeur }));
    setModifies((m) => new Set(m).add(cle));
  }

  async function enregistrer() {
    setEnregistrement(true);
    setErreur(null);
    try {
      for (const cle of modifies) {
        const valeur = valeurs[cle] ?? "";
        await clientConfiguration.ecrire(cle, valeur === "" ? null : valeur);
      }
      await onModifie();
      toaster(t("configuration.enregistre"));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("configuration.erreur_generique"));
    } finally {
      setEnregistrement(false);
    }
  }

  async function tester() {
    setTest(true);
    setErreur(null);
    try {
      await clientConfiguration.tester(bloc.categorie);
      await onModifie();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("configuration.erreur_generique"));
    } finally {
      setTest(false);
    }
  }

  const aDesModifications = modifies.size > 0;

  return (
    <SectionRepliable titre={t(`configuration.blocs.${bloc.categorie}.titre`)} etat={ETAT_VERS_COMPLETUDE[bloc.etat]} ouvertParDefaut={bloc.etat !== "configure"}>
      <p className="mb-4 text-xs leading-relaxed text-dim">{t(`configuration.blocs.${bloc.categorie}.aide`)}</p>

      {bloc.parametres.map((p) => (
        <ChampParametre key={p.cle} parametre={p} valeur={valeurs[p.cle] ?? ""} onChange={(v) => changer(p.cle, v)} />
      ))}

      {bloc.dernier_test && (
        <p className={`mb-3 rounded-field p-2.5 text-xs leading-relaxed ${bloc.dernier_test.ok ? "bg-[#E3F3EF] text-[#0F6656]" : "bg-[#FFF4F3] text-danger-fg"}`}>
          {bloc.dernier_test.ok ? "✓" : "⚠"} {bloc.dernier_test.message}
        </p>
      )}
      {erreur && <p className="mb-3 text-xs text-danger-fg">{erreur}</p>}

      <div className="flex flex-wrap gap-2">
        <BoutonSecondaire type="button" icone="verifier" charge={test} onClick={() => void tester()}>{t("configuration.tester")}</BoutonSecondaire>
        <BoutonPrimaire type="button" icone="enregistrer" charge={enregistrement} disabled={!aDesModifications} onClick={() => void enregistrer()}>{t("configuration.enregistrer")}</BoutonPrimaire>
      </div>
    </SectionRepliable>
  );
}

function ChampParametre({ parametre, valeur, onChange }: { parametre: ParametreConfiguration; valeur: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  // i18next scinde les clés sur "." par défaut — les clés du registre (`ia.cle_api`) sont traduites via underscore.
  const label = t(`configuration.champs.${parametre.cle.replace(/\./g, "_")}`);
  const options = OPTIONS_SELECT[parametre.cle];

  if (options) {
    const cleOptions = parametre.cle.replace(/\./g, "_");
    return (
      <Champ label={label}>
        <ChampSelect value={valeur} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => <option key={o} value={o}>{t(`configuration.options.${cleOptions}.${o}`)}</option>)}
        </ChampSelect>
      </Champ>
    );
  }

  if (parametre.chiffre) {
    return (
      <Champ label={label}>
        <ChampTexte
          type="password"
          autoComplete="new-password"
          placeholder={parametre.defini ? `${t("configuration.champ_secret_defini")} (${parametre.masque})` : t("configuration.champ_secret_vide")}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
        />
      </Champ>
    );
  }

  return (
    <Champ label={label}>
      <ChampTexte value={valeur} onChange={(e) => onChange(e.target.value)} />
    </Champ>
  );
}

/**
 * CDC v4, Lot 2.3 (§8.3) — écran d'administration « Paramètres → Configuration ». Réservé à la
 * capacité `parametres.gerer` (RG-CFG2, contrôlé aussi côté serveur — l'appelant doit garder cet
 * écran derrière la même garde). Tous les réglages (hormis `DATABASE_URL`/`ENCRYPTION_KEY`, §2.2)
 * se gèrent ici sans fichier ni redémarrage (RG-CFG1-5).
 */
export function Configuration() {
  const { t } = useTranslation();
  const [blocs, setBlocs] = useState<BlocConfiguration[] | null>(null);

  const charger = () => clientConfiguration.lire().then(setBlocs);

  useEffect(() => { void charger(); }, []);

  if (!blocs) return null;

  const ordre: CategorieConfiguration[] = ["ia", "email", "push", "stockage", "supervision", "sauvegardes"];
  const parCategorie = new Map(blocs.map((b) => [b.categorie, b]));

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-dim">{t("configuration.description")}</p>
      {ordre.map((categorie) => {
        const bloc = parCategorie.get(categorie);
        return bloc ? <BlocParametre key={categorie} bloc={bloc} onModifie={charger} /> : null;
      })}
    </div>
  );
}
