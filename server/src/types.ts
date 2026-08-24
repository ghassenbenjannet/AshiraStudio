import type { Utilisateur } from "@achirah/shared";

export interface AppEnv {
  Variables: {
    utilisateur: Utilisateur | null;
    sessionToken: string | null;
  };
}
