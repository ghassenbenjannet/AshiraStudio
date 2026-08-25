# Achirah HQ

Outil de pilotage complet pour une marque de vêtements (drops/« chapitres », atelier, shootings,
contenu social FR/derja/AR, ambassadeurs, IA sous contrôle humain). Construit à partir du
Cahier des Charges Master v3.1 — voir `DECISIONS.md` pour les choix pris sur les points
d'ambiguïté résiduelle du CDC.

## Stack

- **Front** : React 18 + Vite + TypeScript + Tailwind (`/front`)
- **Serveur** : Hono + TypeScript sur Node ≥20, sert aussi le front statique — un seul processus
  déployé (`/server`)
- **Base de données** : PostgreSQL + Drizzle ORM — isolation multi-organisation par Row Level
  Security (§ Multi-organisation ci-dessous)
- **Partagé** : schémas Zod + constantes, source unique des patterns (`/shared`)

## Démarrer en développement

Un serveur PostgreSQL 16 local est requis (pas de conteneur en dev — voir « Démarrer avec Docker »
pour un PostgreSQL fourni automatiquement).

```bash
npm install

# Base de données — une fois, sur un PostgreSQL local déjà démarré (ex. `service postgresql start`
# ou installation locale). Crée la base et le rôle applicatif dédié (RLS, Lot 3.3), puis les tables
# et les politiques d'isolation par organisation.
createdb achirah
cp server/.env.example server/.env   # ajuster DATABASE_URL/DATABASE_URL_ADMIN si besoin
npm run db:provision-role --workspace=server
npm run db:migrate --workspace=server
npm run db:rls --workspace=server

# Deux processus séparés en dev (le serveur sert le build en prod uniquement)
npm run dev:server   # http://localhost:3000
npm run dev:front    # http://localhost:5173 (proxy /api vers le serveur)
```

Au premier lancement, ouvrir le front : l'écran d'initialisation crée la première organisation et
son premier compte admin, puis applique le seed complet (référentiels, campagne Chapitre I — AL
AWWAL, 14 articles, tâches, lexique initial — Annexes A-F du CDC).

**Aucune variable d'environnement n'est requise pour démarrer** hormis `DATABASE_URL` (déjà par
défaut pour un PostgreSQL local standard) : au tout premier démarrage, si `ENCRYPTION_KEY` est
absente, elle est générée automatiquement (`server/data/encryption.key`) et affichée une seule fois
dans les logs — **sauvegardez-la**, elle chiffre tous les identifiants enregistrés depuis
l'interface. Tout le reste (clé IA, SMTP, notifications push, intégrations Shopify/Meta/TikTok/GA4,
stockage fichiers, supervision, sauvegardes) se configure ensuite dans **Paramètres → Configuration**,
sans redémarrage.

## Multi-organisation

Un compte (`utilisateurs`, identité globale) peut appartenir à plusieurs organisations (`membres`,
avec un rôle propre à chacune). Chaque table métier porte un `organisation_id` et est protégée par
une politique PostgreSQL Row Level Security (RLS) : le serveur pose `SET LOCAL app.organisation_id`
au début de chaque requête authentifiée (`middleware/auth.ts` → `avecOrganisation`,
`db/client.ts` → `executerAvecOrganisation`) — l'isolation entre organisations est appliquée par la
base de données elle-même, pas seulement par le code applicatif. Le serveur se connecte sous le
rôle dédié `achirah_app` (ni superutilisateur ni propriétaire des tables — condition pour que la RLS
s'applique réellement, voir `server/src/db/provision-role.ts`). Un sélecteur d'organisation pour un
compte membre de plusieurs (bascule à la connexion, aujourd'hui la plus ancienne appartenance est
retenue) est prévu à une couche ultérieure (voir `DECISIONS.md`).

## Démarrer avec Docker

Docker Compose construit le front et le serveur dans une image unique et démarre un service
PostgreSQL 16 dédié. La base, les fichiers envoyés et les sauvegardes sont conservés dans des
volumes Docker. Avant chaque démarrage du serveur, le rôle applicatif est provisionné, les
migrations sont appliquées et les politiques RLS (Lot 3.3) sont posées automatiquement.

```bash
cp .env.docker.example .env
docker compose up --build -d
```

L'application est ensuite disponible sur <http://localhost:3000>. Pour suivre son démarrage :

```bash
docker compose logs -f app
```

Au premier démarrage, une clé de chiffrement est générée automatiquement et affichée une seule fois
dans ces logs — sauvegardez-la (voir plus haut). Après la création du premier compte, tout le reste
(clé IA, emails, notifications push, connexions Shopify/Meta/TikTok/GA4, stockage fichiers,
supervision, sauvegardes) se configure dans **Paramètres → Configuration** avec un compte
administrateur — ces secrets sont chiffrés en base, jamais dans `.env`.

Pour arrêter l'application sans effacer ses données :

```bash
docker compose down
```

`docker compose down -v` supprime aussi les volumes et donc les données persistantes.

## Documents de référence

Toute règle `RG-*` se lit dans [`/docs`](./docs) — jamais par déduction depuis le code existant.
Si une règle citée est introuvable dans ces documents, s'arrêter et demander, ne jamais
l'interpréter. Voir [`docs/README.md`](./docs/README.md) pour la liste des documents attendus.

## État d'avancement

Construction en cours dans l'ordre de dépendance de la Partie X du CDC :
① socle → ② référentiels → ③ pilotage → ④ création → ⑤ IA → ⑥ mesure & croissance → ⑦ transverses.
