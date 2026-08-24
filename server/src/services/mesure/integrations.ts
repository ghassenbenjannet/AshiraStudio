import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { integrations, metriqueSnapshots } from "../../db/schema.js";
import { chiffrer, dechiffrer } from "../../lib/crypto.js";
import { enregistrerAudit } from "../../lib/audit.js";

export class ErreurMetier extends Error {
  code: string;
  status: 400 | 404 | 422;
  constructor(status: 400 | 404 | 422, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * §4.8/§8.3 — Un appel HTTP réel par plateforme, jamais simulé : sans identifiants réels
 * (aucun compte développeur disponible dans cet environnement), l'appel échoue honnêtement et le
 * message brut de la plateforme est affiché (RG-I1 lecture seule ; jamais d'écriture distante).
 */
async function appelerPlateforme(plateforme: string, credentials: Record<string, string>): Promise<{ kpis: Record<string, number>; brut: unknown }> {
  const controle = AbortSignal.timeout(8000);
  let reponse: Response;
  let url: string;

  if (plateforme === "shopify") {
    const boutique = credentials.boutique?.trim();
    if (!boutique || !credentials.access_token) throw new ErreurMetier(422, "credentials_incomplets", "boutique et access_token requis");
    url = `https://${boutique}.myshopify.com/admin/api/2024-01/shop.json`;
    reponse = await fetch(url, { headers: { "X-Shopify-Access-Token": credentials.access_token }, signal: controle });
  } else if (plateforme === "meta") {
    if (!credentials.access_token) throw new ErreurMetier(422, "credentials_incomplets", "access_token requis");
    url = `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(credentials.access_token)}`;
    reponse = await fetch(url, { signal: controle });
  } else if (plateforme === "tiktok") {
    if (!credentials.access_token || !credentials.advertiser_id) throw new ErreurMetier(422, "credentials_incomplets", "access_token et advertiser_id requis");
    url = `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${credentials.advertiser_id}"]`;
    reponse = await fetch(url, { headers: { "Access-Token": credentials.access_token }, signal: controle });
  } else if (plateforme === "ga4") {
    if (!credentials.access_token || !credentials.property_id) throw new ErreurMetier(422, "credentials_incomplets", "access_token et property_id requis");
    url = `https://analyticsdata.googleapis.com/v1beta/properties/${credentials.property_id}:runReport`;
    reponse = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${credentials.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ dateRanges: [{ startDate: "7daysAgo", endDate: "today" }], metrics: [{ name: "sessions" }] }),
      signal: controle,
    });
  } else {
    throw new ErreurMetier(422, "plateforme_inconnue", `Plateforme non supportée : ${plateforme}`);
  }

  const corps = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const messageBrut = typeof corps === "object" && corps ? JSON.stringify(corps) : `HTTP ${reponse.status}`;
    throw new Error(messageBrut);
  }

  // Extraction best-effort des champs numériques de premier niveau — la vraie source de vérité
  // du MEASURE reste la saisie manuelle (§4.8 : « l'app est complète sans les API »).
  const kpis: Record<string, number> = {};
  if (corps && typeof corps === "object") {
    for (const [cle, valeur] of Object.entries(corps as Record<string, unknown>)) {
      if (typeof valeur === "number") kpis[cle] = valeur;
    }
  }
  return { kpis, brut: corps };
}

export async function connecterIntegration(plateforme: string, credentials: Record<string, string>, utilisateurId: string) {
  const chiffre = chiffrer(JSON.stringify(credentials));
  const existante = (await db.select().from(integrations).where(eq(integrations.plateforme, plateforme)))[0];
  let ligne;
  if (existante) {
    [ligne] = (await db.update(integrations).set({ credentials_chiffres: chiffre, statut: "deconnectee", derniere_erreur: null }).where(eq(integrations.id, existante.id)).returning()) as any[];
  } else {
    [ligne] = (await db.insert(integrations).values({ plateforme, credentials_chiffres: chiffre, statut: "deconnectee" }).returning()) as any[];
  }
  await enregistrerAudit({ utilisateurId, action: "integration.connecter", entiteType: "integration", entiteId: ligne.id });
  return syncIntegration(ligne.id, utilisateurId);
}

export async function syncIntegration(id: string, utilisateurId: string) {
  const [integration] = await db.select().from(integrations).where(eq(integrations.id, id)).limit(1);
  if (!integration) throw new ErreurMetier(404, "introuvable", "Intégration introuvable");
  if (!integration.credentials_chiffres) throw new ErreurMetier(422, "non_connectee", "Aucun identifiant enregistré pour cette intégration");

  const maintenant = new Date().toISOString();
  try {
    const credentials = JSON.parse(dechiffrer(integration.credentials_chiffres)) as Record<string, string>;
    const { kpis } = await appelerPlateforme(integration.plateforme, credentials);
    if (Object.keys(kpis).length > 0) {
      await db.insert(metriqueSnapshots).values({ plateforme: integration.plateforme, date: maintenant.slice(0, 10), kpis, source: "api" });
    }
    const [modifie] = (await db.update(integrations).set({ statut: "connectee", dernier_sync: maintenant, derniere_erreur: null }).where(eq(integrations.id, id)).returning()) as any[];
    await enregistrerAudit({ utilisateurId, action: "integration.sync", entiteType: "integration", entiteId: id, apres: { statut: "connectee" } });
    return modifie;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de synchronisation inconnue";
    const [modifie] = (await db.update(integrations).set({ statut: "erreur", derniere_erreur: message, dernier_sync: maintenant }).where(eq(integrations.id, id)).returning()) as any[];
    await enregistrerAudit({ utilisateurId, action: "integration.sync_echec", entiteType: "integration", entiteId: id, apres: { statut: "erreur", erreur: message } });
    return modifie;
  }
}

/** RG-I2 : la déconnexion ne supprime jamais les snapshots historiques — seuls les identifiants et le statut changent. */
export async function deconnecterIntegration(id: string, utilisateurId: string) {
  const [avant] = await db.select().from(integrations).where(eq(integrations.id, id)).limit(1);
  if (!avant) throw new ErreurMetier(404, "introuvable", "Intégration introuvable");
  const [modifie] = (await db.update(integrations).set({ statut: "deconnectee", credentials_chiffres: null, derniere_erreur: null }).where(eq(integrations.id, id)).returning()) as any[];
  await enregistrerAudit({ utilisateurId, action: "integration.deconnecter", entiteType: "integration", entiteId: id, avant: { statut: avant.statut } });
  return modifie;
}
