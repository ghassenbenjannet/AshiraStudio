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
cp server/.env.example server/.env   # renseigner ENCRYPTION_KEY au minimum
npm run db:migrate

# Deux processus séparés en dev (le serveur sert le build en prod uniquement)
npm run dev:server   # http://localhost:3000
npm run dev:front    # http://localhost:5173 (proxy /api vers le serveur)
```

Au premier lancement, ouvrir le front : l'écran d'initialisation crée le premier compte admin et
applique le seed complet (référentiels, campagne Chapitre I — AL AWWAL, 14 articles, tâches,
lexique initial — Annexes A-F du CDC).

## Démarrer avec Docker

Docker Compose construit le front et le serveur dans une image unique. La base SQLite, les fichiers
envoyés et les sauvegardes sont conservés dans des volumes Docker. Les migrations sont appliquées
automatiquement avant chaque démarrage du serveur.

```bash
cp .env.docker.example .env
# Renseigner ENCRYPTION_KEY dans .env (32 octets / 64 caractères hexadécimaux)
docker compose up --build -d
```

L'application est ensuite disponible sur <http://localhost:3000>. Pour suivre son démarrage :

```bash
docker compose logs -f app
```

Après la création du premier compte, les connexions Shopify/Meta/TikTok/GA4 et la clé Anthropic se
configurent dans **Paramètres → Intégrations & IA** avec un compte administrateur. Ces secrets sont
chiffrés en base ; seule la clé maîtresse `ENCRYPTION_KEY` reste dans le fichier `.env` du serveur.

Pour arrêter l'application sans effacer ses données :

```bash
docker compose down
```

`docker compose down -v` supprime aussi les volumes et donc les données persistantes.

## État d'avancement

Construction en cours dans l'ordre de dépendance de la Partie X du CDC :
① socle → ② référentiels → ③ pilotage → ④ création → ⑤ IA → ⑥ mesure & croissance → ⑦ transverses.
