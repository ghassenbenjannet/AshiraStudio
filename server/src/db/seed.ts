import { randomUUID } from "node:crypto";
import { db, sqlite } from "./client.js";
import {
  gammes,
  grillesTaille,
  categoriesProduit,
  coloris as colorisTable,
  matieres,
  codesEntretien,
  listesParametrables,
  modelesChecklist,
  registres,
  typesCampagne,
  modelesRituel,
  categoriesContact,
  campagnes,
  articles,
  articleColoris,
  articleSkus,
  taches,
  shootings,
  expressions,
} from "./schema.js";

const id = () => randomUUID();

/**
 * Seed complet à l'initialisation (§1er lancement, Annexes A-F).
 * Idempotent : si des gammes existent déjà, le seed est considéré comme déjà appliqué.
 *
 * Décisions prises pour des points non spécifiés par le CDC (consignées aussi dans DECISIONS.md) :
 * - "Checklist drop" (§5.6) : contenu non détaillé dans le CDC → liste minimale raisonnable proposée.
 * - Catégorie "Set" : grille secondaire (Bas) informative, génération de SKU sur la grille primaire (Hauts)
 *   uniquement, pour rester simple (RG "en cas d'ambiguïté, option la plus simple").
 * - `article_cout` non seedé pour les 14 articles (statut prototype) : aucune valeur COGS n'est donnée par le
 *   CDC et RG-PROV interdit d'inventer un chiffre — l'admin les saisit à la transition vers `production`.
 * - `kpi_cibles` du Chapitre I laissées vides malgré le statut `active` : le CDC ne fournit aucune cible
 *   chiffrée réelle pour AL AWWAL — inventer des chiffres violerait RG-PROV.
 */
export async function seed(): Promise<void> {
  const dejaSeed = await db.select().from(gammes).limit(1);
  if (dejaSeed.length > 0) {
    console.log("Seed déjà appliqué, rien à faire.");
    return;
  }

  // ── §5.5 Grilles de tailles ──
  const grilleHauts = { id: id(), nom: "Hauts", valeurs: ["XS", "S", "M", "L", "XL", "XXL"] };
  const grilleBas = { id: id(), nom: "Bas", valeurs: ["36", "38", "40", "42", "44", "46"] };
  const grillePointures = { id: id(), nom: "Pointures", valeurs: ["39", "40", "41", "42", "43", "44", "45", "46"] };
  const grilleTU = { id: id(), nom: "TU", valeurs: ["TU"] };
  await db.insert(grillesTaille).values([grilleHauts, grilleBas, grillePointures, grilleTU]);

  // ── §5.0 Gammes ──
  const gammeStreet = {
    id: id(),
    nom: "STREET",
    code_prefixe: "ST",
    couleur: "#8f8776",
    alerte_baisse_prix: false,
    message_alerte: null as string | null,
    marge_cible_pct: 60,
    ordre: 0,
  };
  const gammeSignature = {
    id: id(),
    nom: "SIGNATURE",
    code_prefixe: "SG",
    couleur: "#c9a876",
    alerte_baisse_prix: true,
    message_alerte: "SIGNATURE ne se solde jamais" as string | null,
    marge_cible_pct: 65,
    ordre: 1,
  };
  await db.insert(gammes).values([gammeStreet, gammeSignature]);

  // ── §5.4 Codes d'entretien ──
  const codesEntretienSeed = [
    "Lavage 30°",
    "Lavage 40°",
    "Pas de sèche-linge",
    "Repassage doux",
    "Lavage main",
    "Nettoyage à sec",
  ].map((nom, ordre) => ({ id: id(), nom, icone: null, ordre }));
  await db.insert(codesEntretien).values(codesEntretienSeed);

  // ── §5.3 Matières ──
  const matieresSeed = ["Coton", "Coton peigné", "Viscose", "Laine froide", "Lin", "Polyester", "Élasthanne", "Acrylique"].map(
    (nom) => ({ id: id(), nom, nom_ar: null, note: null }),
  );
  await db.insert(matieres).values(matieresSeed);

  // ── §5.2 Coloris ──
  const colorisNoir = { id: id(), nom_commercial: "Noir profond", code_3l: "NOI", hex: "#15140f" };
  const colorisSable = { id: id(), nom_commercial: "Sable", code_3l: "SAB", hex: "#c9a876" };
  const colorisOlive = { id: id(), nom_commercial: "Olive méditerranée", code_3l: "OLI", hex: "#5c6146" };
  const colorisBlanc = { id: id(), nom_commercial: "Blanc cassé", code_3l: "BLC", hex: "#f2ede1" };
  await db.insert(colorisTable).values([colorisNoir, colorisSable, colorisOlive, colorisBlanc]);

  // ── §5.1 Catégories produit ──
  const cat = (nom: string, slot_look: string, grille: { id: string }, gabarit_mesures: string, ordre: number, grilleSecondaire?: { id: string }) => ({
    id: id(),
    nom,
    slot_look,
    grille_tailles_id: grille.id,
    grille_tailles_id_secondaire: grilleSecondaire?.id ?? null,
    gabarit_mesures,
    ordre,
  });
  const catTee = cat("Tee", "haut", grilleHauts, "haut", 0);
  const catChemise = cat("Chemise", "haut", grilleHauts, "haut", 1);
  const catPolo = cat("Polo", "haut", grilleHauts, "haut", 2);
  const catSweat = cat("Sweat", "haut", grilleHauts, "haut", 3);
  const catHoodie = cat("Hoodie", "haut", grilleHauts, "haut", 4);
  const catZipUp = cat("Zip-up", "haut", grilleHauts, "haut", 5);
  const catVeste = cat("Veste", "haut", grilleHauts, "haut", 6);
  const catPantalon = cat("Pantalon", "bas", grilleBas, "bas", 7);
  const catCargo = cat("Cargo", "bas", grilleBas, "bas", 8);
  const catShort = cat("Short", "bas", grilleBas, "bas", 9);
  const catCasquette = cat("Casquette", "accessoire", grilleTU, "tete", 10);
  const catBonnet = cat("Bonnet", "accessoire", grilleTU, "tete", 11);
  const catCeinture = cat("Ceinture", "accessoire", grilleTU, "aucun", 12);
  const catChaussure = cat("Chaussure", "chaussures", grillePointures, "aucun", 13);
  const catSet = cat("Set", "haut", grilleHauts, "haut", 14, grilleBas);
  await db
    .insert(categoriesProduit)
    .values([
      catTee,
      catChemise,
      catPolo,
      catSweat,
      catHoodie,
      catZipUp,
      catVeste,
      catPantalon,
      catCargo,
      catShort,
      catCasquette,
      catBonnet,
      catCeinture,
      catChaussure,
      catSet,
    ]);

  // ── §5.6 Listes paramétrables (postes budgétaires, canaux, plateformes de contenu, occasions) ──
  const listeItems: { id: string; categorie: string; nom: string; ordre: number }[] = [];
  const pushListe = (categorie: string, noms: string[]) =>
    noms.forEach((nom, ordre) => listeItems.push({ id: id(), categorie, nom, ordre }));
  pushListe("poste_budgetaire", ["Production", "Shooting", "Influence", "Ads", "Packaging", "Logistique", "Autre"]);
  pushListe("canal", [
    "Instagram",
    "TikTok",
    "Facebook",
    "Meta Ads",
    "TikTok Ads",
    "Influence",
    "Email",
    "Site",
    "Événement",
  ]);
  pushListe("plateforme_contenu", ["Instagram", "TikTok", "Facebook", "Email", "Site"]);
  pushListe("occasion", ["Aïd", "Ramadan", "Rentrée", "Été / mariages", "Black Friday", "Nouvel an"]);
  await db.insert(listesParametrables).values(listeItems);

  // ── §5.6 Modèles de checklists ──
  const checklistMateriel = {
    id: id(),
    nom: "Matériel shooting",
    items: ["iPhone chargé", "Stabilisateur", "Batterie externe", "Pinces", "Défroisseur", "Liste des pièces imprimée"],
    ordre: 0,
  };
  const checklistPreparation = { id: id(), nom: "Préparation pièces", items: ["Défroisser", "Retirer étiquettes"], ordre: 1 };
  const checklistDrop = {
    id: id(),
    nom: "Checklist drop",
    items: [
      "Teasing publié",
      "Page produit en ligne",
      "Stock compté",
      "Kits ambassadeurs expédiés",
      "Waitlist ouverte",
      "Service client briefé",
    ],
    ordre: 2,
  };
  await db.insert(modelesChecklist).values([checklistMateriel, checklistPreparation, checklistDrop]);

  // ── §5.7 Registres de langue ──
  const registreR1 = { id: id(), code: "R1", nom: "Français premium", description: "Registre principal, clair et confiant.", ordre: 0 };
  const registreR2 = { id: id(), code: "R2", nom: "Derja premium", description: "Derja digne, jamais caricaturale.", ordre: 1 };
  const registreR3 = { id: id(), code: "R3", nom: "Arabizi street", description: "Registre street, jamais sur SIGNATURE.", ordre: 2 };
  const registreR4 = { id: id(), code: "R4", nom: "Anglais international", description: "3-6 mots, ponctuel.", ordre: 3 };
  await db.insert(registres).values([registreR1, registreR2, registreR3, registreR4]);

  // ── §5.7 Modèles de rituel ──
  const jalon = (libelle: string, offset_jours: number, type_tache: string) => ({ id: id(), libelle, offset_jours, type_tache });
  const rituelDrop = {
    id: id(),
    nom: "Rituel de drop",
    jalons: [
      jalon("Teasing", -14, "contenu"),
      jalon("Reveal", -7, "contenu"),
      jalon("Ouverture waitlist", -7, "autre"),
      jalon("Early access", -1, "autre"),
      jalon("Drop", 0, "livraison"),
      jalon("Bilan UGC", 7, "contenu"),
      jalon("Rapport", 14, "autre"),
    ],
  };
  await db.insert(modelesRituel).values([rituelDrop]);

  // ── §5.7 Types de campagne ──
  const typeChapitre = { id: id(), nom: "Chapitre", modele_rituel_id: rituelDrop.id, ordre: 0 };
  const typeRestock = { id: id(), nom: "Restock", modele_rituel_id: null, ordre: 1 };
  const typeCapsule = { id: id(), nom: "Capsule", modele_rituel_id: null, ordre: 2 };
  const typeOccasion = { id: id(), nom: "Occasion", modele_rituel_id: null, ordre: 3 };
  const typeCommunaute = { id: id(), nom: "Communauté", modele_rituel_id: null, ordre: 4 };
  const typePermanent = { id: id(), nom: "Permanent", modele_rituel_id: null, ordre: 5 };
  await db.insert(typesCampagne).values([typeChapitre, typeRestock, typeCapsule, typeOccasion, typeCommunaute, typePermanent]);

  // ── §2.1 Catégories de contact (seed système, renommables, non supprimables) ──
  const categoriesContactSeed = [
    "Fondateur",
    "Marketing",
    "Community",
    "Photographe",
    "Vidéaste",
    "Styliste",
    "Modèle",
    "Ambassadeur",
    "Fournisseur",
    "Influenceur",
    "Lieu",
    "Agence",
  ].map((nom, ordre) => ({ id: id(), nom, icone: null, systeme: true, ordre }));
  await db.insert(categoriesContact).values(categoriesContactSeed);

  // ── Annexe A — Campagnes ──
  const campagneAlAwwal = {
    id: id(),
    nom: "Chapitre I — AL AWWAL",
    type_campagne_id: typeChapitre.id,
    occasion_id: null,
    date_debut: "2026-08-17",
    date_fin: "2026-10-15",
    statut: "active",
    objectif: "lancement",
    objectif_texte: null,
    description:
      "Première collection de la nouvelle ère. Nuit méditerranéenne, le clan, la sobriété. La rue le jour, la tenue le soir.",
    budget_total_dt: 0,
    canaux: [],
    kpi_cibles: {},
    kpi_cibles_verrouillees: false,
    resultats: {},
    rapport: null,
  };
  const campagneGeneral = {
    id: id(),
    nom: "Général",
    type_campagne_id: typePermanent.id,
    occasion_id: null,
    date_debut: "2026-08-17",
    date_fin: "2099-12-31",
    statut: "active",
    objectif: "communaute",
    objectif_texte: "Réceptacle par défaut pour les tâches sans campagne dédiée.",
    description: null,
    budget_total_dt: 0,
    canaux: [],
    kpi_cibles: {},
    kpi_cibles_verrouillees: false,
    resultats: {},
    rapport: null,
  };
  await db.insert(campagnes).values([campagneAlAwwal, campagneGeneral]);

  // ── Annexe B — Articles (1 coloris + SKU générés, statut prototype, mesures à saisir) ──
  interface ArticleSeed {
    reference: string;
    nom: string;
    gamme: typeof gammeStreet;
    categorie: ReturnType<typeof cat>;
    coloris: typeof colorisNoir;
    prix: number;
    numerote: boolean;
    numerotationTotal: number | null;
    grammage: number | null;
  }
  const articlesSeed: ArticleSeed[] = [
    { reference: "ST-01", nom: "Tee oversized brodé عشيرة", gamme: gammeStreet, categorie: catTee, coloris: colorisNoir, prix: 89, numerote: false, numerotationTotal: null, grammage: 240 },
    { reference: "ST-02", nom: "Tee Born to Lead", gamme: gammeStreet, categorie: catTee, coloris: colorisNoir, prix: 89, numerote: false, numerotationTotal: null, grammage: 240 },
    { reference: "ST-03", nom: "Hoodie lourd", gamme: gammeStreet, categorie: catHoodie, coloris: colorisNoir, prix: 159, numerote: false, numerotationTotal: null, grammage: 400 },
    { reference: "ST-04", nom: "Sweat col rond boxy", gamme: gammeStreet, categorie: catSweat, coloris: colorisSable, prix: 139, numerote: false, numerotationTotal: null, grammage: 350 },
    { reference: "ST-05", nom: "Cargo ample", gamme: gammeStreet, categorie: catCargo, coloris: colorisNoir, prix: 149, numerote: false, numerotationTotal: null, grammage: null },
    { reference: "ST-06", nom: "Zip-up technique", gamme: gammeStreet, categorie: catZipUp, coloris: colorisNoir, prix: 169, numerote: false, numerotationTotal: null, grammage: null },
    { reference: "ST-07", nom: "Casquette brodée", gamme: gammeStreet, categorie: catCasquette, coloris: colorisNoir, prix: 59, numerote: false, numerotationTotal: null, grammage: null },
    { reference: "ST-08", nom: "Bonnet côtelé", gamme: gammeStreet, categorie: catBonnet, coloris: colorisOlive, prix: 45, numerote: false, numerotationTotal: null, grammage: null },
    { reference: "SG-01", nom: "Pantalon ACHIRAH CUT n°1", gamme: gammeSignature, categorie: catPantalon, coloris: colorisNoir, prix: 189, numerote: true, numerotationTotal: 70, grammage: null },
    { reference: "SG-02", nom: "Pantalon ACHIRAH CUT", gamme: gammeSignature, categorie: catPantalon, coloris: colorisSable, prix: 189, numerote: true, numerotationTotal: 50, grammage: null },
    { reference: "SG-03", nom: "Chemise col cubain", gamme: gammeSignature, categorie: catChemise, coloris: colorisNoir, prix: 169, numerote: true, numerotationTotal: 50, grammage: null },
    { reference: "SG-04", nom: "Polo maille tricot", gamme: gammeSignature, categorie: catPolo, coloris: colorisOlive, prix: 189, numerote: true, numerotationTotal: 40, grammage: null },
    { reference: "SG-05", nom: "Veste déstructurée", gamme: gammeSignature, categorie: catVeste, coloris: colorisNoir, prix: 329, numerote: true, numerotationTotal: 30, grammage: null },
    { reference: "SG-06", nom: "Set chemise + pantalon", gamme: gammeSignature, categorie: catSet, coloris: colorisSable, prix: 319, numerote: true, numerotationTotal: 30, grammage: null },
  ];

  for (const a of articlesSeed) {
    const articleId = id();
    await db.insert(articles).values({
      id: articleId,
      reference: a.reference,
      nom: a.nom,
      gamme_id: a.gamme.id,
      categorie_id: a.categorie.id,
      chapitre_id: campagneAlAwwal.id,
      fit: null,
      description_commerciale: null,
      composition: [],
      grammage_gsm: a.grammage,
      entretien_codes: [],
      numerote: a.numerote,
      numerotation_total: a.numerotationTotal,
      fournisseur_id: null,
      delai_production_jours: null,
      moq: null,
      statut_cycle: "prototype",
      notes_interne: null,
    });
    const articleColorisId = id();
    await db.insert(articleColoris).values({
      id: articleColorisId,
      article_id: articleId,
      coloris_id: a.coloris.id,
      photos: [],
      prix_dt: a.prix,
      statut: "actif",
      ordre: 0,
    });
    const grille = a.categorie.grille_tailles_id === grilleHauts.id
      ? grilleHauts
      : a.categorie.grille_tailles_id === grilleBas.id
        ? grilleBas
        : a.categorie.grille_tailles_id === grillePointures.id
          ? grillePointures
          : grilleTU;
    await db.insert(articleSkus).values(
      grille.valeurs.map((taille) => ({
        id: id(),
        article_coloris_id: articleColorisId,
        taille,
        qte_produite: 0,
        qte_stock: 0,
        mesures: {},
      })),
    );
  }

  // ── Annexe C — Tâches (campagne AL AWWAL) ──
  const tache = (titre: string, type: string, date_echeance: string, lieu: string | null = null, description: string | null = null) => ({
    id: id(),
    campagne_id: campagneAlAwwal.id,
    titre,
    type,
    date_echeance,
    assigne_ids: [],
    lieu,
    statut: "todo",
    done_at: null,
    description,
  });
  const tachesSeed = [
    tache("Brief atelier", "livraison", "2026-08-19"),
    tache("Réception prototypes", "livraison", "2026-09-11"),
    tache("30 ambassadeurs confirmés", "autre", "2026-09-20"),
    tache("Shooting studio produit", "shooting", "2026-09-20"),
    tache("Shooting campagne jour", "shooting", "2026-09-21", "Médina"),
    tache("Shooting campagne soir", "shooting", "2026-09-22", "Toit / front de mer"),
    tache("Réception stock 680 pièces", "livraison", "2026-10-08"),
    tache("Kits ambassadeurs expédiés", "livraison", "2026-10-09"),
    tache("DROP AL AWWAL", "autre", "2026-10-15", "En ligne", "20h00"),
    tache("Rapport de drop", "autre", "2026-10-29"),
  ];
  await db.insert(taches).values(tachesSeed);

  const shootingHeureLumiere: Record<string, string> = {
    "Shooting studio produit": "studio",
    "Shooting campagne jour": "midi_dur",
    "Shooting campagne soir": "golden_hour",
  };
  const tachesShooting = tachesSeed.filter((t) => t.type === "shooting");
  await db.insert(shootings).values(
    tachesShooting.map((t) => ({
      tache_id: t.id,
      photographe_id: null,
      modele_ids: [],
      decor: null,
      heure_lumiere: shootingHeureLumiere[t.titre] ?? null,
      duree_min: 180,
      moodboard_board_id: null,
      refs_visuelles: [],
      autorisation_lieu: "non_requise",
      autorisation_lieu_note: null,
      plan_b_lieu: null,
      grooming: null,
      pieces: [],
      materiel: checklistMateriel.items.map((libelle, i) => ({ id: `${i}`, libelle, coche: false })),
      preparation_pieces: [],
      retour_pieces: [],
      livrable_photos: null,
      livrable_videos: null,
      statut_post_prod: "a_trier",
      nb_photos_recues: null,
      notes: null,
    })),
  );

  // ── Annexe F — Lexique initial ──
  await db.insert(expressions).values([
    {
      id: id(),
      texte: "El haja elli tetlebs, matetnessech.",
      transliteration: null,
      registre_id: registreR2.id,
      statut: "validee",
      contexte_usage: null,
      exemple: null,
      ajoutee_par: null,
      validee_par: null,
    },
    {
      id: id(),
      texte: "3achira. W khalas.",
      transliteration: null,
      registre_id: registreR3.id,
      statut: "validee",
      contexte_usage: null,
      exemple: null,
      ajoutee_par: null,
      validee_par: null,
    },
    {
      id: id(),
      texte: "malla look",
      transliteration: null,
      registre_id: registreR3.id,
      statut: "interdite",
      contexte_usage: null,
      exemple: null,
      ajoutee_par: null,
      validee_par: null,
    },
    {
      id: id(),
      texte: "nayweni",
      transliteration: null,
      registre_id: registreR3.id,
      statut: "interdite",
      contexte_usage: null,
      exemple: null,
      ajoutee_par: null,
      validee_par: null,
    },
  ]);

  console.log("Seed complet appliqué : référentiels, campagnes, articles, tâches, lexique.");
}

const estAppelDirect = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (estAppelDirect) {
  seed()
    .then(() => sqlite.close())
    .catch((err) => {
      console.error(err);
      sqlite.close();
      process.exit(1);
    });
}
