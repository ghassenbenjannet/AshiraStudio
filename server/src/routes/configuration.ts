import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { mkdir, access } from "node:fs/promises";
import { REGISTRE_PARAMETRES, lireParametre, lireParametres, ecrireParametre, masquerSecret } from "../lib/config-store.js";
import { verifierDisponibiliteIa, genererTourConversation, messageUtilisateur } from "../lib/ia/fournisseur.js";
import { exigerCapacite } from "../middleware/rbac.js";
import type { AppEnv } from "../types.js";

/**
 * CDC v4, Lot 2.3 (§8.3) — API du centre de configuration. RG-CFG1 : jamais de secret en clair
 * (masque `sk-…4f2a` + booléen `defini`). RG-CFG2 : capacité `parametres.gerer` sur toutes les
 * routes. RG-CFG3 : l'audit (déjà dans `ecrireParametre`) ne porte jamais la valeur. RG-CFG4 :
 * « Tester » n'enregistre rien en base — le dernier résultat vit en mémoire process, remis à zéro
 * à chaque redémarrage et à chaque nouvelle écriture sur la catégorie. RG-CFG5 : une configuration
 * absente ne fait jamais planter l'appel — chaque testeur dégrade proprement.
 */
export const configurationRoutes = new Hono<AppEnv>();

const CATEGORIES = ["ia", "email", "push", "stockage", "supervision", "sauvegardes"] as const;
type Categorie = (typeof CATEGORIES)[number];

interface ResultatTest {
  ok: boolean;
  message: string;
  teste_le: string;
}

const derniersTests = new Map<Categorie, ResultatTest>();

async function etatBase(categorie: Categorie): Promise<"configure" | "non_configure"> {
  switch (categorie) {
    case "ia":
      return verifierDisponibiliteIa()
        .then(() => "configure" as const)
        .catch(() => "non_configure" as const);
    case "email": {
      const p = await lireParametres(["email.mode", "email.smtp_hote", "email.smtp_utilisateur", "email.smtp_mot_de_passe", "email.service_nom", "email.service_cle_api", "email.expediteur"]);
      if (!p["email.expediteur"]) return "non_configure";
      if ((p["email.mode"] ?? "smtp") === "smtp") return p["email.smtp_hote"] && p["email.smtp_utilisateur"] && p["email.smtp_mot_de_passe"] ? "configure" : "non_configure";
      return p["email.service_nom"] && p["email.service_cle_api"] ? "configure" : "non_configure";
    }
    case "push": {
      const p = await lireParametres(["push.vapid_cle_publique", "push.vapid_cle_privee"]);
      return p["push.vapid_cle_publique"] && p["push.vapid_cle_privee"] ? "configure" : "non_configure";
    }
    case "stockage": {
      const p = await lireParametres(["stockage.mode", "stockage.bucket", "stockage.cle_acces", "stockage.cle_secrete"]);
      if ((p["stockage.mode"] ?? "local") === "local") return "configure";
      return p["stockage.bucket"] && p["stockage.cle_acces"] && p["stockage.cle_secrete"] ? "configure" : "non_configure";
    }
    case "supervision":
      return (await lireParametre("supervision.sentry_dsn")) ? "configure" : "non_configure";
    case "sauvegardes":
      return "configure"; // dossier/heure/rétention ont tous un défaut (§8.4, déjà en place)
  }
}

/** RG-CFG5 : chaque testeur dégrade proprement — jamais d'exception non attrapée, jamais de simulation. */
async function testerCategorie(categorie: Categorie): Promise<{ ok: boolean; message: string }> {
  switch (categorie) {
    case "ia": {
      try {
        await verifierDisponibiliteIa();
        const reponse = await genererTourConversation({ system: "Réponds uniquement par le mot OK, sans rien ajouter.", messages: [messageUtilisateur("Ping de test de configuration.")], maxOutputTokens: 10 });
        return { ok: true, message: `Fournisseur IA joignable — réponse : « ${reponse.texte.trim().slice(0, 80) || "(vide)"} ».` };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Échec du test IA." };
      }
    }
    case "email": {
      const p = await lireParametres(["email.mode", "email.smtp_hote", "email.smtp_port", "email.smtp_utilisateur", "email.smtp_mot_de_passe", "email.smtp_tls"]);
      if ((p["email.mode"] ?? "smtp") !== "smtp") {
        return { ok: false, message: "Test automatique disponible uniquement pour le mode SMTP — vérifiez la clé du service transactionnel directement chez le fournisseur." };
      }
      if (!p["email.smtp_hote"]) return { ok: false, message: "Hôte SMTP non configuré." };
      try {
        const { createTransport } = await import("nodemailer");
        const transporteur = createTransport({
          host: p["email.smtp_hote"]!,
          port: Number(p["email.smtp_port"] ?? 587),
          secure: p["email.smtp_tls"] !== "false",
          auth: p["email.smtp_utilisateur"] ? { user: p["email.smtp_utilisateur"]!, pass: p["email.smtp_mot_de_passe"] ?? "" } : undefined,
        });
        await transporteur.verify();
        return { ok: true, message: "Connexion SMTP établie." };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Échec de connexion SMTP." };
      }
    }
    case "push": {
      const p = await lireParametres(["push.vapid_cle_publique", "push.vapid_cle_privee", "push.contact_email"]);
      if (!p["push.vapid_cle_publique"] || !p["push.vapid_cle_privee"]) return { ok: false, message: "Clés VAPID manquantes." };
      try {
        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(`mailto:${p["push.contact_email"] || "contact@example.com"}`, p["push.vapid_cle_publique"]!, p["push.vapid_cle_privee"]!);
        return { ok: true, message: "Paire de clés VAPID valide." };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Clés VAPID invalides." };
      }
    }
    case "stockage": {
      const p = await lireParametres(["stockage.mode", "stockage.endpoint", "stockage.bucket", "stockage.region", "stockage.cle_acces", "stockage.cle_secrete"]);
      if ((p["stockage.mode"] ?? "local") === "local") return { ok: true, message: "Stockage local — aucun test réseau nécessaire." };
      if (!p["stockage.bucket"] || !p["stockage.cle_acces"] || !p["stockage.cle_secrete"]) return { ok: false, message: "Bucket ou identifiants S3 manquants." };
      try {
        const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");
        const client = new S3Client({
          region: p["stockage.region"] || "auto",
          endpoint: p["stockage.endpoint"] || undefined,
          credentials: { accessKeyId: p["stockage.cle_acces"]!, secretAccessKey: p["stockage.cle_secrete"]! },
        });
        await client.send(new HeadBucketCommand({ Bucket: p["stockage.bucket"]! }));
        return { ok: true, message: "Bucket accessible." };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Échec d'accès au bucket." };
      }
    }
    case "supervision": {
      const dsn = await lireParametre("supervision.sentry_dsn");
      if (!dsn) return { ok: false, message: "DSN Sentry non configuré." };
      try {
        const url = new URL(dsn);
        if (!url.username) throw new Error("DSN sans clé publique.");
        return { ok: true, message: "DSN syntaxiquement valide (aucun événement de test envoyé à Sentry)." };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "DSN Sentry invalide." };
      }
    }
    case "sauvegardes": {
      const dossier = (await lireParametre("sauvegardes.dossier")) ?? "./backups";
      try {
        await mkdir(dossier, { recursive: true });
        await access(dossier);
        return { ok: true, message: `Dossier de sauvegardes accessible en écriture (${dossier}).` };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Dossier de sauvegardes inaccessible." };
      }
    }
  }
}

configurationRoutes.get("/", exigerCapacite("parametres.gerer"), async (c) => {
  const blocs = [];
  for (const categorie of CATEGORIES) {
    const cles = Object.entries(REGISTRE_PARAMETRES).filter(([, def]) => def.categorie === categorie);
    const parametres = [];
    for (const [cle, def] of cles) {
      const valeur = await lireParametre(cle);
      parametres.push({ cle, chiffre: def.chiffre, defini: valeur !== null, masque: def.chiffre ? masquerSecret(valeur) : null, valeur: def.chiffre ? null : valeur });
    }
    const dernierTest = derniersTests.get(categorie) ?? null;
    const etat = dernierTest && !dernierTest.ok ? "test_echoue" : await etatBase(categorie);
    blocs.push({ categorie, etat, dernier_test: dernierTest, parametres });
  }
  return c.json({ donnees: { blocs } });
});

const ecritureSchema = z.object({ valeur: z.string().max(10_000).nullable() });

configurationRoutes.put("/:cle", exigerCapacite("parametres.gerer"), zValidator("json", ecritureSchema), async (c) => {
  const admin = c.get("utilisateur")!;
  const cle = c.req.param("cle");
  const definition = REGISTRE_PARAMETRES[cle];
  if (!definition) return c.json({ error: { code: "parametre_inconnu", message: "Paramètre inconnu." } }, 404);

  const { valeur } = c.req.valid("json");
  await ecrireParametre(cle, valeur === "" ? null : valeur, admin.id);
  derniersTests.delete(definition.categorie as Categorie); // une nouvelle valeur invalide le dernier résultat de test (RG-CFG4)
  return c.body(null, 204);
});

configurationRoutes.post("/:categorie/tester", exigerCapacite("parametres.gerer"), async (c) => {
  const categorie = c.req.param("categorie") as Categorie;
  if (!CATEGORIES.includes(categorie)) return c.json({ error: { code: "categorie_inconnue", message: "Catégorie inconnue." } }, 404);

  const resultat = await testerCategorie(categorie);
  const dernierTest: ResultatTest = { ok: resultat.ok, message: resultat.message, teste_le: new Date().toISOString() };
  derniersTests.set(categorie, dernierTest); // en mémoire process uniquement — RG-CFG4 : « Tester » n'enregistre rien en base
  return c.json({ donnees: dernierTest });
});
