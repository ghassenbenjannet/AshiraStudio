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
- **Board canvas (E17) simplifié** : positionnement libre au pointeur (drag simple, coordonnées
  x/y persistées par item) sans pan/zoom ni multi-sélection au lasso — le §4.6 décrit un « canvas
  libre pan/zoom desktop », ici livré comme positionnement libre sans zoom. La parité de contenu
  (liste = mêmes items que le canvas) est respectée : aucune fonctionnalité n'existe uniquement en
  vue canvas.
- **Front vérifié de bout en bout (12 captures Playwright + vérification calendrier)** : workflow
  contenu complet (brouillon→en_revue→approuve, snapshot de version confirmé visuellement, contenu
  planifié apparaissant sur le calendrier éditorial le jour exact avec la bonne couleur neutre),
  idées (création, marquage utilisée/écartée), assets (upload réel, quotas exacts en octets,
  indicateur ⚠ droits manquants), board (note ajoutée, canvas rendu). Aucun bug trouvé.

## Phase ⑤ — IA (Studio, agents, gate, brief, générateur d'idées, brain)

- **Pas de clé `ANTHROPIC_API_KEY` réelle disponible dans cet environnement de build.** Vérifié :
  `api.anthropic.com` est bien joignable (hors proxy agent, whitelisté), donc l'absence de réponse
  n'est pas un problème réseau — juste l'absence de secret. Décision : construire la couche IA
  complète et correcte, avec une garde honnête (`ErreurIaIndisponible`, 503 `ia_indisponible`)
  partout où un appel LLM est nécessaire, plutôt que de fabriquer une réponse ou bloquer le reste de
  l'app. C'est très exactement le **scénario de recette 6 « Panne IA »** du CDC — cette limitation
  d'environnement sert de test réel de ce scénario, pas d'un cas hypothétique : `POST
  /conversations/:id/messages`, `POST /agents/:id/tester`, `POST /contenus/:id/gate`, `POST
  /taches/:id/brief`, `POST /idees/generer`, `POST /brain/brief`, `POST /brain/question` renvoient
  tous 503 proprement, et tout le reste (CRUD conversations/agents, workflow contenu manuel,
  RBAC des outils) continue à fonctionner à 100 % — vérifié par des tests curl sur DB fraîche.
- **Gate auto au passage `en_revue`** (scénario 8) : `soumettreContenu` (Phase ④) appelle
  `noterContenu` et avale silencieusement `ErreurIaIndisponible` — la soumission manuelle réussit
  toujours même IA coupée (RG-PAR1d), seul le score reste absent. Un bouton « Renoter » manuel
  (`POST /contenus/:id/gate`) permet de re-tenter après édition ou une fois l'IA revenue.
  Vérifié : contenu soumis avec IA coupée → `statut: en_revue`, `score_marque: null`, 200 (pas 503).
- **Sortie structurée forcée** (gate, brief shooting, générateur d'idées, brief quotidien) : chaque
  appel utilise `tool_choice: {type: "tool", name: ...}` avec un unique outil dont l'`input_schema`
  reproduit exactement le schéma Zod partagé — jamais de parsing de texte libre côté serveur.
- **RG-AGW4 (≤10 écritures/tour, ≤100/jour/utilisateur)** : le compteur/tour est en mémoire pour la
  durée de la boucle ; le compteur/jour interroge `audits` (`via_agent=true`, `at` ≥ aujourd'hui) —
  aucun état dupliqué, la table d'audit existante est la source unique de vérité.
- **Cartes de confirmation persistées** (`actions_agent`, nouvelle table) : une proposition d'outil
  « carte de confirmation » (modifier_tache, ajouter_poses, ajouter_look, creer_personne) est
  enregistrée (avant/après prévisualisés) avant toute écriture réelle — `POST
  .../actions/:id/confirmer` exécute, `.../annuler` classe sans écrire. Choisi plutôt qu'un état en
  mémoire ou encodé dans le texte du message : survit à un rechargement de page, auditable, et
  évite de mélanger données structurées et texte affiché dans `messages.contenu`.
- **Brief quotidien mis en cache en mémoire** (variable de module, pas de table dédiée) — l'app est
  mono-processus (§8.1), et le brief est un artefact dérivé régénérable à la demande, pas une donnée
  de système d'enregistrement : la solution la plus simple qui respecte « mis en cache la journée,
  régénérable à la demande » sans complexifier le schéma.
- **Q&A (« Demander ») en lecture seule, sans persistance** : `POST /brain/question` réutilise les
  mêmes outils de lecture RBAC-scopés mais n'ouvre pas de conversation Studio — une question rapide
  depuis le cockpit ne doit pas polluer l'historique de conversations, et n'a pas besoin d'écrire
  (le §6.5 ne décrit aucune écriture depuis le Brain).
- **Brief de shooting non persisté** : `POST /taches/:id/brief` calcule et renvoie le brief à la
  volée (looks/poses/pièces réels + photos jointes en pièce jointe image si présentes) sans le
  stocker — pas de colonne dédiée sur `shootings` dans le CDC, et le régénérer coûte peu.
- **Ambiguïté résolue — outils lecture/écriture par agent** : `agent_campagne.outils_actives` vide
  = accès à tous les outils (comportement « standard ») ; une liste explicite restreint aux noms
  listés. Le mode Tester (RG-AGC2) ignore `outils_actives` et ne propose jamais d'outil d'écriture,
  quelle que soit la configuration de l'agent.
- **Bug trouvé et corrigé** : `agentCampagneInsertSchema` exigeait `cree_par` (champ fixé par le
  serveur) — même angle mort que `contenu.auteur_id` en Phase ④, corrigé en l'omettant du schéma
  d'insertion partagé.
- **Studio (E12) logé dans l'onglet « Créer »**, pas un écran séparé — confirmé par
  `nav-config.ts` : l'onglet mobile « studio » pointe déjà vers `/create` depuis le Phase ①. Ajouté
  comme premier onglet (avant Contenus/Idées/Assets/Boards), cohérent avec son rôle d'entrée
  principale.
- **Cartes de confirmation affichées en JSON brut** dans le fil Studio (`apres_previsualise`
  sérialisé) plutôt qu'un rendu métier par outil — un rendu dédié par type d'action (avant/après
  lisible pour `modifier_tache`, `ajouter_look`, etc.) est un vrai gain UX mais demanderait un
  composant par outil ; le JSON reste honnête et complet (aucune perte d'information) en attendant.
- **Onglets Contenus/Assets de la fiche campagne** (jusqu'ici `EcranAConstruire`, promis pour la
  Phase ④) : complétés ici en vues filtrées en lecture (liens vers Créer pour la gestion complète)
  — un oubli de la Phase ④ à corriger avant de le laisser traîner plus longtemps, pas un ajout hors
  périmètre de la Phase ⑤.
- **Sélection d'outils par agent** : la case à cocher `outils_actives` part cochée sur les 19 outils
  (équivalent fonctionnel de la liste vide = « tous », lue côté serveur) — évite d'exposer la
  convention serveur "vide = illimité" dans l'UI, qui prêterait à confusion (tout décoché
  ressemblerait à « aucun outil » plutôt qu'à « tous »).
- **Bug trouvé et corrigé (Playwright)** : le cockpit affichait encore le texte figé de la Phase ③
  « Le brief IA sera disponible en Phase ⑤ » au lieu du nouveau message honnête — la clé de
  traduction existait déjà mais son contenu n'avait pas été mis à jour en branchant le vrai appel.
  Corrigé (`aujourdhui.brief_ia_indisponible` → « IA indisponible — réessayez plus tard. »).
- **Front vérifié de bout en bout (11 captures Playwright)** : Studio (chat, erreur IA propre),
  générateur d'idées (formulaire → erreur propre), fiche contenu (scorecard gate « Pas encore
  noté »), call sheet (bouton Générer le brief + erreur propre), onglet Agents (gabarit pré-rempli,
  19 outils, création, test bac à sable), cockpit (brief + barre Demander). Un flakiness Playwright
  isolé (navigation cockpit) confirmé environnemental par re-test immédiat réussi et par un appel
  curl direct aux mêmes endpoints (réponse instantanée) — pas un bug applicatif.

## Phase ⑥ — Mesure & croissance

- **Intégrations (Meta/TikTok/GA4/Shopify) : appels HTTP réels, jamais simulés.** Aucun compte
  développeur disponible dans cet environnement (même situation que la clé Anthropic en Phase ⑤) —
  plutôt que de mocker une réponse « connectée » factice, `POST /mesure/integrations` déclenche un
  vrai appel à l'API de la plateforme (`shop.json` Shopify, `me` Graph API Meta, `advertiser/info`
  TikTok, `runReport` GA4). Sans identifiants réels, l'appel échoue honnêtement (`statut: erreur`,
  `derniere_erreur` = message brut de la plateforme) — vérifié avec une boutique Shopify fictive :
  vraie requête sortante, vrai 403 renvoyé par Shopify, enregistré tel quel. RG-I1 (lecture seule)
  respecté : aucun appel d'écriture vers ces API. RG-I2 : `deconnecterIntegration` efface les
  identifiants et remet `statut: deconnectee`, ne touche jamais `metrique_snapshots`.
- **Chiffrement des identifiants** : AES-256-GCM (`server/src/lib/crypto.ts`), clé dérivée par
  SHA-256 de `ENCRYPTION_KEY` (accepte une clé d'env de longueur arbitraire sans erreur d'exécution
  liée à la taille de clé). Les credentials déchiffrés ne quittent jamais le serveur — chaque route
  `integrations` retire explicitement `credentials_chiffres` de la réponse.
- **`metrique_snapshot.plateforme`** : chaîne libre (pas un enum) — accepte aussi bien une clé de
  plateforme de contenu (`instagram`, `tiktok`) pour le niveau Social qu'un canal publicitaire
  (`meta_ads`) pour Paid ou `shopify` pour Site/Ventes ; le regroupement par niveau (Social/Paid/
  Site) se fait côté front par une table de correspondance statique, pas par un champ dédié en base
  — évite d'ajouter une colonne pour une classification purement d'affichage.
- **Consolidation par campagne** entièrement recalculée en direct depuis `budget_lignes` +
  `metrique_snapshots` (filtrés par `campagne_id`) + `contenus` — RG-M1 : chaque chiffre porte sa
  méthode (« saisie manuelle », « API », ou la combinaison si les deux coexistent) ; RG-M2 : la
  méthode des chiffres attribués mentionne explicitement « UTM dernier clic » — jamais un autre
  modèle d'attribution, jamais interchangeable. Une métrique sans snapshot affiche `valeur: null,
  methode: "aucune donnée"` plutôt qu'un zéro trompeur (RG-PROV).
- **GROW — recommandations 100 % règles internes, sans IA** (RG-G2) : 5 règles déterministes sur
  les données déjà en base (tâches en retard, ambassadeurs actifs sans post depuis 30 j, coloris
  actifs sans aucun asset, dette de mesure — réutilise `detteDeMesure` de la Phase ③ —, contenus
  publiés sur une seule plateforme). Aucune dépendance à la couche IA : fonctionne à l'identique,
  clé Anthropic présente ou non. RG-G1 : le plafond de 5 actives est appliqué en dédupliquant par
  clé `type|titre` avant insertion (une règle qui refire ne spamme jamais de doublon) et en ne
  comblant que les places restantes sous le plafond, triées par impact décroissant.
- **Recherche de tendances (RG-TR1) sans outil de navigation web** : le SDK Anthropic disponible
  dans cet environnement n'expose pas d'outil de recherche web serveur vérifiable sans compte réel.
  Le prompt instruit explicitement le modèle à ne jamais inventer un lien et à poser
  `source_verifiee=false` dès qu'il n'a pas de source réelle et vérifiée — solution honnête plutôt
  que de simuler une recherche web qui n'a pas lieu.
- **RG-LC1 (proposer des leçons à la fermeture)** : aucune écriture serveur automatique — le rapport
  de fermeture (3 champs) est déjà retourné par `POST /campagnes/:id/fermer` ; le front lit ces 3
  champs et propose 1 tap chacun vers `POST /lecons` (source de vérité unique, pas de duplication
  serveur).
- **RG-LC4 (suggestion d'archivage)** : `fermerCampagne` incrémente
  `fermetures_sans_reconfirmation` sur **toutes** les leçons `perdant` actives à chaque fermeture de
  campagne (pas seulement celles liées à la campagne fermée — une leçon générale doit rester
  pertinente à travers tous les chapitres) ; `POST /lecons/:id/reconfirmer` remet le compteur à
  zéro. Le seuil de 2 déclenche une suggestion d'archivage **côté front uniquement** — jamais
  d'archivage automatique, la mémoire d'équipe reste une décision humaine.
- **Vérifié de bout en bout via curl sur DB fraîche** : génération de recommandations avec chiffres
  réels et non-duplication au second appel, consolidation avant/après snapshot+budget (ROAS exact),
  connexion Shopify avec identifiants fictifs → vraie erreur HTTP 403 honnête, validation lexique
  (a_valider→validee), RG-LC4 (fermeture → compteur +1 → reconfirmer → compteur à 0).

## Phase ⑥ Frontend — MEASURE (E27/E28), GROW (E21/E22/E23/E25/E26)

- **`NiveauMesure`/`ConsolidationCampagne` — sélection par défaut synchronisée après chargement
  async** (bug trouvé et corrigé en vérification Playwright) : `Measure.tsx` charge
  `plateformesSocial`/`canauxPaid`/`campagnes` de façon asynchrone puis les passe en props ; les
  deux composants enfants initialisaient leur `useState` de sélection (`plateforme`/`campagneId`)
  une seule fois au montage (`plateformes[0]?.valeur ?? ""`). Si le montage précède la résolution du
  fetch parent (cas réel au tout premier chargement de page), la sélection reste verrouillée sur
  `""` en permanence — le `<select>` affiche visuellement la première option réelle dès qu'elle
  apparaît (comportement par défaut du navigateur pour une `value` qui ne correspond à aucune
  `option`), mais l'état React reste vide, et toute soumission échoue silencieusement en 400
  (`plateforme` requis, `min(1)`) sans qu'aucun message d'erreur explicite ne le signale à
  l'utilisateur. Corrigé par un `useEffect` qui bascule la sélection sur la première valeur dès que
  le tableau de props se peuple et que la sélection est encore vide, dans les deux composants.
- **Onglet Paid et Site non affectés** : `Measure.tsx` fournit un tableau de repli non vide pour Paid
  (`meta_ads`/`tiktok_ads`) et une liste statique pour Site (`shopify`) — seul l'onglet Social,
  entièrement dépendant du fetch référentiels, était exposé à la course ci-dessus.
- **RG-LC1 vérifié de bout en bout via Playwright** : campagne active → passage `livree` → fermeture
  avec rapport (3 champs) → les 3 boutons « Proposer comme leçon » créent bien 3 leçons distinctes
  via `POST /lecons`, chacune marquée d'un badge « Leçon proposée » côté client (état local, non
  persisté — se réinitialise à un rechargement, ce qui est volontaire : la leçon elle-même est
  persistée en base, seul l'indicateur anti-double-clic est éphémère).
- **Textes des recommandations GROW non traduits par la couche i18n** : `Recommandation.titre` est
  un texte généré côté serveur par les règles internes (ex. « 14 coloris actif(s) sans visuel »),
  stocké tel quel en base — comme le reste du contenu métier généré (rapports, briefs), il n'est pas
  retraduit dynamiquement par le front en arabe ; seuls les libellés d'interface (onglets, boutons,
  statuts) suivent `i18n`. Cohérent avec le choix déjà fait en Phase ⑤ pour le contenu généré par IA.
- **Vérifié via Playwright sur DB fraîche (FR + AR/RTL)** : MEASURE (saisie manuelle Social avec
  table de résultats, Consolidation avec sélection de campagne auto-résolue, Intégrations avec vraie
  erreur HTTP 403 Meta affichée honnêtement) ; GROW (génération de recommandations réelles,
  recherche de tendances → 503 IA indisponible affiché proprement, veille concurrents, lexique avec
  statuts validée/interdite, leçons) ; RG-LC1 complet sur une fermeture de campagne réelle ; bascule
  FR/AR avec `dir="rtl"` correct et tous les nouveaux libellés `grow.*`/`mesure.*` traduits.

## Phase ⑦ Transverses — commentaires, notifications, audit, exports, sauvegardes, observabilité, PWA

- **Commentaires (RG-CO1)** : jamais supprimés en base, seulement marqués `retire` — le front affiche
  alors « Message retiré » à la place du contenu. `retirer` est réservé à l'auteur du commentaire ou
  à un titulaire de `approbation.gerer` (vérifié par curl : un contributeur non-auteur reçoit 403) ;
  `resoudre` exige `entites.editer` (au-delà de simple lecteur) ; `creer` reste ouvert à
  `commentaire.creer`, détenue par tous les rôles y compris lecteur.
- **@mentions résolues côté serveur, sans champ dédié dans le schéma d'insertion** : le schéma
  `commentaireInsertSchema` ne porte que `contenu` — les mentions sont extraites en comparant le
  texte à `@` + le `nom` exact de chaque utilisateur actif (`extraireMentions`), pas par un système
  d'autocomplétion côté client. Une mention de soi-même ne déclenche jamais de notification.
- **Notifications 3 canaux (`in_app`/`email`/`push`)** : le canal `in_app` est toujours réellement
  livré (ligne insérée dans `notifications`, source de la cloche). `email`/`push` sont honnêtement
  dégradés — le choix de l'utilisateur est journalisé (`logger.info`) mais rien n'est réellement
  envoyé tant qu'aucun fournisseur SMTP/Web Push n'est configuré côté serveur (même logique que la
  Phase ⑤ pour la clé Anthropic absente) ; le front l'explique dans un texte d'aide sous la matrice
  de réglages plutôt que de le cacher.
- **Planificateur in-process (`demarrerPlanificateurRappels`)** : un seul processus déployé (§8.1) →
  pas de worker séparé ni de queue externe. Un tour immédiat au démarrage puis `setInterval` horaire
  couvre `retard`, `echeance_j1`, `rappel_publication`, `rappel_veille` (aucun relevé concurrent
  depuis 7 jours), `rappel_retour_pieces` (pièces de shooting non rentrées après tournage), et
  `rappel_kit_ambassadeur` (ambassadeur actif dont `pieces` est encore vide — seul signal disponible
  dans le schéma actuel, aucun champ dédié "kit envoyé"). Idempotent : avant toute création, vérifie
  qu'aucune notification du même type n'existe déjà pour cette entité/utilisateur (`dejaNotifie`),
  vérifié en redémarrant le serveur deux fois de suite sans doublon.
- **`alerte_production` non automatisée** : aucun signal fiable dans le schéma actuel (pas de champ
  de suivi de production ni de seuil de stock sur `article_skus`) pour déclencher cette alerte sans
  fabriquer une règle arbitraire (RG-PROV) — le type reste dans l'énumération et le réglage
  utilisateur, prêt à être déclenché manuellement ou par un futur événement métier réel.
- **Notifications événementielles** : `assignation` (tâche créée/modifiée avec de nouveaux
  `assigne_ids` — résolus en `utilisateur_id` via `utilisateurs.personne_id`, silencieusement ignoré
  si la personne assignée n'a pas de compte système), `approbation_demandee`/`approbation_rendue`
  (hooks dans `soumettreContenu`/`approuverContenu`), `sync_erreur` (hook dans `syncIntegration`
  côté Phase ⑥, vers tous les détenteurs de `approbation.gerer`).
- **Journal d'audit** consultable/filtrable réservé à `parametres.gerer` — réutilise la table `audits`
  déjà alimentée par `enregistrerAudit` depuis la Phase ①, aucune duplication.
- **Exports CSV/JSON** pour contacts/catalogue/campagnes/audit, RG-R2 respecté (montants redigés
  selon le rôle, vérifié par curl : `tarif_jour_dt` présent pour admin, vide pour contributeur).
  Export PDF du rapport de fermeture de campagne (rapport 3 champs + KPI + consolidation), réutilise
  `consolidationCampagne` de la Phase ⑥ et le pattern `pdfkit`/stream-vers-buffer du call sheet.
- **Bug trouvé et corrigé (glyphes PDF hors encodage WinAnsi)** : les glyphes Unicode `→`/`☑`/`☐`
  s'affichent en mojibake avec la police Helvetica standard de pdfkit (encodage WinAnsi/CP1252, pas
  de embedding de police Unicode) — confirmé par test isolé. Corrigé dans le nouveau rapport PDF
  (`→` → `-`) et rétroactivement dans le call sheet de la Phase ③ (`☑`/`☐` → `[x]`/`[ ]`), seul
  fichier PDF pré-existant du projet.
- **Sauvegardes réelles** : `Database.backup()` de better-sqlite3 (snapshot cohérent même sous WAL,
  contrairement à une copie brute du fichier qui pourrait capturer un état incomplet en écriture
  concurrente) + copie récursive de `uploads/`, dans un dossier horodaté sous `BACKUPS_DIR`.
  Rétention des 14 dernières. Déclenchement manuel (route `POST /sauvegardes`, réservée
  `parametres.gerer`) et planificateur quotidien in-process ; pas de téléchargement zip exposé
  (aucune dépendance d'archivage ajoutée) — la liste affiche date/taille, la sauvegarde reste
  accessible sur le disque du serveur pour un opérateur avec accès filesystem.
- **Observabilité** : chiffres réels uniquement (RG-PROV) — uptime process, taille du fichier DB,
  dernière sauvegarde, tokens IA consommés aujourd'hui (réutilise `tokensConsommesAujourdhui` de la
  Phase ⑤), statut des intégrations MEASURE, nombre d'entrées d'audit du jour, indicateur booléen
  `ia_configuree`. Aucune métrique fabriquée en l'absence de données (ex. `taille_db_octets: null`
  si le fichier est introuvable plutôt qu'un zéro trompeur).
- **PWA** : `vite-plugin-pwa` (déjà en dépendance depuis la Phase ①) configuré avec manifeste réel
  (nom, couleurs de marque, `start_url: /aujourdhui`) et icônes PNG générées par un encodeur PNG
  minimal écrit à la main (pas de dépendance canvas/sharp) — image réelle décodable (cercle sable
  sur fond `bg`), pas un fichier placeholder mal étiqueté. Les requêtes `/api/*` restent
  `NetworkOnly` dans le service worker : seul l'app shell (JS/CSS/fonts/icônes) est précaché, jamais
  une réponse API — cohérent avec RG-PROV, aucune donnée métier obsolète ne doit jamais être
  présentée comme actuelle depuis un cache.
- **Vérifié de bout en bout (curl + Playwright FR/AR) sur DB fraîche** : mention → notification réelle
  pour un second utilisateur (jamais pour l'auteur), réglages de canaux persistés, RBAC retirer/
  résoudre, scheduler idempotent sur deux redémarrages consécutifs (tâche en retard assignée →
  exactement 2 notifications, pas de doublon), export CSV avec redaction RG-R2 vérifiée par rôle,
  sauvegarde manuelle réelle + liste, statut d'observabilité, panneau de commentaires sur
  tâche/contenu/campagne/shooting, cloche avec badge non-lues et marquage lu, PWA buildée avec
  succès (manifest.webmanifest + sw.js générés, 9 entrées précachées).

## CR-02 — Bloc B : looks visibles sur le call sheet (correctif rapide)

- **Aucun changement de schéma.** Conforme au garde-fou du CR : `look_id` sur `poses` et les champs
  `preparation_pieces`/`retour_pieces`/`livrable_photos`/`livrable_videos`/`statut_post_prod`/
  `nb_photos_recues` sur `shootings` existaient déjà en base et côté Zod depuis le scaffold de la
  Phase ① / le modèle RG-LK1 de la Phase ③ — ils n'étaient simplement jamais rendus dans une écran.
  Ce bloc est donc purement UI/rendu, comme annoncé par le CR.
- **Fichier prototype introuvable** : `achirah-hq-prototype.html`, cité par le CR comme référence de
  structure/densité pour le call sheet, n'existe nulle part dans le dépôt (recherche exhaustive par
  nom et par contenu). La description textuelle du CR (ordre de sections CDC E06, cartes 4 lignes,
  traitement visuel par source) a été suivie directement en l'absence de ce fichier.
- **Ordre des sections imposé (CDC E06)** dans `CallSheet.tsx` : En-tête + Prêt à tourner → Équipe
  (photographe/heure/durée/modèles) → Looks → Pièces à apporter (agrégées, tag « issues des looks »
  par ligne) → Shot list → Matériel → Préparation pièces → Retours → Livrables/post-prod → Notes →
  Commentaires.
- **Looks en cartes, pas en tableau** : `LooksComposer.tsx` réécrit — une carte par look, 4 lignes
  fixes (Haut/Bas/Chaussures/Accessoires). Traitement visuel par source d'article : référence
  catalogue en couleur accent (libellé résolu réf. + nom + coloris), vignette 📷 réelle pour une
  photo (via `clientAssets`, avec repli emoji si l'image ne charge pas), texte libre en gris atténué.
  Duplication (« Look copié » avec tous ses items) et réordonnancement (↑/↓, persistés via `ordre`)
  accessibles directement sur la carte.
- **Bug préexistant trouvé et corrigé (UUID brut affiché)** : l'ancien rendu résolvait le nom d'un
  item catalogue via `colorisNomParId.get(item.article_coloris_id)`, mais `article_coloris_id`
  référence la table de jonction article×coloris, pas le référentiel `coloris` — deux espaces d'id
  différents. Le bug existait depuis la Phase ③ mais restait invisible tant que les items étaient de
  petites puces peu visibles ; il est devenu flagrant une fois la carte mise en avant par ce bloc.
  Corrigé par une résolution en deux étapes (`article_coloris_id` → `ArticleColoris` → `Article` +
  nom du coloris) construisant un vrai libellé.
- **Onglet photo du composeur de look, jusque-là un stub** (`commun.a_construire`), rendu
  fonctionnel : grille de vignettes cliquables filtrées sur la campagne courante, sélection envoyée
  comme item `source: "photo"`.
- **Pose liée à un look** : `poses.look_id` (déjà nullable en base) exposé dans le formulaire d'ajout
  et sur chaque ligne existante via un `<select>` ; la ligne affiche alors « — Nom du look ».
  Vérifié par un correctif direct en base puis lecture du contenu DOM (« — Look 2 »).
- **Bug trouvé et corrigé (liste des looks obsolète dans la shot list)** : `ShotList.tsx` chargeait
  ses looks une seule fois au montage, sans rafraîchissement quand `LooksComposer` (composant frère)
  créait un nouveau look. Corrigé par un compteur `looksVersion` détenu par `CallSheet` et incrémenté
  à chaque rechargement partagé, transmis en prop, avec le chargement des looks de `ShotList` séparé
  en un second `useEffect` dépendant de `[shootingId, looksVersion]`. A également fallu corriger
  `LooksComposer.ajouterLook()` pour qu'il appelle `onChange` (jusque-là seules les mutations d'item
  le faisaient), sinon créer un look vide ne déclenchait jamais la mise à jour du compteur.
- **Sections « Préparation pièces », « Retours » et « Livrables/post-prod »** construites de zéro
  (les champs existaient en schéma mais aucune UI ne les exposait) : case à cocher par pièce
  effective pour la préparation, sélecteur de statut de retour par pièce (rendu/gardé par le
  modèle/offert/abîmé), formulaire de statut post-prod + nombre de photos reçues + livrables
  photos/vidéos (URLs ou identifiants, saisie libre).
- **Origine des pièces exposée sans nouvelle colonne** : `calculerPiecesEffectives()` (service, déjà
  existant) retourne désormais un champ calculé `origine: "look" | "manuel"` par pièce — dérivé à la
  volée à partir des looks du shooting, jamais persisté, donc sans impact schéma. Le call sheet
  affiche « (issues des looks) » sur les lignes concernées.
- **Vérifié par Playwright sur DB fraîche (cycles répétés)** : 2 looks avec items multi-sources
  visibles simultanément à l'écran, agrégation des pièces avec tag d'origine, duplication d'un look
  avec ses 4 items, pose liée affichant le nom du look, export PDF du call sheet toujours fonctionnel
  après les changements, rendu complet en arabe/RTL sans casse de mise en page. Limite d'environnement
  notée (non-bloquante) : les images de test `picsum.photos` échouent en sandbox
  (`ERR_TUNNEL_CONNECTION_FAILED`, hôte non autorisé par le proxy) — le `<img>` et son repli sont
  corrects, seule l'image externe de démonstration ne charge pas ici.

## CR-02 — Bloc A : la campagne comme monde (architecture de navigation)

- **Aucun changement de schéma.** Conforme au garde-fou du CR : c'est un contexte de navigation
  entièrement côté client (React context + `localStorage`), jamais une vérité de données. Aucune
  table, aucune colonne, aucune migration. `article`/`personne`/référentiels/mesure restent
  transverses — c'est exactement pour ça qu'ils forment le groupe « Patrimoine », séparé de la
  campagne en contexte, plutôt que d'être eux-mêmes rattachés à une campagne.
- **`CampagneContexteProvider`** (`front/src/lib/campagne-contexte.tsx`), monté dans `AppShell` (donc
  partagé par toutes les routes authentifiées) : expose `campagneActive`, `campagneActiveId`, `mode`
  (`"campagne" | "toutes"`), `definirCampagneActive(id)`, `activerToutesCampagnes()`, `rafraichir()`.
  Sélection initiale automatique — campagne `active` la plus proche, sinon `preparation`, sinon mode
  « toutes campagnes » (aucune campagne exploitable) — puis mémorisée dans `localStorage` et pilotée
  ensuite exclusivement par l'utilisateur ; jamais de blocage si `localStorage` est indisponible
  (navigation privée) : le contexte reste simplement en mémoire pour la session.
- **Sélecteur de contexte persistant sous le header** (`CampagneSwitcherBar`, `front/src/components/
  layout/CampagneSwitcherBar.tsx`) : rendu dans `AppShell` juste au-dessus de l'`<Outlet/>`, donc visible
  sur tout écran mobile et desktop, avec un lien « Gérer les campagnes ». Le rail desktop
  (`SideRail.tsx`) porte son propre sélecteur compact en tête du groupe « CAMPAGNE » (même contexte
  partagé, pas de logique dupliquée) — c'est la réalisation concrète du « CAMPAGNE — [nom] ▾ » demandé.
- **Rail desktop scindé en deux groupes** (`nav-config.ts` : `ESPACES_CAMPAGNE` / `ESPACES_PATRIMOINE`) :
  CAMPAGNE (Aujourd'hui, Espace de travail, Studio) puis, séparés par un filet, PATRIMOINE (Catalogue,
  Équipe, Mesure, Grow, Paramètres). Bonus constaté en migrant : Catalogue n'était auparavant accessible
  nulle part depuis le rail desktop (seulement depuis l'onglet mobile) — un oubli pré-existant, corrigé
  au passage par ce regroupement.
- **`/plan` n'est plus la liste des campagnes** : nouveau composant `PlanContexte` — redirige (`Navigate
  replace`) directement vers `/plan/campagnes/{id}` de la campagne en contexte ; ne retombe sur la liste
  (`CampagnesListe`, désormais montée sur `/plan/campagnes`) que si le mode est « toutes campagnes » ou
  qu'aucune campagne n'existe encore. C'est le mécanisme qui fait que l'onglet mobile « Campagne » et le
  lien rail « Espace de travail » ouvrent tous les deux le hub directement, jamais la liste. L'ancien
  `Plan.tsx` (bascule d'onglets Campagnes/Tâches) est supprimé — son rôle de bascule n'a plus de sens
  une fois la campagne posée comme le monde par défaut.
- **Le board de tâches multi-vues (Kanban/Calendrier/Liste, E04/E18) n'est pas perdu** : il reste
  entièrement disponible sur `/plan/taches`, simplement retiré de la navigation de premier niveau (il
  n'apparaît plus comme onglet séparé, cohérent avec « campagne = monde, sous-objets en dessous »).
  Un lien « Voir toutes les tâches (Kanban/Calendrier) → » a été ajouté dans l'onglet Tâches du hub de
  campagne (`OngletTachesCampagne`), pré-filtré sur la campagne courante via `?campagne_id=`.
- **Cockpit (Aujourd'hui) filtré sur la campagne en contexte par défaut** : `clientTaches.lister()` et
  la dette de mesure prennent désormais `campagne_id` du contexte quand `mode === "campagne"` (aucun
  filtre en mode « toutes »). La bannière « chapitre actif » vient maintenant de
  `campagneActive` (le contexte) et non plus d'un `clientCampagnes.lister("active")[0]` local — c'était
  exactement le défaut pointé par le propriétaire (« aucune impression de gérer 1 section selon le
  contexte »). L'échappatoire « Toutes les campagnes » est le sélecteur global lui-même (une option de
  plus dans la liste), pas un second contrôle dupliqué sur chaque écran.
- **Studio filtré sur le contexte par défaut** : le sélecteur de campagne par message se pré-remplit
  sur `campagneActiveId` (au lieu de rester sur `"Campagne (par défaut)"`), et se resynchronise tant que
  l'utilisateur ne l'a pas modifié manuellement pour ce message (drapeau local, pas de logique serveur
  dupliquée — RG-AGC1 continue de résoudre le `campagne_id` transmis exactement comme avant).
- **Bug trouvé et corrigé (pré-remplissage de « Nouvelle tâche » jamais appliqué)** :
  `NouvelleTacheDialog` initialisait son état de formulaire une seule fois via `useState(() => ...)`, à
  l'instant du montage — or ce dialogue reste monté en permanence (juste masqué visuellement tant que
  `ouvert` est faux), donc ce montage a lieu bien avant que le contexte de campagne (asynchrone) ne se
  résolve : `campagne_id` restait vide quel que soit le contexte. Corrigé par un `useEffect` qui
  réinitialise le formulaire à chaque transition vers `ouvert === true`, avec la valeur courante de
  `campagneParDefaut` — vérifié par lecture directe de la valeur du `<select>` après ouverture du
  dialogue (`2f238d28-…` bien présent, plus de champ vide).
- **« Définir comme campagne active »** sur le hub de campagne (`FicheCampagne`) : bouton visible
  uniquement quand la campagne consultée diffère du contexte courant, permet de promouvoir n'importe
  quelle campagne (même `préparation` ou `livrée`) comme contexte en un clic — cohérent avec « la
  campagne devient le monde », y compris pour une campagne pas encore active. Créer une nouvelle
  campagne (`NouvelleCampagneDialog`) la définit aussi automatiquement comme contexte.
- **Test artifact identifié et non corrigé côté app (limiteur de débit, §8.2)** : plusieurs cycles de
  vérification Playwright consécutifs contre le même processus serveur long-lived ont déclenché le
  limiteur en mémoire (300 req/15 min/IP) — confirmé par les logs serveur (`statut:429` en rafale sur
  `/api/campagnes`, `/api/taches`, etc.). Diagnostiqué en isolant un script minimal avec écoute réseau ;
  résolu en redémarrant le processus serveur (qui réinitialise le compteur en mémoire) entre les
  vérifications, sans toucher au limiteur lui-même — c'est un contrôle de sécurité légitime, pas un
  défaut.
- **Vérifié par Playwright sur DB fraîche (FR + AR/RTL, desktop + mobile)** : sélection automatique du
  contexte à la première connexion, bascule manuelle et « Toutes les campagnes », clic sur « Espace de
  travail »/onglet mobile « Campagne » atterrissant directement sur le hub, liste accessible uniquement
  via « Gérer les campagnes », pré-remplissage du dialogue de tâche et du sélecteur Studio, bouton
  « Définir comme campagne active », lien vers le board complet depuis l'onglet Tâches du hub, les cinq
  écrans du groupe Patrimoine chargeant sans erreur, rail et barre de contexte cohérents en arabe/RTL
  desktop et mobile.

## CR-02 Bloc A — fusion avec un push parallèle du propriétaire (refonte visuelle + Docker)

- **Constat** : au moment de pousser le Bloc A, la branche portait déjà un commit direct du
  propriétaire (auteur `ghassen`, hors de cette session) ajoutant Docker (`Dockerfile`, `compose.yaml`,
  `.dockerignore`), un instantané de référence (`Achirah Maquette responsive complète - corrigée
  Docker.zip` — l'arborescence complète d'une variante du front, PAS le fichier `achirah-hq-
  prototype.html` cherché en Bloc B, qui reste introuvable), une refonte visuelle (composants `Bouton`/
  `Icone` avec vraies icônes SVG, jetons Tailwind affinés, en-tête collant flouté, cartes arrondies),
  une nouvelle fonctionnalité admin (clé Anthropic configurable et chiffrée en base via `/api/
  configuration/ia`, table `configurations_systeme`, migration `0004`) et — fait notable — sa **propre**
  tentative de « campagne comme monde » (page Plan simplifiée, board de tâches désormais intégré à
  l'onglet Tâches du hub plutôt qu'un écran séparé, fil d'Ariane, suppression de tâche). Ce dernier
  point confirme que la demande du propriétaire converge indépendamment vers le même besoin.
- **Décision (demandée explicitement par le propriétaire)** : fusionner en conservant l'intention des
  deux côtés plutôt qu'écraser l'un ou l'autre. Stratégie retenue : le **langage visuel et les
  restructurations de composants** du push parallèle sont adoptés tels quels (`Bouton`, `Icone`,
  `Dialog`, `Tabs`, `Champ`, l'en-tête `AppShell` collant avec titre contextuel par route, le board de
  tâches désormais intégré — `TachesBoard` prend `campagneId`/`campagneNom` en props obligatoires au
  lieu d'un filtre d'URL, ce qui est strictement meilleur que le lien externe prévu initialement) ; le
  **contexte de campagne global** (`CampagneContexteProvider`, sélecteur persistant, atterrissage direct
  sur le hub, échappatoire « toutes campagnes », pré-remplissage) reste la seule pièce apportée par ce
  Bloc A, absente du push parallèle, et est greffé par-dessus la nouvelle identité visuelle plutôt que
  remplacé par elle. Le regroupement statique du rail du push parallèle (« Piloter/Créer/Analyser/
  Équipe/Administration », 5 groupes génériques) est abandonné au profit du regroupement CAMPAGNE/
  PATRIMOINE explicitement demandé par le CR, réhabillé avec les mêmes icônes et le même style.
- **Conséquence directe sur ce Bloc A** : la route autonome `/plan/taches` (accès au board multi-vues
  toutes campagnes confondues) disparaît — `TachesBoard` n'est plus utilisable hors du contexte d'une
  campagne précise. C'est cohérent avec l'esprit du CR (la campagne est le monde, pas une vue
  transverse des tâches) et va plus loin que ce qui était prévu : la « fiche tâche » individuelle
  (`/plan/taches/:id`) reste accessible telle quelle.
- **Aucun changement de schéma introduit par ce Bloc**. La migration `0004_configurations_systeme`
  vient du push parallèle du propriétaire lui-même (pas de cette exécution du CR) : elle n'enfreint pas
  le garde-fou du CR, qui porte sur ce que cette exécution devait faire, pas sur le travail du
  propriétaire lui-même.
- **Changement d'infrastructure noté (hors CR, hérité du push parallèle)** : `shared/package.json`
  pointe désormais vers `shared/dist` (compilé) au lieu de `shared/src` directement — nécessite
  `npm run build:shared` avant `typecheck`/`dev` après un clone frais ou un `npm ci`. Documenté ici
  pour éviter une fausse alerte « module introuvable » lors d'une prochaine session.
- **Vérifié par Playwright après fusion, sur DB fraîche (FR + AR/RTL, desktop + mobile)** : groupes de
  rail CAMPAGNE/PATRIMOINE avec la nouvelle identité visuelle, atterrissage direct sur le hub, board de
  tâches intégré (Liste/Kanban/Calendrier) dans l'onglet Tâches, fil d'Ariane et suppression de tâche
  (nouveauté du push parallèle) fonctionnels, dialogue de tâche pré-rempli **et désactivé** quand un
  contexte est actif (amélioration du push parallèle, cohérente avec RG du CR), bouton « Définir comme
  campagne active », écrans admin ajoutés (Intégrations & IA, Charte UI) sans erreur, catalogue/
  contacts/mesure/grow toujours accessibles sans erreur, export PDF du call sheet toujours 200
  (`CallSheet.tsx`/`LooksComposer.tsx`/`ShotList.tsx` du Bloc B non touchés par la fusion — aucun
  risque de régression sur les looks), rendu arabe/RTL cohérent sur le rail, la barre de contexte et le
  call sheet.

## CR-02 — Bloc C : pilotage contextuel (bandeau « Prochaine étape », pastilles de section)

- **Aucun changement de schéma.** Garde-fou respecté : chaque fonction « prochaine étape » ne fait que
  relire des champs déjà en base et recombine des fonctions déjà partagées — `campagneResultatsManquants`
  (déjà utilisée par `fermerCampagne`, RG-ECO2), `tacheEnRetard` (déjà utilisée par le cockpit
  Aujourd'hui), `skusDeArticle`/`compterSkusAvecMesures` (déjà utilisées par la gate `fit_valide`),
  `calculerPiecesEffectives`/`retour_pieces` (déjà utilisées par `pret_a_tourner`). Trois nouvelles
  fonctions pures ajoutées à `shared/` pour rester dans ce même modèle « une seule fonction, appelée
  identiquement serveur et client » : `campagneResultatsManquants` a été extraite (elle était inline
  dans `fermerCampagne`), `calculerRetoursIncomplets` (taches.ts) et `compterSkusAvecMesures`
  (catalogue.ts) sont nouvelles mais suivent le même patron.
- **`ProchaineEtape` (type partagé, `shared/src/schemas/common.ts`)** : le serveur ne renvoie que des
  codes sémantiques (`etatCle`, `manqueCle`, `actionCle` + paramètres bruts type `{n, jours, actuel}`),
  jamais de texte traduit — même principe que `calculerPretATourner` qui renvoie déjà des codes
  `manques: string[]` que le front traduit. Nouvelles routes en lecture seule, un GET par objet :
  `GET /campagnes/:id/prochaine-etape`, `GET /articles/:id/prochaine-etape` (le shooting et le contenu
  n'ont pas eu besoin de route dédiée, voir plus bas).
- **Composants front réutilisables, nouveaux** : `ProchaineEtape.tsx` (bandeau `[état] → [manque] →
  [action]`, purement informatif — RG-PAR1), `EtatCompletude.tsx` (type `"complet"|"en_cours"|"vide"|
  "manquant"` + `PastilleEtat` ✓/●/○/⚠), `SectionRepliable.tsx` (section accordéon avec pastille,
  ouverte par défaut si c'est la première section incomplète). `Tabs.tsx` étendu pour accepter un
  `etat?: EtatCompletude` optionnel par onglet (rétrocompatible avec tous les usages existants qui ne le
  passent pas).
- **Action du bandeau = toujours une navigation, jamais un déclenchement d'écriture direct** : chaque
  bouton d'action change d'onglet ou de sélection, il ne rappelle jamais `genererRituel()`/`noterGate()`
  /etc. depuis le bandeau lui-même — ces écritures restent déclenchées uniquement par les boutons déjà
  existants de l'écran cible. Objectif : un seul point de déclenchement par action d'écriture, pour
  éviter un double appel (ex. générer le rituel deux fois) si le bandeau et le bouton habituel
  coexistaient.
- **FicheCampagne.tsx** : bandeau branché sur `prochaineEtapeCampagne` (4 branches : `preparation` avec
  jusqu'à 3 manques successifs — description, cibles, rituel —, `active` avec compte à rebours + jalons
  en retard, `livree` avec résultats manquants, `livree`/`fermee` neutre). Onglets réordonnés selon le
  statut (§C.4 — rien n'est masqué, RG-PAR1, seul l'ordre change) et pastillés sur les 4 onglets où un
  signal fiable existe sans fetch supplémentaire (stratégie, tâches, contenus, résultats) ; onglet par
  défaut = premier onglet incomplet. Nouvel onglet **Résultats** (`OngletResultats.tsx`, stub
  `EcranAConstruire` remplacé) : un champ numérique par clé de `kpi_cibles`, sauvegarde au blur via le
  PATCH générique existant (`resultats` était déjà un champ de `Campagne`, aucun nouvel endpoint).
- **CallSheet.tsx** : nouvelle prop `dateEcheance` (transmise par `FicheTache.tsx` depuis `tache.date_echeance`,
  déjà en scope) pour choisir entre bandeau « prêt à tourner » (avant la date, réutilise
  `pret_a_tourner.pret/.manques`) et bandeau « retours à traiter » (après la date, réutilise le nouveau
  champ `retours_manquants`). L'ancien indicateur inline (point coloré + texte, dupliqué avec le
  bandeau) est supprimé au profit du composant partagé. Sections repliables + pastillées : Équipe,
  Pièces à apporter, Matériel, Préparation pièces, Retours, Livrables/post-prod — Équipe et Pièces à
  apporter réutilisent directement les codes de `pret_a_tourner.manques` (même gate que le bandeau,
  jamais recalculée). **Looks et Shot list restent hors accordéon** : ces deux sous-composants
  gèrent déjà leur propre en-tête et leurs propres actions (« + Ajouter un look », « + Ajouter une
  pose ») ; les envelopper aurait dupliqué leur titre pour un bénéfice marginal, alors que C.6 borne
  explicitement ce CR à « pas de refonte du design system ».
- **FicheArticle.tsx** : bandeau branché sur `prochaineEtapeArticle` (seul le statut `prototype` porte
  un manque précis — mesures saisies sur N/3 tailles, action « Saisir les mesures » → bascule sur
  l'onglet SKU ; tout autre statut affiche un bandeau neutre qui réutilise `catalogue.statuts.*`).
  L'onglet SKU & Mesures porte la pastille correspondante et devient l'onglet par défaut si des mesures
  manquent.
- **FicheContenu.tsx** : bandeau **sans route serveur dédiée** — contrairement aux trois autres objets,
  les deux seules gates réellement bloquantes d'un contenu (`soumettreContenu` : légende ou asset
  requis ; RG-AS1 : droits UGC manquants) sont déjà entièrement dérivables des données que l'écran
  charge pour son propre usage (`contenu`, `assets` liés) — ajouter un endpoint aurait dupliqué une
  logique déjà lisible côté client sans rien recalculer de nouveau. Le check RG-AS1 du bandeau est
  exactement le même prédicat que l'avertissement déjà affiché par asset (`source === "ugc" && !droits`),
  juste agrégé en un compte. Pas de pastilles/réordonnancement ici : §C.3 ne cite que « hub campagne,
  call sheet et fiche article » pour ce traitement, et `FicheContenu` est un défilement unique sans
  onglets.
- **Décisions de périmètre délibérées (pour rester dans C.6 — « pas de refonte du design system, pas de
  nouvel endpoint métier au-delà de l'exposition en lecture seule des états de complétude »)** :
  pas de bouton d'action « fixer les cibles » sur le bandeau de campagne (aucune UI d'édition de
  `kpi_cibles` n'existe nulle part dans le front — lacune préexistante, non comblée par ce bloc, pas
  masquée non plus) ; pas de pastille sur les onglets Budget/Équipe/Assets/Agents du hub campagne (aucun
  signal fiable sans fetch supplémentaire) ; pastille du SKU sur `FicheArticle` uniquement au statut
  `prototype` (seul cas listé par le CR).
- **Vérifié par Playwright sur DB fraîche (FR + AR/RTL)** : bandeau de campagne active avec compte à
  rebours + jalon en retard + action « Voir les tâches en retard » fonctionnelle, onglets réordonnés et
  pastillés (⚠ Tâches en premier, onglet par défaut correct) ; call sheet avec bandeau « À préparer »
  listant les manques et 4 sections repliables pastillées (⚠ Équipe ouverte par défaut, ⚠ Pièces à
  apporter, ● Matériel, ○ Livrables) ; fiche article prototype avec bandeau « mesures saisies sur 0/3
  tailles » et onglet SKU & Mesures auto-sélectionné et pastillé ⚠ ; fiche contenu brouillon avec
  bandeau « une légende ou un asset » et fiche contenu en revue avec un asset UGC requalifié après coup
  (recréé via PATCH `source: "ugc"`, la garde RG-AS1 bloquant la création directe) affichant « 1
  asset(s) UGC sans droits renseignés » — cohérent avec l'avertissement déjà affiché sur la puce asset
  correspondante ; rendu arabe/RTL correct sur les quatre écrans (dir=rtl, interpolations `{{n}}`/
  `{{jours}}`/`{{actuel}}` correctes, aucune fuite de clé i18n brute) ; `npm run typecheck` propre sur
  les trois workspaces après chaque ajout.
- **Incident d'environnement (sans conséquence sur le dépôt)** : un redémarrage du process serveur pour
  réinitialiser le limiteur de débit (§8.2, 300 req/15 min/IP, épuisé par les cycles de vérification
  répétés) a été fait sans variable `DATABASE_PATH` définie, rouvrant par erreur une base SQLite locale
  vide au lieu de la base de démonstration déjà peuplée — perte de données purement locale et
  reproductible (`server/data/`, ignoré par git, jamais commité). Reconstituée par `db:migrate` +
  `db:seed` + ré-initialisation du compte admin ; aucun fichier suivi par git n'a été affecté.

## CR-02 — Vérification finale (régression toutes phases + tous les blocs)

- **Balayage Playwright complet, FR, sur base fraîche** : les 25 écrans/onglets couvrant les 7 phases
  et les 3 blocs du CR (Aujourd'hui, liste et hub campagne avec ses 8 onglets, fiche tâche/call sheet,
  catalogue liste + fiche article, contacts, cercle, contenus liste + fiche, idées, assets, boards,
  calendrier, studio, mesure, grow, paramètres) chargent tous sans erreur applicative — aucune régression
  détectée sur les écrans non touchés par ce CR ni sur ceux modifiés par les blocs A/B/C. Les seules
  entrées console relevées sont attendues et déjà documentées ailleurs dans ce fichier : 503 sur
  `/api/brain/brief` (scénario « Panne IA », pas de clé Anthropic en local) et des `ERR_CONNECTION_RESET`
  isolés à la navigation (requêtes de sondage annulées par le démontage du composant, sans contrepartie
  dans les logs serveur — comportement client normal, pas un échec réseau réel).
- **`npm run typecheck` propre sur les trois workspaces** à l'état final du dépôt (aucune régression de
  type introduite par l'un des trois blocs, y compris sur les deux seuls autres consommateurs de
  `Tabs`/`CallSheet` — `Parametres.tsx` et `FicheTache.tsx` — vérifiés individuellement pour confirmer
  qu'aucun n'est cassé par l'extension de `Tabs` ou le nouveau prop `dateEcheance`).
- **Portée du garde-fou du CR tenue de bout en bout** : aucune migration, aucun changement de FK sur les
  trois blocs — seules deux évolutions de schéma sont entrées dans ce dépôt pendant cette période, et
  toutes deux viennent du push parallèle du propriétaire fusionné avant le Bloc A (`0004_configurations_systeme`,
  déjà documenté plus haut), pas de l'exécution de ce CR.

## CDC v4 (architecture SaaS) — backlog et Étape 0

- **Backlog uniquement, sur demande explicite de l'utilisateur** : le CDC v4 (« Plan de solidification
  en 7 couches ») décrit une transformation multi-mois vers une plateforme SaaS multi-locataire. Sur
  demande de l'utilisateur, il a été décomposé en tâches suivies (#65 à #110) reproduisant sa structure
  (Étape 0, C1 à C7, dépendances externes) — sans aucun code écrit à cette étape. Deux catégories de
  tâches restent explicitement bloquées et ne peuvent pas être exécutées par ce dépôt seul : #82 (prix
  et limites de plan — décision de discovery client, pas une décision technique) et #106-#110
  (infrastructure Postgres/Redis/stockage objet, domaine/SMTP, prestataire de paiement, conseil
  juridique, revues Meta/TikTok/GA4 — accès et comptes externes).
- **Étape 0 exécutée (#65-#67)** — les 3 correctifs sans dépendance externe :
  - **RG-A10** : la règle elle-même n'existe nulle part dans ce dépôt (ni dans le code, ni dans
    `DECISIONS.md`) — le document « l'audit » qui la définit n'est pas disponible ici. Interprétation
    retenue, sur la base du seul signal concordant trouvé (numérotation `RG-A*` = règles article,
    `transitionnerArticle` §4.2, le texte du CDC lui-même qualifiant la généralisation future — C5.4,
    chemin critique — de « l'alerte production devient un cas particulier ») : il s'agit de l'alerte de
    marge à la transition `production` (`server/src/services/catalogue.ts`), jusqu'ici un avertissement
    transitoire (perdu à la fermeture de l'écran) — exactement le manque déjà consigné plus haut dans ce
    fichier (« `alerte_production` non automatisée, faute de signal fiable »). Le signal (COGS + prix +
    cible de gamme) est réel, jamais fabriqué (RG-PROV) : il est donc maintenant aussi persisté comme
    notification réelle (`alerte_production`, vers les détenteurs de `approbation.gerer`) en plus de
    l'avertissement transitoire existant, inchangé. Vérifié par transition réelle d'un article
    (COGS/prix forcés sous la cible de gamme) : `POST /articles/:id/transition` → 200, notifications
    `alerte_production` 0→1. **Si cette interprétation ne correspond pas à la définition réelle de
    RG-A10, le corriger est un changement d'une ligne** (la condition qui déclenche la notification).
    En prime : le seuil dupliqué en dur (60/45) dans `OngletCouts.tsx` remplacé par la fonction
    partagée `pastilleMarge()` déjà écrite mais jusqu'ici jamais appelée.
  - **Rappel kit ambassadeur** : piloté auparavant par `pieces.length === 0` sur les ambassadeurs
    `actif` — un champ que rien n'écrit jamais après la création, donc un rappel qui ne pouvait plus
    jamais s'éteindre une fois déclenché une fois (et un filtre `actif` qui exclut justement les
    ambassadeurs `confirme`, l'étape où le kit reste à envoyer). Remplacé par un filtre direct sur
    `statut = "confirme"` (`server/src/lib/scheduler.ts`), qui réutilise le statut `kit_envoye` déjà
    présent dans `STATUT_AMBASSADEUR` et déjà éditable dans Cercle.tsx — le rappel s'éteint dès que le
    statut avance. Vérifié en base : un ambassadeur `confirme` inséré directement, redémarrage du
    serveur (un tour de planificateur au boot) → notification `rappel_kit_ambassadeur` créée pour le
    compte admin.
  - **Taille de pièce de look** : remplacée la convention `note: "Taille: XL"` (texte libre, jamais
    structuré, entièrement reconstituée par une regex côté serveur) par une vraie colonne
    `look_items.taille` (migration `0005`, nullable — cohérent avec `article_skus.taille` lui-même en
    texte libre, pas de normalisation par grille ajoutée ici, hors du périmètre de ce correctif ciblé).
    Mis à jour partout où l'ancienne convention était lue ou écrite : `LooksComposer.tsx` (saisie,
    affichage, duplication de look), `calculerPiecesEffectives` (résolution du SKU à apporter — lit
    maintenant `item.taille` directement), et l'outil agent `ajouter_look` (qui ne portait aucun champ
    taille du tout jusqu'ici). Vérifié bout en bout en Playwright : ajout d'un article de look avec
    taille « 42 » → affiché comme `(42)` dans le look, persisté dans `look_items.taille`, aucune erreur
    console.
  - **Incident d'environnement pendant la vérification (sans conséquence sur le dépôt)** :
    `drizzle-kit generate` a émis un `CREATE TABLE configurations_systeme` en double dans la migration
    `0005` générée — `meta/0004_snapshot.json` manquait (probablement perdu pendant la résolution du
    merge CR-02 Bloc A avec le push parallèle), faisant sauter `0004_configurations_systeme` dans la
    chaîne de snapshots. Reconstruit (`0004_snapshot.json` dérivé de `0005_snapshot.json` moins la
    colonne `taille`, IDs de chaîne recalculés) plutôt que de contourner en éditant le SQL généré sans
    corriger la cause — `db:generate` confirme ensuite « No schema changes » avant application de la
    vraie migration.
  - Non exécutées : #68 (clé IA réelle) et #69 (intégration réelle Meta/TikTok/GA4) exigent des
    identifiants que ce dépôt n'a pas — restent en tâche suivie, pas de simulation.
- **`npm run typecheck` propre sur les trois workspaces** après les trois correctifs.

## Lots 0-1 (prompt du 24 août 2026) — les specs entrent dans le repo, RG-A10 et rappel kit corrigés

### Lot 0 — documents de référence

- Créé `/docs` (avec `docs/README.md` listant les 4 documents attendus et la règle « RG-* se lit ici,
  jamais par déduction — introuvable, s'arrêter et demander »), ajouté la section correspondante au
  `README.md` racine, créé `CLAUDE.md` fixant l'ordre de lecture (`DECISIONS.md` d'abord, puis `/docs`,
  puis le code). **`/docs` reste vide** : c'est au propriétaire de déposer les 4 fichiers
  (`CDC-MASTER-v3.2.md`, `CR-01-ia-agnostique.md`, `CR-02-navigation.md`,
  `CDC-v4-architecture-saas.md`) — rien ne peut être fabriqué à leur place sans recréer exactement le
  problème que ce lot corrige.
- Le Lot 1 a néanmoins pu être exécuté sans attendre ce dépôt : ses deux règles (RG-A10, M27b) ont été
  données texte pour texte dans le prompt lui-même, une source plus directe qu'un fichier à lire.
  L'interprétation de RG-A10 faite en Étape 0 (ci-dessus) était donc bien fausse — corrigée ci-dessous,
  exactement le scénario que le Lot 0 est censé rendre impossible à l'avenir.

### Lot 1.1 — RG-A10, la vraie règle : tâche d'alerte, pas une notification de marge

- L'alerte de marge à la transition `production` (Étape 0) reste en place **sous son propre nom**
  (`alerte_production`, un signal réel et utile) — RG-A10 est une règle différente, sur le calendrier
  de lancement en production face au drop.
- `date_drop` d'un chapitre = **`campagne.date_fin`**, pas `date_debut` : déduit du modèle de rituel
  seedé (`server/src/db/seed.ts`), où le jalon « Drop » est à l'offset **0 de `date_fin`** — c'est la
  seule donnée en base qui tranche sans ambiguïté entre les deux dates candidates.
- Fonctions pures partagées (`shared/src/schemas/catalogue.ts`, même discipline que
  `tacheEnRetard`/`campagneResultatsManquants`) : `limiteLancementProduction(dateDrop,
  delaiProductionJours)` = `dateDrop − delaiProductionJours − 7j`, et
  `alerteLancementProductionRequise(...)` = vrai à partir de **J-7 de cette limite**, tant que
  `statut_cycle` n'a pas atteint `production`.
- Orchestration dans `server/src/lib/scheduler.ts` (`alerteLancementProduction`, nouveau tour horaire) :
  génère une vraie `tache` (`type: "livraison"`, jamais une notification), rattachée à
  `campagne_id` + un nouveau champ **`taches.article_id`** (migration `0006`, nullable — sert
  uniquement de clé d'idempotence pour ce mécanisme, aucune autre tâche n'en porte). Idempotence par
  `(article_id, campagne_id, type=livraison)` avant insertion, jamais recréée.
- **`delai_production_jours` vide → aucune alerte** (RG-PROV) — vérifié sur l'article `SG-05` du seed,
  dont ce champ est `null` : aucune tâche générée, aucune ligne d'erreur, sur deux redémarrages.
- **Assignation** : « au responsable de l'article, ou à défaut aux admins ». Il n'existe aucun champ
  « responsable » sur `articles` — l'inventer aurait violé RG-PROV — donc systématiquement « à défaut
  aux admins », résolus vers leurs `personne_id` (nécessaires pour peupler `assigne_ids`, qui référence
  des personnes, pas des comptes). Dans cet environnement de vérification, le seul compte admin n'a
  pas de `personne_id` lié (créé par l'écran d'initialisation) : `assigne_ids` ressort donc vide — pas
  un bug, la même dégradation honnête que le reste du code applique déjà quand une personne assignée
  n'a pas de compte système.
- Vérifié : arithmétique exacte de la règle rejouée sur l'exemple du prompt (SG-05, délai 21 j, drop
  15/10 → limite calculée 2026-09-17, alerte due à partir du 2026-09-10, pas avant) ; bout en bout avec
  un chapitre/article de test au drop proche (alerte due immédiatement) → tâche créée une fois,
  toujours une seule après un second redémarrage complet du serveur.

### Lot 1.2 — Rappel kit ambassadeur : deux rappels distincts, M27b implémenté

- Renommé le rappel Étape 0 (`statut = confirme`, « le kit n'est pas parti ») en type
  `rappel_kit_a_envoyer` — gardé tel quel, toujours utile, simplement pas la même règle que M27b.
- Ajouté `rappel_post_ambassadeur` (M27b) : `statut = kit_envoye` **et** `posts` vide **et** J+7 ou
  plus après la date de drop de la campagne d'où viennent les pièces du kit. L'ambassadeur ne porte
  aucun `campagne_id` direct dans le schéma — le drop se résout depuis `pieces` (SKU → coloris →
  article → `chapitre_id` → campagne), la même chaîne de jointures déjà utilisée ailleurs dans le code
  (ex. `compterUtilisationsArticle`), pas un champ inventé.
- Les deux rappels sont mutuellement exclusifs par construction (l'un filtre `statut=confirme`, l'autre
  `statut=kit_envoye`) — vérifié en base avec un ambassadeur de chaque statut : le premier ne reçoit
  que `rappel_kit_a_envoyer`, le second que `rappel_post_ambassadeur`.

### Gates du Lot 1 — tous verts

Vérifiés directement en base (SQLite locale, données de test créées et gardées localement, jamais
commitées) plutôt que par l'API, pour isoler la logique métier des surfaces de validation HTTP :
article au délai vide → aucune alerte/aucune erreur (SG-05 réel) ; article/chapitre de test au drop
proche → tâche d'alerte créée une fois, stable sur deux redémarrages ; ambassadeur `kit_envoye`
sans post à J+7 → `rappel_post_ambassadeur` seul ; ambassadeur `confirme` → `rappel_kit_a_envoyer`
seul. `npm run typecheck` propre sur les trois workspaces après le lot complet.
