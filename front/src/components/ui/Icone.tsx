import type { ReactNode, SVGProps } from "react";

export const NOMS_ICONES = [
  "ajouter",
  "modifier",
  "archiver",
  "restaurer",
  "supprimer",
  "enregistrer",
  "fermer",
  "retour",
  "suivant",
  "campagne",
  "tache",
  "calendrier",
  "liste",
  "kanban",
  "reglages",
  "utilisateurs",
  "integration",
  "ia",
  "securite",
  "exporter",
  "rechercher",
  "actualiser",
  "connecter",
  "deconnecter",
  "verifier",
  "menu",
  "notification",
  "voir",
] as const;

export type NomIcone = (typeof NOMS_ICONES)[number];

const dessins: Record<NomIcone, ReactNode> = {
  ajouter: <><path d="M12 5v14M5 12h14" /></>,
  modifier: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  archiver: <><path d="M21 8v13H3V8" /><path d="M1 3h22v5H1zM10 12h4" /></>,
  restaurer: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  supprimer: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" /></>,
  enregistrer: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></>,
  fermer: <><path d="m6 6 12 12M18 6 6 18" /></>,
  retour: <><path d="m15 18-6-6 6-6" /></>,
  suivant: <><path d="m9 18 6-6-6-6" /></>,
  campagne: <><path d="M3 21V5a2 2 0 0 1 2-2h8l2 3h4a2 2 0 0 1 2 2v13Z" /><path d="M8 12h8M8 16h5" /></>,
  tache: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m7 12 3 3 7-7" /></>,
  calendrier: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  liste: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  kanban: <><rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="12" rx="1" /></>,
  reglages: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  utilisateurs: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  integration: <><path d="M8 12h8M12 8v8" /><path d="M4 9V5a2 2 0 0 1 2-2h4M20 15v4a2 2 0 0 1-2 2h-4M15 4h4a2 2 0 0 1 2 2v4M9 20H5a2 2 0 0 1-2-2v-4" /></>,
  ia: <><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M9 10h.01M15 10h.01M9 15h6M12 5V2" /></>,
  securite: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  exporter: <><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v7h14v-7" /></>,
  rechercher: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  actualiser: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>,
  connecter: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
  deconnecter: <><path d="m14 8 4 4-4 4M18 12H7" /><path d="M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></>,
  verifier: <><path d="m5 12 4 4L19 6" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  notification: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  voir: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
};

type IconeProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  nom: NomIcone;
  taille?: number;
};

export function Icone({ nom, taille = 18, ...props }: IconeProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={taille}
      viewBox="0 0 24 24"
      width={taille}
      {...props}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {dessins[nom]}
    </svg>
  );
}
