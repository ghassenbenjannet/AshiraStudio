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

## Phase ③ — Campagnes, tâches/shootings, calendrier

- **`campagne.statut` : `preparation`/`livree`/`abandonnee` via `PATCH` générique**, `active` et
  `fermee` réservés à `POST .../activer` et `POST .../fermer` (422 explicite si on les vise par
  PATCH) — seuls ces deux derniers portent des effets de bord (verrouillage KPI RG-ECO1, gate
  rapport RG-ECO2) qui ne doivent jamais être contournables par une écriture directe.
- **RG-LK1 (pièces à apporter)** : `look_item` référence un **coloris**, pas une taille — la CDC
  mentionne « tailles demandées à l'ajout » sans étendre le schéma. La taille effective est lue dans
  le champ libre `note` du look_item (convention `Taille: XL`) ; à défaut, le premier SKU du coloris
  sert de valeur par défaut. La liste agrégée est **calculée à la lecture** (jamais stockée), fusionnée
  avec les ajouts manuels déjà présents dans `shooting.pieces` — une seule liste de vérité, jamais de
  désynchronisation possible.
- **`fermer-de-force`** (fermeture forcée, §2.1) : ajoutée en plus de `fermer`, réservée
  `parametres.gerer` (admin), sans exiger KPI complets ni les 3 champs — distincte de la fermeture
  normale qui, elle, applique RG-ECO2 strictement.
- **Call sheet PDF** : généré avec `pdfkit` (nouvelle dépendance serveur), 1 page, sections Équipe/
  Pièces/Looks/Shot list/Matériel — pas de mise en page graphique poussée (logos, couleurs de marque)
  dans cette passe ; à enrichir si besoin visuel plus tard.
- **Deux bugs trouvés et corrigés pendant la vérification manuelle** (avant tout usage front) :
  (1) `DESCRIPTION` ICS doublait l'échappement des retours à la ligne (`\\n` au lieu de `\n`) —
  chaque partie est maintenant échappée individuellement puis jointe avec le séparateur RFC 5545 brut ;
  (2) `activerCampagne` ne verrouillait jamais les KPI d'une campagne **déjà** `active` (cas du seed,
  Chapitre I créé directement `active` par fidélité à l'Annexe A) — la garde d'idempotence teste
  désormais `statut === "active" ET kpi_cibles_verrouillees`, pas `statut === "active"` seul.
- **Vue « Calendrier » du board de tâches (E04) = le calendrier éditorial (E18)** : le §4.6 décrit un
  simple commutateur de vue Liste/Kanban/Calendrier sur le même board, pas un écran séparé — confirmé
  par relecture du texte. Le calendrier ne source aujourd'hui que les `taches` ; les contenus/posts
  y seront ajoutés en Phase ④/⑥ une fois ces entités construites.
- **Front vérifié de bout en bout (10 captures Playwright, scénario complet init→campagne→rituel→
  budget→board 3 vues→call sheet→cockpit)** : tout fonctionne correctement, y compris le calcul J±n
  du cockpit, l'indicateur « prêt à tourner » (liste précise des champs manquants), et le rituel
  générant bien 7 tâches. Deux échecs console observés pendant les tests (fetch Google Fonts bloqué,
  401 sur `/auth/me` avant connexion) sont environnementaux/attendus, pas des bugs applicatifs.

## Phase ④ — Contenus, assets, boards, idées, calendrier éditorial

- **Ambiguïté MIME résolue en faveur de la sécurité verrouillée (§8.3)** : §4.5 décrit un asset
  `type video` avec « vignettes serveur (vidéo = 1re frame) », mais §8.3 fige explicitement la
  whitelist d'upload à **jpeg/png/webp/csv/pdf ≤8 Mo** — une décision de sécurité, pas un oubli.
  Plutôt que d'élargir cette whitelist (ce que Partie X interdit de rouvrir implicitement), les
  assets vidéo passent par une **référence externe** (`POST /assets`, `fichier_url` = lien direct,
  pas de fichier local) au lieu d'un upload binaire (`POST /assets/upload`, réservé aux 5 MIME
  autorisés). Cohérent avec le champ intelligent déjà utilisé ailleurs (référence lien vs upload).
- **Vignettes vidéo** : honnêtement non générées (pas de `ffmpeg` dans l'environnement de build) —
  `vignette_url` reste `null`, le front affiche une icône générique. Un vrai pipeline de miniature
  serveur reste un TODO d'infrastructure, pas une simplification silencieuse.
- **RG-AS1 appliqué à deux moments** : (1) préventif, à l'upload d'un asset `source=ugc` sans
  `droits` (bloqué immédiatement, 422) ; (2) le gate décrit par le CDC, à l'approbation d'un contenu
  qui référence un asset UGC sans `droits` (un asset peut être créé avec `droits`, puis vidé par une
  édition ultérieure — le gate re-vérifie donc à chaque `POST /contenus/:id/approuver`, jamais mis
  en cache sur l'asset).
- **Workflow contenu en endpoints dédiés** (`soumettre/approuver/planifier/publier/archiver`), pas un
  `POST .../transition` générique du §8.2 — chaque étape porte une garde différente (caption/asset
  requis, RG-AS1, capacité `approbation.gerer` pour l'approbation seule) ; suit le même principe que
  `campagnes` en Phase ③ (transitions à effets de bord = endpoint dédié, PATCH générique bloqué sur
  `statut`).
- **`contenu_version`** : snapshot de la légende **avant** modification, créé uniquement si le
  contenu a déjà quitté `brouillon` (le brouillon s'édite librement, sans historique — bruit inutile
  avant la première revue). Restaurer une version snapshotte d'abord l'état courant (réversible dans
  les deux sens).
- **« Transformer en campagne » (board→campagne)** : les champs obligatoires de `campagne`
  (type, dates, objectif) ne sont pas déductibles d'un board — l'utilisateur les saisit au moment de
  la transformation (comme la création manuelle de campagne), seuls `nom` et `description` (notes
  concaténées) sont réellement pré-remplis, conformément à la lettre du §4.5.
- **Idées** : `statut` (nouvelle/utilisee/ecartee) manquait du schéma de mise à jour partagé (même
  angle mort que `campagne.statut` en Phase ③) — corrigé en l'ajoutant explicitement à
  `ideeUpdateSchema`. Le générateur scoré (§4.5, formulaire→IA) est explicitement Phase ⑤ ; cette
  phase ne construit que la création manuelle (`source: manuel`).
- **Quotas assets** : mesure réelle de la taille des fichiers stockés localement (`fs.stat` sur
  chaque asset), pas un chiffre fabriqué — aucune limite n'est imposée (stockage local, migration
  S3/R2 possible sans changement d'API).
