import { obtenirOuGenererCleChiffrement } from "./encryption-key.js";

const isProd = process.env.NODE_ENV === "production";

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  /** CDC v4, Lot 3.1 — PostgreSQL local. L'autre des deux seules exceptions restées hors du centre de configuration (§2.2) : il faut la base pour lire la base. */
  databaseUrl: process.env.DATABASE_URL ?? "postgres://achirah_app:achirah_dev_local_only@127.0.0.1:5432/achirah",
  uploadsDir: process.env.UPLOADS_DIR ?? "./uploads",
  backupsDir: process.env.BACKUPS_DIR ?? "./backups",
  /**
   * Clé de chiffrement AES-256 des secrets du centre de configuration (§8.3). CDC v4 Lot 2.2 :
   * une des deux seules exceptions restées hors base — auto-générée si absente, jamais requise à
   * la main (voir `encryption-key.ts`).
   */
  encryptionKey: obtenirOuGenererCleChiffrement(),
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : isProd,
  budgetTokensJourDefaut: Number(process.env.BUDGET_TOKENS_JOUR ?? 2_000_000),
};
