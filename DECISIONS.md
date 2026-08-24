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
