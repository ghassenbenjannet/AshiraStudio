import type { SessionUtilisateur } from "./lib/auth.js";

export interface AppEnv {
  Variables: {
    utilisateur: SessionUtilisateur | null;
    sessionToken: string | null;
  };
}
