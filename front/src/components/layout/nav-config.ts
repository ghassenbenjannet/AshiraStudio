/** Source unique de la structure de navigation (§3, RG-PARAM1 : structure fixe, libellés traduits). */

export interface EspaceNav {
  id: string;
  chemin: string;
  labelKey: string;
  groupe: "piloter" | "creer" | "analyser" | "equipe" | "admin";
  icone: string;
}

/** Rail latéral desktop (≥1024 px) — sept espaces. */
export const ESPACES: EspaceNav[] = [
  { id: "home", chemin: "/aujourdhui", labelKey: "nav.espaces.home", groupe: "piloter", icone: "◆" },
  { id: "plan", chemin: "/plan", labelKey: "nav.espaces.plan", groupe: "piloter", icone: "◫" },
  { id: "catalogue", chemin: "/catalogue", labelKey: "nav.mobile.catalogue", groupe: "piloter", icone: "▤" },
  { id: "create", chemin: "/create", labelKey: "nav.espaces.create", groupe: "creer", icone: "✦" },
  { id: "grow", chemin: "/grow", labelKey: "nav.espaces.grow", groupe: "analyser", icone: "↗" },
  { id: "measure", chemin: "/measure", labelKey: "nav.espaces.measure", groupe: "analyser", icone: "▥" },
  { id: "people", chemin: "/people", labelKey: "nav.espaces.people", groupe: "equipe", icone: "◉" },
  { id: "parametres", chemin: "/parametres", labelKey: "nav.espaces.parametres", groupe: "admin", icone: "⚙" },
];

/** Barre basse mobile (<768 px) — cinq onglets. */
export const ONGLETS_MOBILES: EspaceNav[] = [
  { id: "aujourdhui", chemin: "/aujourdhui", labelKey: "nav.mobile.aujourdhui", groupe: "piloter", icone: "◆" },
  { id: "campagnes", chemin: "/plan", labelKey: "nav.mobile.campagnes", groupe: "piloter", icone: "◫" },
  { id: "studio", chemin: "/create", labelKey: "nav.mobile.studio", groupe: "creer", icone: "✦" },
  { id: "catalogue", chemin: "/catalogue", labelKey: "nav.mobile.catalogue", groupe: "piloter", icone: "▤" },
  { id: "plus", chemin: "/plus", labelKey: "nav.mobile.plus", groupe: "admin", icone: "•••" },
];
