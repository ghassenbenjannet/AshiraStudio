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
