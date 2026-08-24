import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { STATUT_CONTENU, TYPE_CONTENU, aCapacite, type Contenu, type Campagne, type ListeSimple, type Registre } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, ChampZoneTexte, ChampSelect, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useAuth } from "../../lib/auth-context.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientContenus } from "../../lib/resources/contenus.js";
import { clientCampagnes } from "../../lib/resources/campagnes.js";
import { clientPlateformesContenu, clientRegistres } from "../../lib/resources/referentiels.js";

const BADGE_STATUT: Record<string, string> = {
  brouillon: "text-dim",
  en_revue: "text-sable",
  approuve: "text-olive",
  planifie: "text-olive",
  publie: "text-olive",
  archive: "text-dim",
};

export function ContenusListe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const { toaster } = useToast();
  const peutEditer = !!utilisateur && aCapacite(utilisateur.role_systeme, "entites.editer");

  const [contenus, setContenus] = useState<Contenu[] | null>(null);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [plateformes, setPlateformes] = useState<ListeSimple[]>([]);
  const [registres, setRegistres] = useState<Registre[]>([]);
  const [statut, setStatut] = useState("");
  const [campagneId, setCampagneId] = useState("");
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [form, setForm] = useState({ campagne_id: "", type: "post" as (typeof TYPE_CONTENU)[number], titre: "", caption: "", registre_id: "", plateformes: [] as string[] });

  const charger = () => clientContenus.lister({ statut: statut || undefined, campagne_id: campagneId || undefined }).then(setContenus);
  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut, campagneId]);
  useEffect(() => {
    clientCampagnes.lister().then(setCampagnes);
    clientPlateformesContenu.lister().then(setPlateformes);
    clientRegistres.lister().then(setRegistres);
  }, []);

  function togglePlateforme(id: string) {
    setForm((f) => ({ ...f, plateformes: f.plateformes.includes(id) ? f.plateformes.filter((p) => p !== id) : [...f.plateformes, id] }));
  }

  async function creer() {
    try {
      const cree = await clientContenus.creer({
        campagne_id: form.campagne_id,
        type: form.type,
        titre: form.titre,
        caption: form.caption,
        registre_id: form.registre_id || null,
        plateformes: form.plateformes,
      });
      setDialogueOuvert(false);
      setForm({ campagne_id: "", type: "post", titre: "", caption: "", registre_id: "", plateformes: [] });
      charger();
      navigate(`/create/contenus/${cree.id}`);
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  const nomCampagne = (id: string) => campagnes.find((c) => c.id === id)?.nom ?? "—";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-44">
          <ChampSelect value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">{t("contenus.tous_statuts")}</option>
            {STATUT_CONTENU.map((s) => (
              <option key={s} value={s}>
                {t(`contenus.statuts.${s}`)}
              </option>
            ))}
          </ChampSelect>
        </div>
        <div className="w-56">
          <ChampSelect value={campagneId} onChange={(e) => setCampagneId(e.target.value)}>
            <option value="">{t("contenus.toutes_campagnes")}</option>
            {campagnes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </ChampSelect>
        </div>
        <div className="flex-1" />
        {peutEditer && (
          <BoutonPrimaire type="button" onClick={() => setDialogueOuvert(true)}>
            {t("contenus.nouveau")}
          </BoutonPrimaire>
        )}
      </div>

      {!contenus && <p className="text-sm text-dim">{t("commun.chargement")}</p>}
      {contenus && contenus.length === 0 && <p className="text-sm text-dim">{t("commun.aucun_resultat")}</p>}
      <ul className="flex flex-col gap-1">
        {contenus?.map((ct) => (
          <li key={ct.id}>
            <button
              type="button"
              onClick={() => navigate(`/create/contenus/${ct.id}`)}
              className="flex min-h-tap w-full items-center justify-between gap-2 rounded-card border border-line bg-panel px-3 py-2 text-start hover:border-sable"
            >
              <span>
                <span className="block text-sm text-off">{ct.titre}</span>
                <span className="text-xs text-dim">
                  {t(`contenus.types.${ct.type}`)} · {nomCampagne(ct.campagne_id)}
                </span>
              </span>
              <span className={`text-xs font-medium ${BADGE_STATUT[ct.statut]}`}>{t(`contenus.statuts.${ct.statut}`)}</span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog ouvert={dialogueOuvert} onFermer={() => setDialogueOuvert(false)} titre={t("contenus.nouveau")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
        >
          <Champ label={t("contenus.champs.campagne")}>
            <ChampSelect required value={form.campagne_id} onChange={(e) => setForm((f) => ({ ...f, campagne_id: e.target.value }))}>
              <option value="" disabled>
                —
              </option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("contenus.champs.type")}>
            <ChampSelect value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as (typeof TYPE_CONTENU)[number] }))}>
              {TYPE_CONTENU.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`contenus.types.${ty}`)}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("contenus.champs.titre")}>
            <ChampTexte required value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
          </Champ>
          <Champ label={t("contenus.champs.caption")}>
            <ChampZoneTexte value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} rows={4} />
          </Champ>
          <Champ label={t("contenus.champs.registre")}>
            <ChampSelect value={form.registre_id} onChange={(e) => setForm((f) => ({ ...f, registre_id: e.target.value }))}>
              <option value="">—</option>
              {registres.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </ChampSelect>
          </Champ>
          <Champ label={t("contenus.champs.plateformes")}>
            <div className="flex flex-wrap gap-2">
              {plateformes.map((p) => (
                <label key={p.id} className="flex items-center gap-1 rounded-field border border-line px-2 py-1 text-sm text-off">
                  <input type="checkbox" checked={form.plateformes.includes(p.id)} onChange={() => togglePlateforme(p.id)} />
                  {p.nom}
                </label>
              ))}
            </div>
          </Champ>
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogueOuvert(false)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit">{t("commun.enregistrer")}</BoutonPrimaire>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
