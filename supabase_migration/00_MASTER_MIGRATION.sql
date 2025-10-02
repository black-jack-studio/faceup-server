-- ============================================
-- MASTER MIGRATION FILE
-- Exécutez ce fichier dans Supabase SQL Editor
-- Il va tout faire dans l'ordre
-- ============================================

-- Étape 1: Créer les tables
\i 01_create_tables.sql

-- Étape 2: Importer les données
\i 04_import_data.sql

-- Étape 3: Créer le trigger
\i 02_create_trigger.sql

-- Étape 4: Ajouter les foreign keys
\i 03_add_foreign_keys.sql

-- FIN DE LA MIGRATION
