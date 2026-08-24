/** Source unique de la structure de navigation (§3, RG-PARAM1 : structure fixe, libellés traduits).
 *
 * CR-02 §A — la campagne est le monde par défaut : le rail desktop se scinde en deux groupes
 * visuellement séparés (CAMPAGNE, contextuelle à la campagne active ; PATRIMOINE, transverse —
 * article/personne/référentiels/mesure survivent à une campagne). La barre mobile reste à 5 onglets.
 */

export interface EspaceNav {
  id: string;
  chemin: string;
  labelKey: string;
  groupe: "campagne" | "patrimoine";
  icone: string;
}

/** Rail latéral desktop (≥1024 px) — groupe « campagne », contextuel à la campagne active. */
export const ESPACES_CAMPAGNE: EspaceNav[] = [
  { id: "home", chemin: "/aujourdhui", labelKey: "nav.espaces.home", groupe: "campagne", icone: "◆" },
  { id: "espace_travail", chemin: "/plan", labelKey: "nav.espaces.plan", groupe: "campagne", icone: "◫" },
  { id: "studio", chemin: "/create", labelKey: "nav.espaces.create", groupe: "campagne", icone: "✦" },
];

/** Rail latéral desktop — groupe « patrimoine », transverse à toutes les campagnes. */
export const ESPACES_PATRIMOINE: EspaceNav[] = [
  { id: "catalogue", chemin: "/catalogue", labelKey: "nav.espaces.catalogue", groupe: "patrimoine", icone: "▤" },
  { id: "people", chemin: "/people", labelKey: "nav.espaces.people", groupe: "patrimoine", icone: "◉" },
  { id: "measure", chemin: "/measure", labelKey: "nav.espaces.measure", groupe: "patrimoine", icone: "▥" },
  { id: "grow", chemin: "/grow", labelKey: "nav.espaces.grow", groupe: "patrimoine", icone: "↗" },
  { id: "parametres", chemin: "/parametres", labelKey: "nav.espaces.parametres", groupe: "patrimoine", icone: "⚙" },
];

/** Toutes les entrées du rail, dans l'ordre d'affichage — pour les besoins qui veulent une liste plate. */
export const ESPACES: EspaceNav[] = [...ESPACES_CAMPAGNE, ...ESPACES_PATRIMOINE];

/** Barre basse mobile (<768 px) — cinq onglets : Aujourd'hui · Campagne · Studio · Catalogue · Plus. */
export const ONGLETS_MOBILES: EspaceNav[] = [
  { id: "aujourdhui", chemin: "/aujourdhui", labelKey: "nav.mobile.aujourdhui", groupe: "campagne", icone: "◆" },
  { id: "campagnes", chemin: "/plan", labelKey: "nav.mobile.campagnes", groupe: "campagne", icone: "◫" },
  { id: "studio", chemin: "/create", labelKey: "nav.mobile.studio", groupe: "campagne", icone: "✦" },
  { id: "catalogue", chemin: "/catalogue", labelKey: "nav.mobile.catalogue", groupe: "patrimoine", icone: "▤" },
  { id: "plus", chemin: "/plus", labelKey: "nav.mobile.plus", groupe: "patrimoine", icone: "•••" },
];
