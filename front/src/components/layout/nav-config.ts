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
}

/** Rail latéral desktop (≥1024 px) — groupe « campagne », contextuel à la campagne active. */
export const ESPACES_CAMPAGNE: EspaceNav[] = [
  { id: "home", chemin: "/aujourdhui", labelKey: "nav.espaces.home" },
  { id: "espace_travail", chemin: "/plan", labelKey: "nav.espaces.plan" },
  { id: "studio", chemin: "/create", labelKey: "nav.espaces.create" },
];

/** Rail latéral desktop — groupe « patrimoine », transverse à toutes les campagnes. */
export const ESPACES_PATRIMOINE: EspaceNav[] = [
  { id: "catalogue", chemin: "/catalogue", labelKey: "nav.espaces.catalogue" },
  { id: "people", chemin: "/people", labelKey: "nav.espaces.people" },
  { id: "measure", chemin: "/measure", labelKey: "nav.espaces.measure" },
  { id: "grow", chemin: "/grow", labelKey: "nav.espaces.grow" },
  { id: "parametres", chemin: "/parametres", labelKey: "nav.espaces.parametres" },
];

/** Barre basse mobile (<768 px) — cinq onglets : Aujourd'hui · Campagne · Studio · Catalogue · Plus. */
export const ONGLETS_MOBILES: EspaceNav[] = [
  { id: "aujourdhui", chemin: "/aujourdhui", labelKey: "nav.mobile.aujourdhui" },
  { id: "campagnes", chemin: "/plan", labelKey: "nav.mobile.campagnes" },
  { id: "studio", chemin: "/create", labelKey: "nav.mobile.studio" },
  { id: "catalogue", chemin: "/catalogue", labelKey: "nav.mobile.catalogue" },
  { id: "plus", chemin: "/plus", labelKey: "nav.mobile.plus" },
];
