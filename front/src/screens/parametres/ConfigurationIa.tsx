import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "../../components/ui/Dialog.js";
import { BoutonPrimaire, BoutonSecondaire, Champ, ChampNombre, ChampSelect, ChampTexte } from "../../components/ui/Champ.js";
import { ApiError } from "../../lib/api.js";
import { clientConfigurationIa, type ConfigurationIa as ConfigurationIaType } from "../../lib/resources/systeme.js";
import { useToast } from "../../lib/toast-context.js";
import { Bouton } from "../../components/ui/Bouton.js";

export function ConfigurationIa() {
  const { toaster } = useToast();
  const [configuration, setConfiguration] = useState<ConfigurationIaType | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState({ api_key: "", modele: "claude-sonnet-4-6", budget_tokens_jour: 2_000_000 });

  const charger = () => clientConfigurationIa.lire().then((c) => {
    setConfiguration(c);
    setForm((f) => ({ ...f, modele: c.modele, budget_tokens_jour: c.budget_tokens_jour }));
  });

  useEffect(() => { void charger(); }, []);

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const entree = { modele: form.modele, budget_tokens_jour: form.budget_tokens_jour, ...(form.api_key ? { api_key: form.api_key } : {}) };
      setConfiguration(await clientConfigurationIa.enregistrer(entree));
      setForm((f) => ({ ...f, api_key: "" }));
      setOuvert(false);
      toaster("Configuration IA enregistrée");
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Impossible d’enregistrer la configuration");
    } finally {
      setEnCours(false);
    }
  }

  async function desactiver() {
    await clientConfigurationIa.desactiver();
    await charger();
    toaster("IA désactivée");
  }

  return (
    <section className="overflow-hidden rounded-card bg-[#191713] text-white">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-white">Intelligence artificielle</h2>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${configuration?.configuree ? "bg-olive/30 text-[#8ED7C7]" : "bg-white/10 text-white/60"}`}>
              {configuration?.configuree ? "● ACTIVE" : "○ NON CONFIGURÉE"}
            </span>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-white/60">La clé fournisseur est saisie ici par un administrateur, chiffrée côté serveur et jamais renvoyée au navigateur.</p>
        </div>
        <BoutonPrimaire type="button" icone={configuration?.configuree ? "modifier" : "ia"} onClick={() => setOuvert(true)}>{configuration?.configuree ? "Modifier" : "Configurer l’IA"}</BoutonPrimaire>
      </div>
      <div className="grid gap-px bg-white/10 sm:grid-cols-3">
        <div className="bg-[#211F1A] p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Fournisseur</div><div className="mt-1 text-sm font-semibold">Anthropic</div></div>
        <div className="bg-[#211F1A] p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Modèle</div><div className="mt-1 truncate text-sm font-semibold">{configuration?.modele ?? "—"}</div></div>
        <div className="bg-[#211F1A] p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Clé API</div><div className="mt-1 text-sm font-semibold">{configuration?.cle_masquee ?? "Non renseignée"}</div></div>
      </div>

      <Dialog ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Configuration de l’IA">
        <form onSubmit={(e) => void enregistrer(e)}>
          <Champ label="Fournisseur"><ChampSelect value="anthropic" disabled><option value="anthropic">Anthropic</option></ChampSelect></Champ>
          <Champ label={configuration?.configuree ? "Nouvelle clé API (laisser vide pour conserver l’actuelle)" : "Clé API"}>
            <ChampTexte type="password" required={!configuration?.configuree} value={form.api_key} onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))} autoComplete="new-password" />
          </Champ>
          <Champ label="Modèle"><ChampTexte required value={form.modele} onChange={(e) => setForm((f) => ({ ...f, modele: e.target.value }))} /></Champ>
          <Champ label="Budget quotidien de tokens"><ChampNombre required min={1000} max={100000000} value={form.budget_tokens_jour} onChange={(e) => setForm((f) => ({ ...f, budget_tokens_jour: Number(e.target.value) }))} /></Champ>
          <div className="mb-4 rounded-field bg-[#E3F3EF] p-3 text-xs leading-relaxed text-[#0F6656]">Le secret est chiffré avec la clé maîtresse du serveur. Seuls son état et ses quatre derniers caractères sont affichés.</div>
          {erreur && <p className="mb-3 text-sm text-danger-fg">{erreur}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <div>{configuration?.configuree && <Bouton type="button" variante="danger" icone="deconnecter" onClick={() => void desactiver()}>Désactiver</Bouton>}</div>
            <div className="flex gap-2"><BoutonSecondaire type="button" icone="fermer" onClick={() => setOuvert(false)}>Annuler</BoutonSecondaire><BoutonPrimaire type="submit" icone="enregistrer" charge={enCours}>Enregistrer</BoutonPrimaire></div>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
