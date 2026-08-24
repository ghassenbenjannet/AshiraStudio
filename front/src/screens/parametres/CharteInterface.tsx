import { Bouton, BoutonIcone } from "../../components/ui/Bouton.js";
import { Icone, NOMS_ICONES } from "../../components/ui/Icone.js";

const libelles: Record<(typeof NOMS_ICONES)[number], string> = {
  ajouter: "Ajouter",
  modifier: "Modifier",
  archiver: "Archiver",
  restaurer: "Réactiver",
  supprimer: "Supprimer",
  enregistrer: "Enregistrer",
  fermer: "Fermer",
  retour: "Retour",
  suivant: "Suivant",
  campagne: "Campagne",
  tache: "Tâche",
  calendrier: "Calendrier",
  liste: "Liste",
  kanban: "Kanban",
  reglages: "Paramètres",
  utilisateurs: "Collaborateurs",
  integration: "Intégration",
  ia: "Intelligence artificielle",
  securite: "Sécurité",
  exporter: "Exporter",
  rechercher: "Rechercher",
  actualiser: "Actualiser",
  connecter: "Connecter",
  deconnecter: "Déconnecter",
  verifier: "Valider",
  menu: "Menu",
  notification: "Notification",
  voir: "Consulter",
};

export function CharteInterface() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-line bg-panel p-4 sm:p-5">
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold text-off">Charte des boutons</h2>
          <p className="mt-1 text-sm text-dim">Les actions utilisent un libellé clair, une icône cohérente et un état clavier visible.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-dim">Actions principales</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Bouton icone="ajouter">Créer</Bouton>
              <Bouton variante="secondaire" icone="modifier">Modifier</Bouton>
              <Bouton variante="tertiaire" icone="voir">Consulter</Bouton>
              <Bouton variante="succes" icone="verifier">Valider</Bouton>
              <Bouton variante="danger" icone="supprimer">Supprimer</Bouton>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-dim">États et dimensions</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Bouton taille="sm" icone="enregistrer">Petit</Bouton>
              <Bouton icone="enregistrer">Standard</Bouton>
              <Bouton taille="lg" icone="enregistrer">Large</Bouton>
              <Bouton charge>Traitement</Bouton>
              <Bouton disabled>Indisponible</Bouton>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-dim">Boutons compacts</h3>
          <div className="flex flex-wrap items-center gap-2">
            <BoutonIcone label="Ajouter" icone="ajouter" variante="primaire" />
            <BoutonIcone label="Modifier" icone="modifier" variante="secondaire" />
            <BoutonIcone label="Consulter" icone="voir" />
            <BoutonIcone label="Supprimer" icone="supprimer" variante="danger" />
          </div>
          <p className="mt-2 text-xs text-dim">Chaque bouton compact expose un libellé aux lecteurs d’écran et une infobulle au survol.</p>
        </div>
      </section>

      <section className="rounded-card border border-line bg-panel p-4 sm:p-5">
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold text-off">Bibliothèque d’icônes</h2>
          <p className="mt-1 text-sm text-dim">Un vocabulaire visuel unique pour les objets, vues et actions de l’application.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {NOMS_ICONES.map((nom) => (
            <div key={nom} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-field border border-line bg-panel2 p-3 text-center text-off">
              <Icone nom={nom} taille={22} />
              <span className="text-xs font-medium">{libelles[nom]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
