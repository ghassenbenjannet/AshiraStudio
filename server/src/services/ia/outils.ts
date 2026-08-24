import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  taches,
  shootings,
  looks,
  lookItems,
  poses,
  campagnes,
  articles,
  articleColoris,
  gammes,
  coloris,
  personnes,
  ambassadeurs,
  contenus,
  budgetLignes,
  tendances,
  lecons,
  idees,
  expressions,
} from "../../db/schema.js";
import { aCapacite, type Capacite, type RoleSysteme } from "@achirah/shared";

export interface ContexteOutil {
  utilisateurId: string;
  role: RoleSysteme;
}

export class ErreurOutil extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function exigerCapaciteOutil(ctx: ContexteOutil, capacite: Capacite) {
  if (!aCapacite(ctx.role, capacite)) {
    throw new ErreurOutil("acces_refuse", `Droits insuffisants pour cet outil (capacité requise : ${capacite}).`);
  }
}

// ───────────────────────── §6.3 — Outils de lecture ─────────────────────────

export interface DefinitionOutilLecture {
  type: "lecture";
  nom: string;
  description: string;
  schema: Record<string, unknown>;
  capacite: Capacite;
  executer: (entree: any, ctx: ContexteOutil) => Promise<unknown>;
}

export const OUTILS_LECTURE: DefinitionOutilLecture[] = [
  {
    type: "lecture",
    nom: "get_taches",
    description: "Liste les tâches, filtrables par échéance (aujourdhui/semaine/retard), personne assignée, type ou campagne.",
    schema: {
      type: "object",
      properties: {
        quand: { type: "string", enum: ["aujourdhui", "semaine", "retard"] },
        personne_id: { type: "string" },
        type: { type: "string" },
        campagne_id: { type: "string" },
      },
    },
    capacite: "entites.voir",
    executer: async (entree) => {
      let lignes = await db.select().from(taches);
      const aujourdhui = new Date().toISOString().slice(0, 10);
      if (entree.quand === "aujourdhui") lignes = lignes.filter((t) => t.date_echeance === aujourdhui && t.statut !== "fait");
      if (entree.quand === "retard") lignes = lignes.filter((t) => t.date_echeance < aujourdhui && t.statut !== "fait");
      if (entree.quand === "semaine") {
        const dans7j = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        lignes = lignes.filter((t) => t.date_echeance >= aujourdhui && t.date_echeance <= dans7j);
      }
      if (entree.personne_id) lignes = lignes.filter((t) => t.assigne_ids.includes(entree.personne_id));
      if (entree.type) lignes = lignes.filter((t) => t.type === entree.type);
      if (entree.campagne_id) lignes = lignes.filter((t) => t.campagne_id === entree.campagne_id);
      return lignes.slice(0, 50);
    },
  },
  {
    type: "lecture",
    nom: "get_prochains_shootings",
    description: "Liste les prochains shootings à venir avec leur statut prêt/pas prêt (call sheet condensé).",
    schema: { type: "object", properties: { limite: { type: "number" } } },
    capacite: "entites.voir",
    executer: async (entree) => {
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const tachesShooting = (await db.select().from(taches)).filter((t) => t.type === "shooting" && t.date_echeance >= aujourdhui);
      const limite = entree.limite ?? 5;
      const resultat = [];
      for (const t of tachesShooting.sort((a, b) => a.date_echeance.localeCompare(b.date_echeance)).slice(0, limite)) {
        const [s] = await db.select().from(shootings).where(eq(shootings.tache_id, t.id)).limit(1);
        resultat.push({ tache_id: t.id, titre: t.titre, date: t.date_echeance, photographe_id: s?.photographe_id ?? null, lieu: t.lieu, pret: !!(s?.photographe_id && t.lieu && (s?.pieces?.length ?? 0) > 0) });
      }
      return resultat;
    },
  },
  {
    type: "lecture",
    nom: "get_campagnes",
    description: "Liste les campagnes, filtrables par statut.",
    schema: { type: "object", properties: { statut: { type: "string" } } },
    capacite: "entites.voir",
    executer: async (entree) => {
      let lignes = await db.select().from(campagnes);
      if (entree.statut) lignes = lignes.filter((c) => c.statut === entree.statut);
      return lignes;
    },
  },
  {
    type: "lecture",
    nom: "get_articles",
    description: "Liste les articles du catalogue avec référence, nom, prix, gamme, coloris, statut de cycle.",
    schema: { type: "object", properties: { etage: { type: "string" }, statut: { type: "string" }, categorie: { type: "string" } } },
    capacite: "entites.voir",
    executer: async (entree) => {
      const lignes = await db
        .select({
          reference: articles.reference,
          nom: articles.nom,
          gamme: gammes.nom,
          coloris: coloris.nom_commercial,
          prix_dt: articleColoris.prix_dt,
          statut_cycle: articles.statut_cycle,
        })
        .from(articleColoris)
        .innerJoin(articles, eq(articleColoris.article_id, articles.id))
        .innerJoin(gammes, eq(articles.gamme_id, gammes.id))
        .innerJoin(coloris, eq(articleColoris.coloris_id, coloris.id));
      let resultat = lignes;
      if (entree.etage) resultat = resultat.filter((a) => a.gamme.toLowerCase() === String(entree.etage).toLowerCase());
      if (entree.statut) resultat = resultat.filter((a) => a.statut_cycle === entree.statut);
      return resultat.slice(0, 100);
    },
  },
  {
    type: "lecture",
    nom: "get_personnes",
    description: "Liste les personnes du réseau, filtrables par catégorie.",
    schema: { type: "object", properties: { categorie: { type: "string" } } },
    capacite: "entites.voir",
    executer: async () => (await db.select().from(personnes)).filter((p) => p.actif).slice(0, 100),
  },
  {
    type: "lecture",
    nom: "get_kpis",
    description: "KPI cibles et résultats des campagnes actives ou récentes.",
    schema: { type: "object", properties: { periode: { type: "string" } } },
    capacite: "entites.voir",
    executer: async () =>
      (await db.select().from(campagnes)).filter((c) => c.statut === "active" || c.statut === "livree").map((c) => ({ nom: c.nom, kpi_cibles: c.kpi_cibles, resultats: c.resultats })),
  },
  {
    type: "lecture",
    nom: "get_contenus",
    description: "Liste les contenus, filtrables par statut ou campagne.",
    schema: { type: "object", properties: { statut: { type: "string" }, campagne_id: { type: "string" } } },
    capacite: "entites.voir",
    executer: async (entree) => {
      let lignes = await db.select().from(contenus);
      if (entree.statut) lignes = lignes.filter((c) => c.statut === entree.statut);
      if (entree.campagne_id) lignes = lignes.filter((c) => c.campagne_id === entree.campagne_id);
      return lignes.slice(0, 50);
    },
  },
  {
    type: "lecture",
    nom: "get_budget",
    description: "Lignes budgétaires d'une campagne (montants — réservé admin/éditeur).",
    schema: { type: "object", properties: { campagne_id: { type: "string" } }, required: ["campagne_id"] },
    capacite: "montants.voir",
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "montants.voir");
      return db.select().from(budgetLignes).where(eq(budgetLignes.campagne_id, entree.campagne_id));
    },
  },
  {
    type: "lecture",
    nom: "get_ambassadeurs",
    description: "Liste les ambassadeurs, filtrables par statut de pipeline.",
    schema: { type: "object", properties: { statut: { type: "string" } } },
    capacite: "entites.voir",
    executer: async (entree) => {
      let lignes = await db.select().from(ambassadeurs);
      if (entree.statut) lignes = lignes.filter((a) => a.statut === entree.statut);
      return lignes;
    },
  },
  {
    type: "lecture",
    nom: "get_tendances",
    description: "Liste les tendances relevées, filtrables par statut.",
    schema: { type: "object", properties: { statut: { type: "string" } } },
    capacite: "entites.voir",
    executer: async (entree) => {
      let lignes = await db.select().from(tendances);
      if (entree.statut) lignes = lignes.filter((t) => t.statut === entree.statut);
      return lignes;
    },
  },
  {
    type: "lecture",
    nom: "get_lecons",
    description: "Liste les leçons actives (avec leur preuve).",
    schema: { type: "object", properties: {} },
    capacite: "entites.voir",
    executer: async () => db.select().from(lecons).where(eq(lecons.statut, "active")).orderBy(desc(lecons.created_at)).limit(20),
  },
];

// ───────────────────────── §6.4 — Outils d'écriture directe ─────────────────────────

export interface ResultatEcriture {
  entiteType: string;
  entiteId: string;
  resultat: unknown;
}

export interface DefinitionOutilDirect {
  type: "direct";
  nom: string;
  description: string;
  schema: Record<string, unknown>;
  capacite: Capacite;
  executer: (entree: any, ctx: ContexteOutil) => Promise<ResultatEcriture>;
}

export const OUTILS_DIRECTS: DefinitionOutilDirect[] = [
  {
    type: "direct",
    nom: "creer_tache",
    description: "Crée une tâche (jamais un shooting complet — pour un shooting, créer la tâche de type 'shooting' puis utiliser les outils looks/poses).",
    schema: {
      type: "object",
      properties: {
        campagne_id: { type: "string" },
        titre: { type: "string" },
        type: { type: "string", enum: ["shooting", "contenu", "livraison", "paiement", "autre"] },
        date_echeance: { type: "string", description: "AAAA-MM-JJ" },
        lieu: { type: "string" },
      },
      required: ["campagne_id", "titre", "type", "date_echeance"],
    },
    capacite: "entites.editer",
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const [cree] = (await db
        .insert(taches)
        .values({ campagne_id: entree.campagne_id, titre: entree.titre, type: entree.type, date_echeance: entree.date_echeance, lieu: entree.lieu ?? null, assigne_ids: [] })
        .returning()) as any[];
      return { entiteType: "tache", entiteId: cree.id, resultat: cree };
    },
  },
  {
    type: "direct",
    nom: "creer_idee",
    description: "Sauvegarde une idée de contenu (markdown léger).",
    schema: {
      type: "object",
      properties: { contenu: { type: "string" }, article_coloris_id: { type: "string" }, tache_id: { type: "string" } },
      required: ["contenu"],
    },
    capacite: "entites.editer",
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const [cree] = (await db
        .insert(idees)
        .values({ contenu: entree.contenu, source: "studio", article_coloris_id: entree.article_coloris_id ?? null, tache_id: entree.tache_id ?? null })
        .returning()) as any[];
      return { entiteType: "idee", entiteId: cree.id, resultat: cree };
    },
  },
  {
    type: "direct",
    nom: "creer_contenu_brouillon",
    description: "Crée un contenu en statut brouillon uniquement (RG-AGW7 — jamais un autre statut).",
    schema: {
      type: "object",
      properties: {
        campagne_id: { type: "string" },
        type: { type: "string", enum: ["post", "reel", "story", "tiktok", "carrousel", "email", "autre"] },
        titre: { type: "string" },
        caption: { type: "string" },
      },
      required: ["campagne_id", "type", "titre"],
    },
    capacite: "entites.editer",
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const [cree] = (await db
        .insert(contenus)
        .values({ campagne_id: entree.campagne_id, type: entree.type, titre: entree.titre, caption: entree.caption ?? "", auteur_id: ctx.utilisateurId, statut: "brouillon", cree_par_agent: true })
        .returning()) as any[];
      return { entiteType: "contenu", entiteId: cree.id, resultat: cree };
    },
  },
  {
    type: "direct",
    nom: "proposer_expression",
    description: "Propose une expression derja/arabizi hors lexique — jamais utilisée telle quelle avant validation (RG-CU2).",
    schema: {
      type: "object",
      properties: { texte: { type: "string" }, transliteration: { type: "string" }, registre_id: { type: "string" }, contexte_usage: { type: "string" } },
      required: ["texte", "registre_id"],
    },
    capacite: "entites.editer",
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const [cree] = (await db
        .insert(expressions)
        .values({ texte: entree.texte, transliteration: entree.transliteration ?? null, registre_id: entree.registre_id, contexte_usage: entree.contexte_usage ?? null, statut: "a_valider", ajoutee_par: ctx.utilisateurId })
        .returning()) as any[];
      return { entiteType: "expression", entiteId: cree.id, resultat: cree };
    },
  },
];

// ───────────────────────── §6.4 — Outils d'écriture par carte de confirmation ─────────────────────────

export interface DefinitionOutilConfirmation {
  type: "confirmation";
  nom: string;
  description: string;
  schema: Record<string, unknown>;
  capacite: Capacite;
  previsualiser: (entree: any, ctx: ContexteOutil) => Promise<{ avant: unknown; apres: unknown }>;
  executer: (entree: any, ctx: ContexteOutil) => Promise<ResultatEcriture>;
}

export const OUTILS_CONFIRMATION: DefinitionOutilConfirmation[] = [
  {
    type: "confirmation",
    nom: "modifier_tache",
    description: "Propose une modification de statut, date, assignés ou titre d'une tâche existante.",
    schema: {
      type: "object",
      properties: {
        tache_id: { type: "string" },
        statut: { type: "string", enum: ["todo", "en_cours", "fait"] },
        date_echeance: { type: "string" },
        assigne_ids: { type: "array", items: { type: "string" } },
        titre: { type: "string" },
      },
      required: ["tache_id"],
    },
    capacite: "entites.editer",
    previsualiser: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const [avant] = await db.select().from(taches).where(eq(taches.id, entree.tache_id)).limit(1);
      if (!avant) throw new ErreurOutil("introuvable", "Tâche introuvable");
      const { tache_id, ...patch } = entree;
      return { avant, apres: { ...avant, ...patch } };
    },
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const { tache_id, ...patch } = entree;
      const [modifie] = (await db.update(taches).set(patch).where(eq(taches.id, tache_id)).returning()) as any[];
      return { entiteType: "tache", entiteId: tache_id, resultat: modifie };
    },
  },
  {
    type: "confirmation",
    nom: "ajouter_poses",
    description: "Propose d'ajouter des poses au shot list d'un shooting.",
    schema: {
      type: "object",
      properties: {
        shooting_id: { type: "string", description: "tache_id du shooting" },
        poses: {
          type: "array",
          items: { type: "object", properties: { description: { type: "string" }, article_coloris_id: { type: "string" }, duree_min: { type: "number" } }, required: ["description"] },
        },
      },
      required: ["shooting_id", "poses"],
    },
    capacite: "entites.editer",
    previsualiser: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const existantes = await db.select().from(poses).where(eq(poses.shooting_id, entree.shooting_id));
      return { avant: existantes, apres: [...existantes, ...entree.poses.map((p: any, i: number) => ({ ...p, ordre: existantes.length + i }))] };
    },
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const existantes = await db.select().from(poses).where(eq(poses.shooting_id, entree.shooting_id));
      const creees = [];
      for (const [i, p] of entree.poses.entries()) {
        const [cree] = (await db
          .insert(poses)
          .values({ shooting_id: entree.shooting_id, description: p.description, article_coloris_id: p.article_coloris_id ?? null, duree_min: p.duree_min ?? null, ordre: existantes.length + i })
          .returning()) as any[];
        creees.push(cree);
      }
      return { entiteType: "shooting", entiteId: entree.shooting_id, resultat: creees };
    },
  },
  {
    type: "confirmation",
    nom: "ajouter_look",
    description: "Propose de créer un look (avec ses items) pour un shooting.",
    schema: {
      type: "object",
      properties: {
        shooting_id: { type: "string" },
        nom: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slot: { type: "string", enum: ["haut", "bas", "chaussures", "accessoire"] },
              article_coloris_id: { type: "string" },
              taille: { type: "string" },
              texte: { type: "string" },
            },
            required: ["slot"],
          },
        },
      },
      required: ["shooting_id", "items"],
    },
    capacite: "entites.editer",
    previsualiser: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const looksExistants = await db.select().from(looks).where(eq(looks.shooting_id, entree.shooting_id));
      return { avant: null, apres: { nom: entree.nom ?? `Look ${looksExistants.length + 1}`, items: entree.items } };
    },
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const looksExistants = await db.select().from(looks).where(eq(looks.shooting_id, entree.shooting_id));
      const [look] = (await db
        .insert(looks)
        .values({ shooting_id: entree.shooting_id, nom: entree.nom ?? `Look ${looksExistants.length + 1}`, ordre: looksExistants.length })
        .returning()) as any[];
      const items = [];
      for (const [i, it] of entree.items.entries()) {
        const [item] = (await db
          .insert(lookItems)
          .values({
            look_id: look.id,
            slot: it.slot,
            source: it.article_coloris_id ? "catalogue" : "texte",
            article_coloris_id: it.article_coloris_id ?? null,
            taille: it.taille ?? null,
            texte: it.texte ?? null,
            ordre: i,
          })
          .returning()) as any[];
        items.push(item);
      }
      return { entiteType: "look", entiteId: look.id, resultat: { look, items } };
    },
  },
  {
    type: "confirmation",
    nom: "creer_personne",
    description: "Propose de créer une nouvelle fiche personne dans le réseau.",
    schema: {
      type: "object",
      properties: {
        nom: { type: "string" },
        categorie_ids: { type: "array", items: { type: "string" } },
        type: { type: "string", enum: ["physique", "entreprise"] },
        telephone: { type: "string" },
        email: { type: "string" },
        instagram: { type: "string" },
        ville: { type: "string" },
      },
      required: ["nom", "categorie_ids", "type"],
    },
    capacite: "entites.editer",
    previsualiser: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      return { avant: null, apres: entree };
    },
    executer: async (entree, ctx) => {
      exigerCapaciteOutil(ctx, "entites.editer");
      const [cree] = (await db
        .insert(personnes)
        .values({ nom: entree.nom, categorie_ids: entree.categorie_ids, type: entree.type, telephone: entree.telephone ?? null, email: entree.email ?? null, instagram: entree.instagram ?? null, ville: entree.ville ?? null })
        .returning()) as any[];
      return { entiteType: "personne", entiteId: cree.id, resultat: cree };
    },
  },
];

export function trouverOutil(nom: string) {
  return OUTILS_LECTURE.find((o) => o.nom === nom) ?? OUTILS_DIRECTS.find((o) => o.nom === nom) ?? OUTILS_CONFIRMATION.find((o) => o.nom === nom) ?? null;
}

export function tousLesOutils(): { name: string; description: string; input_schema: Record<string, unknown> }[] {
  return [...OUTILS_LECTURE, ...OUTILS_DIRECTS, ...OUTILS_CONFIRMATION].map((o) => ({ name: o.nom, description: o.description, input_schema: o.schema }));
}
