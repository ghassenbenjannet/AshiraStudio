function required(name: string, fallbackDev?: string): string {
  const v = process.env[name] ?? fallbackDev;
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

const isProd = process.env.NODE_ENV === "production";

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? "./data/achirah.sqlite",
  uploadsDir: process.env.UPLOADS_DIR ?? "./uploads",
  backupsDir: process.env.BACKUPS_DIR ?? "./backups",
  /** Clé de chiffrement AES-256 des credentials d'intégrations, env serveur uniquement (§8.3). */
  encryptionKey: required("ENCRYPTION_KEY", isProd ? undefined : "dev-only-32-byte-key-not-secure!!"),
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : isProd,
  budgetTokensJourDefaut: Number(process.env.BUDGET_TOKENS_JOUR ?? 2_000_000),
};
