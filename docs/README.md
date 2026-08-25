# Documents de référence

Ce dossier est la source unique de vérité pour toute règle `RG-*`, tout comportement attendu, et
toute décision de produit. Il n'est **pas encore versionné avec le code** : le propriétaire doit y
déposer les quatre documents suivants (noms de fichier exacts) avant que les lots qui en dépendent
puissent être exécutés sans interprétation :

- `CDC-MASTER-v3.2.md` — le produit (le Cahier des Charges Master)
- `CR-01-ia-agnostique.md` — abstraction du fournisseur IA
- `CR-02-navigation.md` — la campagne comme monde, pilotage contextuel
- `CDC-v4-architecture-saas.md` — architecture cible multi-locataire

## Règle permanente

Toute règle `RG-*` se **lit** ici, jamais par déduction depuis le code existant ou depuis une
implémentation antérieure. Si une règle citée dans une demande est introuvable dans ces documents :
**s'arrêter et demander** — ne jamais l'interpréter ni la reconstruire depuis son nom ou son
comportement observé ailleurs dans le code.

(Historique : cette règle existe parce que `RG-A10` a dû être interprétée faute de document
source versionné — voir `DECISIONS.md`, section CDC v4 Étape 0, puis sa correction dans la section
Lot 0/1.)
