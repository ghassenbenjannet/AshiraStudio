import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "../ui/Dialog.js";
import { ChampTexte, ChampNombre, Champ, BoutonPrimaire, BoutonSecondaire } from "../ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";

export interface ChampConfig {
  cle: string;
  label: string;
  type: "texte" | "nombre" | "couleur" | "case" | "valeurs";
  requis?: boolean;
  /** Champ non modifiable une fois créé (ex. code_prefixe verrouillé par une gamme utilisée). */
  verrouilleSiExistant?: boolean;
}

interface LigneBase {
  id: string;
  archived_at?: string | null;
  ordre?: number;
}

/**
 * Table CRUD générique pour les référentiels simples (Partie V) — miroir du composant serveur
 * `creerRoutesReferentiel` : mêmes capacités, même sémantique d'archivage.
 */
export function TableReferentiel<T extends LigneBase>({
  titre,
  description,
  champs,
  colonneAffichage,
  client,
  peutEditer,
}: {
  titre: string;
  description?: string;
  champs: ChampConfig[];
  colonneAffichage: (ligne: T) => string;
  client: {
    lister: (avecArchives?: boolean) => Promise<T[]>;
    creer: (corps: any) => Promise<T>;
    modifier: (id: string, corps: any) => Promise<T>;
    archiver: (id: string) => Promise<T>;
    reactiver: (id: string) => Promise<T>;
  };
  peutEditer: boolean;
}) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [lignes, setLignes] = useState<T[] | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [afficherArchives, setAfficherArchives] = useState(false);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<T | null>(null);
  const [formulaire, setFormulaire] = useState<Record<string, unknown>>({});
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState<string | null>(null);

  const charger = () => {
    setErreurChargement(null);
    client
      .lister(afficherArchives)
      .then(setLignes)
      .catch((err) => setErreurChargement(err instanceof ApiError ? err.message : t("commun.erreur_generique")));
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afficherArchives]);

  function ouvrirCreation() {
    setEnEdition(null);
    const vide: Record<string, unknown> = {};
    champs.forEach((champ) => {
      vide[champ.cle] = champ.type === "case" ? false : champ.type === "valeurs" ? [] : "";
    });
    setFormulaire(vide);
    setErreurFormulaire(null);
    setDialogueOuvert(true);
  }

  function ouvrirEdition(ligne: T) {
    setEnEdition(ligne);
    setFormulaire({ ...(ligne as unknown as Record<string, unknown>) });
    setErreurFormulaire(null);
    setDialogueOuvert(true);
  }

  async function soumettre() {
    setEnregistrement(true);
    setErreurFormulaire(null);
    try {
      const corps = { ...formulaire };
      champs.forEach((champ) => {
        if (champ.type === "nombre") corps[champ.cle] = corps[champ.cle] === "" ? null : Number(corps[champ.cle]);
        if (champ.type === "valeurs" && typeof corps[champ.cle] === "string") {
          corps[champ.cle] = (corps[champ.cle] as string)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        }
      });
      if (enEdition) {
        await client.modifier(enEdition.id, corps);
        toaster(t("referentiels.modifie"));
      } else {
        await client.creer(corps);
        toaster(t("referentiels.cree"));
      }
      setDialogueOuvert(false);
      charger();
    } catch (err) {
      setErreurFormulaire(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setEnregistrement(false);
    }
  }

  async function archiverOuReactiver(ligne: T) {
    try {
      if (ligne.archived_at) {
        await client.reactiver(ligne.id);
        toaster(t("referentiels.reactive"));
      } else {
        await client.archiver(ligne.id);
        toaster(t("referentiels.archive"));
      }
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-off">{titre}</h2>
          {description && <p className="text-sm text-dim">{description}</p>}
        </div>
        {peutEditer && (
          <BoutonPrimaire type="button" onClick={ouvrirCreation}>
            {t("referentiels.ajouter")}
          </BoutonPrimaire>
        )}
      </div>

      <label className="mb-2 flex items-center gap-2 text-xs text-dim">
        <input type="checkbox" checked={afficherArchives} onChange={(e) => setAfficherArchives(e.target.checked)} />
        {t("referentiels.afficher_archives")}
      </label>

      {erreurChargement && <p className="text-sm text-danger-fg">{erreurChargement}</p>}
      {!lignes && !erreurChargement && <p className="text-sm text-dim">{t("commun.chargement")}</p>}

      {lignes && lignes.length === 0 && <p className="text-sm text-dim">{t("referentiels.vide")}</p>}

      {lignes && lignes.length > 0 && (
        <ul className="divide-y divide-line rounded-card border border-line">
          {lignes.map((ligne) => (
            <li key={ligne.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${ligne.archived_at ? "opacity-50" : ""}`}>
              <button
                type="button"
                onClick={() => peutEditer && ouvrirEdition(ligne)}
                className="min-h-tap flex-1 text-start text-sm text-off disabled:cursor-default"
                disabled={!peutEditer}
              >
                {colonneAffichage(ligne)}
              </button>
              {peutEditer && (
                <button
                  type="button"
                  onClick={() => archiverOuReactiver(ligne)}
                  className="min-h-tap rounded-field border border-line px-3 text-xs text-dim hover:text-off"
                >
                  {ligne.archived_at ? t("referentiels.reactiver") : t("referentiels.archiver_action")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={enEdition ? t("referentiels.modifier_titre") : t("referentiels.ajouter")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void soumettre();
          }}
        >
          {champs.map((champ) => {
            const verrouille = champ.verrouilleSiExistant && !!enEdition;
            return (
              <Champ key={champ.cle} label={champ.label}>
                {champ.type === "case" ? (
                  <label className="flex min-h-tap items-center gap-2 text-off">
                    <input
                      type="checkbox"
                      checked={!!formulaire[champ.cle]}
                      onChange={(e) => setFormulaire((f) => ({ ...f, [champ.cle]: e.target.checked }))}
                    />
                  </label>
                ) : champ.type === "nombre" ? (
                  <ChampNombre
                    required={champ.requis}
                    value={(formulaire[champ.cle] as number | string) ?? ""}
                    onChange={(e) => setFormulaire((f) => ({ ...f, [champ.cle]: e.target.value }))}
                  />
                ) : champ.type === "couleur" ? (
                  <input
                    type="color"
                    value={(formulaire[champ.cle] as string) || "#c9a876"}
                    onChange={(e) => setFormulaire((f) => ({ ...f, [champ.cle]: e.target.value }))}
                    className="h-11 w-full rounded-field border border-line bg-panel2"
                  />
                ) : champ.type === "valeurs" ? (
                  <ChampTexte
                    required={champ.requis}
                    placeholder="XS, S, M, L, XL"
                    disabled={verrouille}
                    value={Array.isArray(formulaire[champ.cle]) ? (formulaire[champ.cle] as string[]).join(", ") : (formulaire[champ.cle] as string) ?? ""}
                    onChange={(e) => setFormulaire((f) => ({ ...f, [champ.cle]: e.target.value }))}
                  />
                ) : (
                  <ChampTexte
                    required={champ.requis}
                    disabled={verrouille}
                    value={(formulaire[champ.cle] as string) ?? ""}
                    onChange={(e) => setFormulaire((f) => ({ ...f, [champ.cle]: e.target.value }))}
                  />
                )}
              </Champ>
            );
          })}

          {erreurFormulaire && <p className="mb-3 text-sm text-danger-fg">{erreurFormulaire}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueOuvert(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit" disabled={enregistrement}>
              {t("commun.enregistrer")}
            </BoutonPrimaire>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
