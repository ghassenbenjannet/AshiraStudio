import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ROLES_SYSTEME, type RoleSysteme, MOTS_DE_PASSE_LONGUEUR_MIN } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientUtilisateurs } from "../../lib/resources/utilisateurs.js";
import type { Utilisateur } from "@achirah/shared";

export function UtilisateursAdmin({ peutGerer }: { peutGerer: boolean }) {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [lignes, setLignes] = useState<Utilisateur[] | null>(null);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [form, setForm] = useState({ email: "", nom: "", mot_de_passe: "", role_systeme: "contributeur" as RoleSysteme });

  const charger = () => clientUtilisateurs.lister().then(setLignes).catch(() => setLignes([]));
  useEffect(() => {
    charger();
  }, []);

  async function creerUtilisateur() {
    setEnregistrement(true);
    setErreur(null);
    try {
      await clientUtilisateurs.creer(form);
      toaster(t("referentiels.cree"));
      setDialogueOuvert(false);
      setForm({ email: "", nom: "", mot_de_passe: "", role_systeme: "contributeur" });
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("commun.erreur_generique"));
    } finally {
      setEnregistrement(false);
    }
  }

  async function changerRole(u: Utilisateur, role_systeme: RoleSysteme) {
    try {
      await clientUtilisateurs.modifier(u.id, { role_systeme });
      toaster(t("referentiels.modifie"));
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  if (!peutGerer) return <p className="text-sm text-dim">{t("commun.erreur_generique")}</p>;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-off">{t("utilisateurs.titre")}</h2>
        <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
          {t("utilisateurs.ajouter")}
        </BoutonPrimaire>
      </div>

      {!lignes && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {lignes && (
        <ul className="divide-y divide-line rounded-card border border-line">
          {lignes.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm text-off">{u.nom}</p>
                <p className="text-xs text-dim">{u.email}</p>
              </div>
              <ChampSelect value={u.role_systeme} onChange={(e) => void changerRole(u, e.target.value as RoleSysteme)} className="!w-40">
                {ROLES_SYSTEME.map((r) => (
                  <option key={r} value={r}>
                    {t(`utilisateurs.roles.${r}`)}
                  </option>
                ))}
              </ChampSelect>
            </li>
          ))}
        </ul>
      )}

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("utilisateurs.ajouter")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creerUtilisateur();
          }}
        >
          <Champ label={t("contacts.champs.nom")}>
            <ChampTexte required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          </Champ>
          <Champ label={t("auth.email")}>
            <ChampTexte type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Champ>
          <Champ label={t("utilisateurs.mot_de_passe_initial")}>
            <ChampTexte
              type="password"
              required
              minLength={MOTS_DE_PASSE_LONGUEUR_MIN}
              value={form.mot_de_passe}
              onChange={(e) => setForm((f) => ({ ...f, mot_de_passe: e.target.value }))}
            />
          </Champ>
          <Champ label={t("utilisateurs.role")}>
            <ChampSelect value={form.role_systeme} onChange={(e) => setForm((f) => ({ ...f, role_systeme: e.target.value as RoleSysteme }))}>
              {ROLES_SYSTEME.map((r) => (
                <option key={r} value={r}>
                  {t(`utilisateurs.roles.${r}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>

          {erreur && <p className="mb-3 text-sm text-danger-fg">{erreur}</p>}

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
