# Décisions — Achirah HQ

Journal des choix pris pour lever les ambiguïtés résiduelles du CDC Master v3.1, conformément à Partie X :
« appliquer les principes de la Partie I, choisir l'option la plus simple ».

## Phase ① — Socle

- **Monorepo** : npm workspaces (`/shared /server /front`), pas de pnpm/turbo — un seul outil, zéro
  configuration supplémentaire.
- **Auth** : sessions par token opaque en base (table `sessions`) + cookie httpOnly, plutôt que JWT —
  permet une révocation immédiate (logout, changement de rôle) sans liste de révocation séparée.
- **Endpoints d'initialisation** : `GET /api/init/statut` et `POST /api/init` ajoutés (non listés
  explicitement en §8.2, qui ne prétend pas être exhaustif) pour porter l'écran E02 : le premier
  admin déclenche le seed complet puis se connecte.
- **`article_cout`** : non seedé pour les 14 articles de l'Annexe B (tous en statut `prototype`).
  Le CDC ne fournit aucun chiffre de COGS et RG-PROV interdit d'inventer une donnée financière ;
  l'admin les saisit à la transition vers `production`.
- **`kpi_cibles` du Chapitre I (AL AWWAL)** : laissées vides malgré le statut `active` du seed —
  aucune cible chiffrée réelle n'est donnée par le CDC pour ce chapitre.
- **Catégorie « Set »** (§5.1) : grille de tailles secondaire (Bas) stockée comme information,
  génération des SKU sur la seule grille primaire (Hauts) pour rester simple. À revisiter si le
  métier veut des SKU combinatoires réels (ex. haut M + bas 40).
- **« Checklist drop »** (§5.6) : contenu non détaillé par le CDC → liste minimale raisonnable
  proposée (teasing publié, page produit en ligne, stock compté, kits ambassadeurs expédiés,
  waitlist ouverte, service client briefé), éditable ensuite en Référentiels comme toute liste
  paramétrable.
- **Lexique initial (Annexe F)** : les deux expressions interdites (« malla look », « nayweni »)
  rattachées au registre R3 (Arabizi street) — le CDC ne précise pas de registre pour les
  interdictions ; R3 est le registre street où ce type d'expression apparaît le plus probablement
  (cf. scénario de recette 14).
- **Campagne « Général »** : type `permanent`, `date_fin` fixée loin dans le futur (2099-12-31) —
  un réceptacle par défaut n'a pas de fin métier réelle, mais le schéma exige `date_fin ≥ date_debut`.
- **`brand-brain.md`** : le fichier « ACHIRAH BRAND BRAIN (SKILL.md v3) » mentionné en Annexe D
  comme livré séparément n'a pas été fourni dans cette session. Le contenu a été rédigé à partir du
  plan détaillé de l'Annexe D (noyau de marque, gammes, registres, interdits/voulus, règles
  visuelles et d'écriture, structure Reel, modes de sortie, contrôle final). À remplacer par le
  fichier source si/quand il est fourni.
- **Schémas Zod nullable vs optionnel** : tous les champs `.nullable()` des schémas partagés portent
  aussi `.optional()`, pour que les schémas d'insertion (dérivés par `.omit()`) acceptent qu'un champ
  facultatif soit simplement absent du JSON envoyé, pas seulement `null` explicite.

## Phase ② — Référentiels, contacts, catalogue

- **`/api/referentiels/*`** : préfixe ajouté (non listé en §8.2) pour le CRUD des 11 listes de la
  Partie V — RG-PARAM1 exige que ces listes soient administrables, le CDC ne détaille juste pas leurs
  routes. `DELETE` archive (jamais de suppression physique, RG-G1 §5) ; `PATCH { archived_at: null }`
  réactive.
- **`/api/personnes/:id/partage`** et **`GET /api/partage/personne/:token`** : ajoutés pour porter
  E32 (fiche contact partagée). Lien 30 jours, champs monétaires et notes toujours exclus de la
  réponse publique.
- **Import CSV — colonnes `prix` et `tailles`** : le modèle de données n'a pas de champ prix au
  niveau `article` (seul `article_coloris` en porte un). Sur une ligne `nouveau`, l'import crée donc
  l'article puis un unique coloris par défaut (premier coloris du référentiel) avec ce prix, et génère
  les SKU pour les tailles listées (restreintes à la grille de la catégorie si résolvable). Une ligne
  `mise_a_jour` ne touche que les champs réellement portés par `article` (nom, gamme, catégorie,
  numérotation, notes) — jamais le prix d'un coloris existant, pour ne jamais écraser silencieusement
  un prix en vigueur.
- **Gates du cycle de vie** : le contrôle « pas de saut d'étape sauf admin » et les gates métier
  (fournisseur, mesures, COGS/prix, quantités) sont deux vérifications indépendantes — un admin qui
  saute une étape reste soumis aux gates de l'étape cible (vérifié en recette manuelle).
- **Coûts (COGS)** : lecture et écriture réservées à la capacité `parametres.gerer` (admin), cohérent
  avec la ligne « coûts articles » de la matrice RBAC §2.1, même si §8.2 ne précise pas explicitement
  le niveau de lecture.
- **`/api/utilisateurs`** et **`PATCH /api/utilisateurs/me`** : ajoutés (le second est bien dans §8.2,
  le premier non) — nécessaires pour que l'écran Paramètres → Utilisateurs fonctionne (création,
  changement de rôle avec RG-R1 : toujours ≥ 1 admin).
- **`/api/assets` (lecture minimale)** : la galerie complète (upload, tags, liens croisés) est prévue
  en Phase ④. Un point de lecture minimal (`GET /assets?ids=...`, `GET /assets/:id`) a été ajouté dès
  maintenant car `article_coloris.photos` référence de vrais `asset_ids` (§4.2) et le front doit
  résoudre ces ids en URLs pour afficher les photos de coloris.
- **Photos de coloris = de vrais assets** : chaque fichier envoyé via `POST /coloris/:id/photos` crée
  une ligne `asset` (type `photo`, source `studio`) plutôt qu'un id de stockage brut, pour rester
  fidèle au modèle de données (`photos: asset_ids[]`) et pour que l'extension réelle du fichier soit
  toujours résolue correctement côté client.
- **Champs conditionnels de la fiche contact (E11, §4.1)** : la détection (Modèle / Photographe·
  Vidéaste / Fournisseur / Lieu / Ambassadeur) se fait par **nom** de catégorie système, pas par un
  champ de configuration dédié — ces catégories sont *renommables* (§2.1), donc les renommer changerait
  ce comportement. Accepté comme limitation simple ; une vraie solution demanderait un champ de type
  sur `categorie_contact`, absent du CDC.
