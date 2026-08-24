import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { personnes, articles, campagnes, audits } from "../db/schema.js";
import { versCsv } from "../lib/csv.js";
import { peutVoirMontants, redigerMontantsPersonne } from "../lib/redaction.js";
import { erreurApi } from "../lib/http.js";
import { exigerCapacite } from "../middleware/rbac.js";
import { consolidationCampagne } from "../services/campagnes.js";
import { genererRapportCampagnePdf } from "../lib/rapport-campagne-pdf.js";
import { streamPdfVersBuffer } from "../lib/pdf.js";
import type { AppEnv } from "../types.js";

export const exportsRoutes = new Hono<AppEnv>();

function repondreExport(c: any, format: string, colonnes: string[], lignes: Record<string, unknown>[], nomFichier: string) {
  if (format === "csv") {
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="${nomFichier}.csv"`);
    return c.body(versCsv(lignes, colonnes));
  }
  c.header("Content-Type", "application/json");
  c.header("Content-Disposition", `attachment; filename="${nomFichier}.json"`);
  return c.body(JSON.stringify(lignes, null, 2));
}

// ───────────────────────── Contacts ─────────────────────────

const COLONNES_CONTACTS = ["id", "nom", "type", "telephone", "email", "instagram", "ville", "tarif_jour_dt", "actif"];
exportsRoutes.get("/contacts/:format", exigerCapacite("entites.voir"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const format = c.req.param("format");
  if (format !== "csv" && format !== "json") return erreurApi(c, 400, "format_invalide", "Format attendu : csv ou json");
  const lignes = (await db.select().from(personnes)).map((p) => redigerMontantsPersonne(p, utilisateur.role_systeme));
  return repondreExport(c, format, COLONNES_CONTACTS, lignes, "contacts");
});

// ───────────────────────── Catalogue (articles) ─────────────────────────

const COLONNES_CATALOGUE = ["id", "reference", "nom", "fit", "statut_cycle", "delai_production_jours", "moq"];
exportsRoutes.get("/catalogue/:format", exigerCapacite("entites.voir"), async (c) => {
  const format = c.req.param("format");
  if (format !== "csv" && format !== "json") return erreurApi(c, 400, "format_invalide", "Format attendu : csv ou json");
  const lignes = await db.select().from(articles);
  return repondreExport(c, format, COLONNES_CATALOGUE, lignes, "catalogue");
});

// ───────────────────────── Campagnes ─────────────────────────

const COLONNES_CAMPAGNES = ["id", "nom", "statut", "objectif", "date_debut", "date_fin", "budget_total_dt"];
exportsRoutes.get("/campagnes/:format{csv|json}", exigerCapacite("entites.voir"), async (c) => {
  const utilisateur = c.get("utilisateur")!;
  const format = c.req.param("format");
  if (format !== "csv" && format !== "json") return erreurApi(c, 400, "format_invalide", "Format attendu : csv ou json");
  const lignes = (await db.select().from(campagnes)).map((camp) => (peutVoirMontants(utilisateur.role_systeme) ? camp : { ...camp, budget_total_dt: null }));
  return repondreExport(c, format, COLONNES_CAMPAGNES, lignes, "campagnes");
});

// ───────────────────────── Audit ─────────────────────────

const COLONNES_AUDIT = ["id", "at", "utilisateur_id", "action", "entite_type", "entite_id", "via_agent"];
exportsRoutes.get("/audit/:format", exigerCapacite("parametres.gerer"), async (c) => {
  const format = c.req.param("format");
  if (format !== "csv" && format !== "json") return erreurApi(c, 400, "format_invalide", "Format attendu : csv ou json");
  const lignes = await db.select().from(audits).orderBy(desc(audits.at));
  return repondreExport(c, format, COLONNES_AUDIT, lignes, "audit");
});

// ───────────────────────── Rapport de campagne (PDF) ─────────────────────────

exportsRoutes.get("/campagnes/:id/rapport.pdf", exigerCapacite("entites.voir"), async (c) => {
  const [campagne] = await db.select().from(campagnes).where(eq(campagnes.id, c.req.param("id"))).limit(1);
  if (!campagne) return erreurApi(c, 404, "introuvable", "Campagne introuvable");
  const consolidation = await consolidationCampagne(campagne.id);
  const doc = genererRapportCampagnePdf({
    nom: campagne.nom,
    dateDebut: campagne.date_debut,
    dateFin: campagne.date_fin,
    objectif: campagne.objectif,
    rapport: campagne.rapport,
    kpiCibles: campagne.kpi_cibles,
    resultats: campagne.resultats,
    consolidation,
  });
  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", `inline; filename="rapport-${campagne.nom.replace(/[^a-z0-9]/gi, "-")}.pdf"`);
  return c.body((await streamPdfVersBuffer(doc)) as Uint8Array<ArrayBuffer>, 200);
});
