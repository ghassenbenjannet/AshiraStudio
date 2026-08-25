-- CDC v4, Lot 3.3 — isolation multi-tenant par Row Level Security.
--
-- Appliqué séparément des migrations Drizzle (via `npm run db:rls`, sous le rôle propriétaire/
-- superutilisateur) plutôt que modélisé dans schema.ts : les politiques RLS ne sont pas du DDL de
-- table (colonnes/index/FK) mais une règle de sécurité transverse, et les garder dans un script SQL
-- dédié, lisible d'un bloc, en fait un artefact auditable pour la revue de sécurité plutôt qu'un
-- détail dispersé dans le diff généré par `drizzle-kit generate`. Script idempotent : rejouable sans
-- erreur après chaque nouvelle migration qui ajoute une table métier.
--
-- Chaque politique compare `organisation_id` à `current_setting('app.organisation_id')` — posé une
-- fois par requête HTTP par `executerAvecOrganisation` (`db/client.ts`) via `SET LOCAL`. Si jamais
-- posé (bug applicatif, script hors requête), `current_setting(...)` sans le drapeau `missing_ok`
-- lève une erreur plutôt que de retomber silencieusement sur « toutes les lignes » — un échec bruyant
-- est le seul comportement sûr ici.
--
-- `FORCE ROW LEVEL SECURITY` : le rôle applicatif `achirah_app` n'est ni superutilisateur ni
-- propriétaire des tables (voir README), donc déjà soumis à la RLS sans ce drapeau — il est posé en
-- profondeur de défense, au cas où cette hypothèse de déploiement changerait un jour.


ALTER TABLE "categories_contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories_contact" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "categories_contact";
CREATE POLICY isolation_organisation ON "categories_contact"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "personnes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "personnes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "personnes";
CREATE POLICY isolation_organisation ON "personnes"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "ambassadeurs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ambassadeurs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "ambassadeurs";
CREATE POLICY isolation_organisation ON "ambassadeurs"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "partages_personne" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partages_personne" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "partages_personne";
CREATE POLICY isolation_organisation ON "partages_personne"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "articles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "articles";
CREATE POLICY isolation_organisation ON "articles"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "article_coloris" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "article_coloris" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "article_coloris";
CREATE POLICY isolation_organisation ON "article_coloris"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "article_skus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "article_skus" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "article_skus";
CREATE POLICY isolation_organisation ON "article_skus"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "article_couts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "article_couts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "article_couts";
CREATE POLICY isolation_organisation ON "article_couts"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "historique_statuts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "historique_statuts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "historique_statuts";
CREATE POLICY isolation_organisation ON "historique_statuts"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "campagnes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campagnes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "campagnes";
CREATE POLICY isolation_organisation ON "campagnes"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "campagne_articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campagne_articles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "campagne_articles";
CREATE POLICY isolation_organisation ON "campagne_articles"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "budget_lignes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budget_lignes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "budget_lignes";
CREATE POLICY isolation_organisation ON "budget_lignes"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "taches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "taches" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "taches";
CREATE POLICY isolation_organisation ON "taches"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "shootings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shootings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "shootings";
CREATE POLICY isolation_organisation ON "shootings"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "looks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "looks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "looks";
CREATE POLICY isolation_organisation ON "looks"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "look_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "look_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "look_items";
CREATE POLICY isolation_organisation ON "look_items"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "poses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "poses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "poses";
CREATE POLICY isolation_organisation ON "poses"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "contenus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contenus" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "contenus";
CREATE POLICY isolation_organisation ON "contenus"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "contenu_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contenu_versions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "contenu_versions";
CREATE POLICY isolation_organisation ON "contenu_versions"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "assets";
CREATE POLICY isolation_organisation ON "assets"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "boards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "boards" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "boards";
CREATE POLICY isolation_organisation ON "boards"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "idees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "idees" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "idees";
CREATE POLICY isolation_organisation ON "idees"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "recommandations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recommandations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "recommandations";
CREATE POLICY isolation_organisation ON "recommandations"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "tendances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tendances" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "tendances";
CREATE POLICY isolation_organisation ON "tendances"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "concurrents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concurrents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "concurrents";
CREATE POLICY isolation_organisation ON "concurrents"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "releves_concurrent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "releves_concurrent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "releves_concurrent";
CREATE POLICY isolation_organisation ON "releves_concurrent"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "expressions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expressions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "expressions";
CREATE POLICY isolation_organisation ON "expressions"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "lecons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lecons" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "lecons";
CREATE POLICY isolation_organisation ON "lecons"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "metrique_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "metrique_snapshots" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "metrique_snapshots";
CREATE POLICY isolation_organisation ON "metrique_snapshots"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integrations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "integrations";
CREATE POLICY isolation_organisation ON "integrations"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "brief_quotidien_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brief_quotidien_cache" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "brief_quotidien_cache";
CREATE POLICY isolation_organisation ON "brief_quotidien_cache"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "commentaires" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commentaires" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "commentaires";
CREATE POLICY isolation_organisation ON "commentaires"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "notifications";
CREATE POLICY isolation_organisation ON "notifications"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audits" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "audits";
CREATE POLICY isolation_organisation ON "audits"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "conversations";
CREATE POLICY isolation_organisation ON "conversations"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "messages";
CREATE POLICY isolation_organisation ON "messages"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "agents_campagne" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents_campagne" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "agents_campagne";
CREATE POLICY isolation_organisation ON "agents_campagne"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "actions_agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "actions_agent" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "actions_agent";
CREATE POLICY isolation_organisation ON "actions_agent"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "gammes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gammes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "gammes";
CREATE POLICY isolation_organisation ON "gammes"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "grilles_taille" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grilles_taille" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "grilles_taille";
CREATE POLICY isolation_organisation ON "grilles_taille"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "categories_produit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories_produit" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "categories_produit";
CREATE POLICY isolation_organisation ON "categories_produit"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "coloris" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coloris" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "coloris";
CREATE POLICY isolation_organisation ON "coloris"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "matieres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "matieres" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "matieres";
CREATE POLICY isolation_organisation ON "matieres"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "codes_entretien" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "codes_entretien" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "codes_entretien";
CREATE POLICY isolation_organisation ON "codes_entretien"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "listes_parametrables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listes_parametrables" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "listes_parametrables";
CREATE POLICY isolation_organisation ON "listes_parametrables"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "modeles_checklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modeles_checklist" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "modeles_checklist";
CREATE POLICY isolation_organisation ON "modeles_checklist"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "registres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registres" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "registres";
CREATE POLICY isolation_organisation ON "registres"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "types_campagne" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "types_campagne" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "types_campagne";
CREATE POLICY isolation_organisation ON "types_campagne"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);

ALTER TABLE "modeles_rituel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modeles_rituel" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isolation_organisation ON "modeles_rituel";
CREATE POLICY isolation_organisation ON "modeles_rituel"
  USING ("organisation_id" = current_setting('app.organisation_id')::uuid)
  WITH CHECK ("organisation_id" = current_setting('app.organisation_id')::uuid);
