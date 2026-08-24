import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { aCapacite, type CategorieContact, type Personne } from "@achirah/shared";
import { Champ, ChampTexte, ChampNombre, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientCategoriesContact, clientPersonnes } from "../../lib/resources/contacts.js";

const NOMS_CONDITIONNELS = {
  modele: "Modèle",
  photoVideo: ["Photographe", "Vidéaste"],
  fournisseur: "Fournisseur",
  lieu: "Lieu",
  ambassadeur: "Ambassadeur",
} as const;

/** E11 — Fiche contact, champs conditionnels par catégorie (§4.1). */
export function FicheContact() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");
  const peutVoirMontants = !!utilisateur && aCapacite(utilisateur.role_systeme, "montants.voir");

  const [personne, setPersonne] = useState<Personne | null>(null);
  const [categories, setCategories] = useState<CategorieContact[]>([]);
  const [enregistrement, setEnregistrement] = useState(false);
  const [lienPartage, setLienPartage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    clientPersonnes.obtenir(id).then(setPersonne);
    clientCategoriesContact.lister().then(setCategories);
  }, [id]);

  const nomsCategories = useMemo(() => {
    if (!personne) return new Set<string>();
    const parId = new Map(categories.map((c) => [c.id, c.nom]));
    return new Set(personne.categorie_ids.map((cid) => parId.get(cid)).filter(Boolean) as string[]);
  }, [personne, categories]);

  const estModele = nomsCategories.has(NOMS_CONDITIONNELS.modele);
  const estAmbassadeur = nomsCategories.has(NOMS_CONDITIONNELS.ambassadeur);
  const estPhotoVideo = NOMS_CONDITIONNELS.photoVideo.some((n) => nomsCategories.has(n));
  const estFournisseur = nomsCategories.has(NOMS_CONDITIONNELS.fournisseur);
  const estLieu = nomsCategories.has(NOMS_CONDITIONNELS.lieu);

  function champ<K extends keyof Personne>(cle: K, valeur: Personne[K]) {
    setPersonne((p) => (p ? { ...p, [cle]: valeur } : p));
  }

  async function enregistrer() {
    if (!personne) return;
    setEnregistrement(true);
    try {
      const modifie = await clientPersonnes.modifier(personne.id, personne);
      setPersonne(modifie);
      toaster(t("referentiels.modifie"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnregistrement(false);
    }
  }

  async function desactiver() {
    if (!personne || !confirm(t("contacts.desactiver_confirmation") as string)) return;
    try {
      const modifie = await clientPersonnes.desactiver(personne.id);
      setPersonne(modifie);
      toaster(t("contacts.desactive"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function creerLienPartage() {
    if (!personne) return;
    try {
      const { chemin } = await clientPersonnes.partager(personne.id);
      const url = `${window.location.origin}${chemin}`;
      setLienPartage(url);
      toaster(t("contacts.lien_cree"));
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  if (!personne) return <p className="text-sm text-dim">{t("commun.chargement")}</p>;

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="mb-3 min-h-tap text-sm text-dim hover:text-off">
        ← {t("commun.retour")}
      </button>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className={`font-display text-2xl text-off ${!personne.actif ? "opacity-50" : ""}`}>
          {personne.nom} {!personne.actif && <span className="text-sm text-dim">({t("contacts.desactive")})</span>}
        </h1>
        {peutEditer && (
          <div className="flex gap-2">
            <BoutonSecondaire type="button" onClick={() => void creerLienPartage()}>
              {t("contacts.partager")}
            </BoutonSecondaire>
            {personne.actif && (
              <BoutonSecondaire type="button" onClick={() => void desactiver()}>
                {t("contacts.desactiver")}
              </BoutonSecondaire>
            )}
          </div>
        )}
      </div>

      {lienPartage && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-line bg-panel2 px-3 py-2 text-sm">
          <span className="truncate text-off">{lienPartage}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(lienPartage);
              toaster(t("contacts.lien_copie"));
            }}
            className="min-h-tap shrink-0 text-sable"
          >
            {t("contacts.copier_lien")}
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enregistrer();
        }}
      >
        <div className="grid gap-x-4 md:grid-cols-2">
          <Champ label={t("contacts.champs.nom")}>
            <ChampTexte disabled={!peutEditer} value={personne.nom} onChange={(e) => champ("nom", e.target.value)} />
          </Champ>
          <Champ label={t("contacts.champs.telephone")}>
            <ChampTexte disabled={!peutEditer} value={personne.telephone ?? ""} onChange={(e) => champ("telephone", e.target.value || null)} />
          </Champ>
          <Champ label={t("contacts.champs.email")}>
            <ChampTexte type="email" disabled={!peutEditer} value={personne.email ?? ""} onChange={(e) => champ("email", e.target.value || null)} />
          </Champ>
          <Champ label={t("contacts.champs.instagram")}>
            <ChampTexte disabled={!peutEditer} value={personne.instagram ?? ""} onChange={(e) => champ("instagram", e.target.value || null)} />
          </Champ>
          <Champ label={t("contacts.champs.ville")}>
            <ChampTexte disabled={!peutEditer} value={personne.ville ?? ""} onChange={(e) => champ("ville", e.target.value || null)} />
          </Champ>
          {peutVoirMontants && (
            <Champ label={t("contacts.champs.tarif_jour_dt")}>
              <ChampNombre disabled={!peutEditer} value={personne.tarif_jour_dt ?? ""} onChange={(e) => champ("tarif_jour_dt", e.target.value ? Number(e.target.value) : null)} />
            </Champ>
          )}
        </div>

        {(estModele || estAmbassadeur) && (
          <fieldset className="mt-4 rounded-card border border-line p-3">
            <legend className="px-1 text-sm text-dim">{t("contacts.champs.tailles_haut")}</legend>
            <div className="grid gap-x-4 md:grid-cols-3">
              <Champ label={t("contacts.champs.tailles_haut")}>
                <ChampTexte disabled={!peutEditer} value={personne.tailles.haut ?? ""} onChange={(e) => champ("tailles", { ...personne.tailles, haut: e.target.value || undefined })} />
              </Champ>
              <Champ label={t("contacts.champs.tailles_bas")}>
                <ChampTexte disabled={!peutEditer} value={personne.tailles.bas ?? ""} onChange={(e) => champ("tailles", { ...personne.tailles, bas: e.target.value || undefined })} />
              </Champ>
              <Champ label={t("contacts.champs.tailles_chaussures")}>
                <ChampTexte disabled={!peutEditer} value={personne.tailles.chaussures ?? ""} onChange={(e) => champ("tailles", { ...personne.tailles, chaussures: e.target.value || undefined })} />
              </Champ>
            </div>
            {estModele && (
              <Champ label={t("contacts.champs.portfolio_url")}>
                <ChampTexte disabled={!peutEditer} value={personne.portfolio_url ?? ""} onChange={(e) => champ("portfolio_url", e.target.value || null)} />
              </Champ>
            )}
          </fieldset>
        )}

        {estPhotoVideo && (
          <fieldset className="mt-4 rounded-card border border-line p-3">
            <legend className="px-1 text-sm text-dim">{t("contacts.champs.materiel")}</legend>
            <Champ label={t("contacts.champs.materiel")}>
              <ChampZoneTexte disabled={!peutEditer} value={personne.materiel ?? ""} onChange={(e) => champ("materiel", e.target.value || null)} />
            </Champ>
            <Champ label={t("contacts.champs.styles")}>
              <ChampTexte
                disabled={!peutEditer}
                value={personne.styles.join(", ")}
                onChange={(e) => champ("styles", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </Champ>
            <Champ label={t("contacts.champs.portfolio_url")}>
              <ChampTexte disabled={!peutEditer} value={personne.portfolio_url ?? ""} onChange={(e) => champ("portfolio_url", e.target.value || null)} />
            </Champ>
          </fieldset>
        )}

        {estFournisseur && (
          <fieldset className="mt-4 rounded-card border border-line p-3">
            <legend className="px-1 text-sm text-dim">{t("contacts.champs.specialites")}</legend>
            <Champ label={t("contacts.champs.specialites")}>
              <ChampTexte
                disabled={!peutEditer}
                value={personne.specialites.join(", ")}
                onChange={(e) => champ("specialites", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </Champ>
            <div className="grid gap-x-4 md:grid-cols-2">
              <Champ label={t("contacts.champs.delai_moyen_jours")}>
                <ChampNombre disabled={!peutEditer} value={personne.delai_moyen_jours ?? ""} onChange={(e) => champ("delai_moyen_jours", e.target.value ? Number(e.target.value) : null)} />
              </Champ>
              <Champ label={t("contacts.champs.moq_habituel")}>
                <ChampNombre disabled={!peutEditer} value={personne.moq_habituel ?? ""} onChange={(e) => champ("moq_habituel", e.target.value ? Number(e.target.value) : null)} />
              </Champ>
            </div>
            {peutVoirMontants && (
              <Champ label={t("contacts.champs.conditions_paiement")}>
                <ChampTexte disabled={!peutEditer} value={personne.conditions_paiement ?? ""} onChange={(e) => champ("conditions_paiement", e.target.value || null)} />
              </Champ>
            )}
          </fieldset>
        )}

        {estLieu && (
          <fieldset className="mt-4 rounded-card border border-line p-3">
            <legend className="px-1 text-sm text-dim">{t("contacts.champs.disponibilites")}</legend>
            <Champ label={t("contacts.champs.disponibilites")}>
              <ChampTexte disabled={!peutEditer} value={personne.disponibilites ?? ""} onChange={(e) => champ("disponibilites", e.target.value || null)} />
            </Champ>
          </fieldset>
        )}

        <Champ label={t("contacts.champs.notes")}>
          <ChampZoneTexte disabled={!peutEditer} value={personne.notes ?? ""} onChange={(e) => champ("notes", e.target.value || null)} />
        </Champ>

        {peutEditer && (
          <div className="mt-4 flex justify-end">
            <BoutonPrimaire type="submit" disabled={enregistrement}>
              {t("commun.enregistrer")}
            </BoutonPrimaire>
          </div>
        )}
      </form>
    </div>
  );
}
