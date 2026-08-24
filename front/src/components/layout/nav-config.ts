/** Source unique de la structure de navigation (§3, RG-PARAM1 : structure fixe, libellés traduits). */

export interface EspaceNav {
  id: string;
  chemin: string;
  labelKey: string;
}

/** Rail latéral desktop (≥1024 px) — sept espaces. */
export const ESPACES: EspaceNav[] = [
  { id: "home", chemin: "/aujourdhui", labelKey: "nav.espaces.home" },
  { id: "plan", chemin: "/plan", labelKey: "nav.espaces.plan" },
  { id: "create", chemin: "/create", labelKey: "nav.espaces.create" },
  { id: "grow", chemin: "/grow", labelKey: "nav.espaces.grow" },
  { id: "measure", chemin: "/measure", labelKey: "nav.espaces.measure" },
  { id: "people", chemin: "/people", labelKey: "nav.espaces.people" },
  { id: "parametres", chemin: "/parametres", labelKey: "nav.espaces.parametres" },
];

/** Barre basse mobile (<768 px) — cinq onglets. */
export const ONGLETS_MOBILES: EspaceNav[] = [
  { id: "aujourdhui", chemin: "/aujourdhui", labelKey: "nav.mobile.aujourdhui" },
  { id: "campagnes", chemin: "/plan", labelKey: "nav.mobile.campagnes" },
  { id: "studio", chemin: "/create", labelKey: "nav.mobile.studio" },
  { id: "catalogue", chemin: "/catalogue", labelKey: "nav.mobile.catalogue" },
  { id: "plus", chemin: "/plus", labelKey: "nav.mobile.plus" },
];
