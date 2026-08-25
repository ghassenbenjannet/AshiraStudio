# Achirah HQ

Outil de pilotage complet pour une marque de vêtements (drops/« chapitres », atelier, shootings,
contenu social FR/derja/AR, ambassadeurs, IA sous contrôle humain). Construit à partir du
Cahier des Charges Master v3.1 — voir `DECISIONS.md` pour les choix pris sur les points
d'ambiguïté résiduelle du CDC.

## Stack

- **Front** : React 18 + Vite + TypeScript + Tailwind (`/front`)
- **Serveur** : Hono + TypeScript sur Node ≥20, sert aussi le front statique — un seul processus
  déployé (`/server`)
- **Base de données** : SQLite + Drizzle ORM
- **Partagé** : schémas Zod + constantes, source unique des patterns (`/shared`)

## Démarrer en développement

```bash
npm install

# Base de données
cp server/.env.example server/.env   # rien à renseigner pour démarrer — voir plus bas
npm run db:migrate

# Deux processus séparés en dev (le serveur sert le build en prod uniquement)
npm run dev:server   # http://localhost:3000
npm run dev:front    # http://localhost:5173 (proxy /api vers le serveur)
```

Au premier lancement, ouvrir le front : l'écran d'initialisation crée le premier compte admin et
applique le seed complet (référentiels, campagne Chapitre I — AL AWWAL, 14 articles, tâches,
lexique initial — Annexes A-F du CDC).

**Aucune variable d'environnement n'est requise pour démarrer** (`DATABASE_PATH` mise à part, déjà
par défaut) : au tout premier démarrage, si `ENCRYPTION_KEY` est absente, elle est générée
automatiquement (`server/data/encryption.key`) et affichée une seule fois dans les logs —
**sauvegardez-la**, elle chiffre tous les identifiants enregistrés depuis l'interface. Tout le
reste (clé IA, SMTP, notifications push, intégrations Shopify/Meta/TikTok/GA4, stockage fichiers,
supervision, sauvegardes) se configure ensuite dans **Paramètres → Configuration**, sans redémarrage.

## Démarrer avec Docker

Docker Compose construit le front et le serveur dans une image unique. La base SQLite, les fichiers
envoyés et les sauvegardes sont conservés dans des volumes Docker. Les migrations sont appliquées
automatiquement avant chaque démarrage du serveur.

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
