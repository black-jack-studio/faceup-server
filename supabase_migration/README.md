# 📋 INSTRUCTIONS DE MIGRATION SUPABASE

## Étapes à Suivre

### Option 1: Exécution Automatique (Recommandé)
1. Ouvrez Supabase → SQL Editor
2. Copiez tout le contenu de **01_create_tables.sql**
3. Exécutez le script
4. Copiez tout le contenu de **04_import_data.sql**
5. Exécutez le script
6. Copiez tout le contenu de **02_create_trigger.sql**
7. Exécutez le script
8. Copiez tout le contenu de **03_add_foreign_keys.sql**
9. Exécutez le script

### Option 2: Fichier par Fichier
Exécutez dans cet ordre:
1. ✅ 01_create_tables.sql - Crée les 19 tables
2. ✅ 04_import_data.sql - Importe ~639 lignes
3. ✅ 02_create_trigger.sql - Configure auto-inscription
4. ✅ 03_add_foreign_keys.sql - Ajoute les relations

## Fichiers Créés

- **00_MASTER_MIGRATION.sql**: Script principal (si \i supporté)
- **01_create_tables.sql**: Création des tables (400+ lignes)
- **02_create_trigger.sql**: Trigger d'auto-inscription
- **03_add_foreign_keys.sql**: Foreign keys
- **04_import_data.sql**: Import des données (généré dynamiquement)

## Vérification

Après exécution, vérifiez dans Supabase:
1. Table Editor → 19 tables créées
2. Données présentes (users: 13 lignes, game_stats: 420 lignes, etc.)
3. Auth → Trigger actif sur auth.users

## Rollback

Si problème, supprimez toutes les tables:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Puis réexécutez les scripts.
