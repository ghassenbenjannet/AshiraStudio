import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { utilisateurs, taches, shootings, campagnes, personnes } from "../db/schema.js";
import { genererVevent, genererFluxIcs } from "../lib/ics.js";
import { erreurApi } from "../lib/http.js";
import type { AppEnv } from "../types.js";

/**
 * §4.6 — Flux ICS abonné : le token est l'auth, pas de session (pas de middleware exigerAuth ici).
 * Horizon J-30 → J+365, scope `mes_taches` (défaut) ou `tout`.
 */
export const icalRoutes = new Hono<AppEnv>();

icalRoutes.get("/:token", async (c) => {
  const tokenBrut = c.req.param("token");
  const token = tokenBrut.replace(/\.ics$/, "");
  const [utilisateur] = await db.select().from(utilisateurs).where(eq(utilisateurs.ical_token, token)).limit(1);
  if (!utilisateur) return erreurApi(c, 404, "lien_invalide", "Ce flux n'existe pas");

  const scope = c.req.query("scope") ?? "mes_taches";
  const aujourdhui = new Date();
  const borneDebut = new Date(aujourdhui.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const borneFin = new Date(aujourdhui.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let toutes = await db.select().from(taches);
  toutes = toutes.filter((t) => t.date_echeance >= borneDebut && t.date_echeance <= borneFin);
  if (scope === "mes_taches") toutes = toutes.filter((t) => t.assigne_ids.includes(utilisateur.id));

  const idsShooting = toutes.filter((t) => t.type === "shooting").map((t) => t.id);
  const shootingsTrouves = idsShooting.length ? await db.select().from(shootings).where(inArray(shootings.tache_id, idsShooting)) : [];
  const shootingParTache = new Map(shootingsTrouves.map((s) => [s.tache_id, s]));

  const campagnesTrouvees = await db.select().from(campagnes);
  const campagneParId = new Map(campagnesTrouvees.map((camp) => [camp.id, camp.nom]));

  const tousLesAssignes = Array.from(new Set(toutes.flatMap((t) => t.assigne_ids)));
  const personnesTrouvees = tousLesAssignes.length ? await db.select().from(personnes).where(inArray(personnes.id, tousLesAssignes)) : [];
  const personneParId = new Map(personnesTrouvees.map((p) => [p.id, p.nom]));

  const origine = new URL(c.req.url).origin;
  const vevents = toutes.map((tache) =>
    genererVevent(tache, shootingParTache.get(tache.id) ?? null, {
      campagneNom: campagneParId.get(tache.campagne_id),
      assignesNoms: tache.assigne_ids.map((id) => personneParId.get(id)).filter((n): n is string => !!n),
      lieu: tache.lieu,
      deepLink: `${origine}/plan/taches/${tache.id}`,
    }),
  );

  c.header("Access-Log", "true");
  return c.body(genererFluxIcs(vevents), 200, { "Content-Type": "text/calendar; charset=utf-8" });
});
