# 🚀 MIGRATION SUPABASE - EXÉCUTION RAPIDE

## ⏱️ Temps estimé : 5 minutes

### 📋 Étapes à Suivre (Dans l'Ordre)

---

## 1️⃣ Créer les Tables (2 min)

1. Ouvrez votre projet Supabase : https://supabase.com/dashboard
2. Cliquez sur **SQL Editor** (menu gauche)
3. Cliquez sur **"New query"**
4. Copiez **TOUT** le contenu du fichier : `01_create_tables.sql`
5. Collez dans l'éditeur SQL
6. Cliquez sur **"Run"** (ou Ctrl+Enter)
7. ✅ Vous devriez voir : "Success. No rows returned"

---

## 2️⃣ Importer les Données (2 min)

1. Toujours dans **SQL Editor**, créez une **nouvelle requête** (New query)
2. Copiez **TOUT** le contenu du fichier : `04_import_data.sql`
   - ⚠️ Ce fichier est gros (667 lignes, 290K)
   - C'est normal, il contient tous vos utilisateurs et données
3. Collez dans l'éditeur SQL
4. Cliquez sur **"Run"**
5. ✅ Attendez ~10-30 secondes
6. ✅ Vérifiez dans **Table Editor** → vous devez voir 19 tables avec des données

---

## 3️⃣ Créer le Trigger d'Auto-Inscription (30 sec)

1. Nouvelle requête dans **SQL Editor**
2. Copiez le contenu de : `02_create_trigger.sql`
3. Collez et **Run**
4. ✅ Vous devriez voir : "Success"

---

## 4️⃣ Ajouter les Foreign Keys (30 sec)

1. Nouvelle requête dans **SQL Editor**
2. Copiez le contenu de : `03_add_foreign_keys.sql`
3. Collez et **Run**
4. ✅ Vous devriez voir : "Success"

---

## ✅ Vérification Rapide

Allez dans **Table Editor** (menu gauche) et vérifiez :

- ✅ **users** : 13 lignes
- ✅ **game_stats** : 420 lignes
- ✅ **challenges** : 75 lignes
- ✅ **seasons** : 6 lignes
- ✅ **gem_transactions** : 38 lignes

Si vous voyez ces données → **Migration réussie !** ✨

---

## 🆘 En Cas de Problème

### Erreur "already exists"
→ Normal ! Ça signifie que la table/index existe déjà. Continuez.

### Erreur "duplicate key value violates unique constraint"
→ Normal ! Le SQL contient `ON CONFLICT DO NOTHING`, ça ignore les doublons.

### Erreur "relation does not exist"
→ Vous avez sauté l'étape 1. Retournez créer les tables.

### Erreur "foreign key constraint"
→ Exécutez les fichiers dans l'ordre : 01 → 04 → 02 → 03

---

## 📁 Ordre des Fichiers

1. `01_create_tables.sql` - Tables
2. `04_import_data.sql` - Données  
3. `02_create_trigger.sql` - Trigger
4. `03_add_foreign_keys.sql` - FK

---

## 🔄 Rollback (Si Besoin)

Pour tout supprimer et recommencer :

\`\`\`sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
\`\`\`

Puis réexécutez les 4 étapes.

---

## ➡️ Après la Migration

Une fois terminé, **confirmez-moi** simplement avec "Migration Supabase OK" et je continuerai automatiquement avec :

- ✅ Étape 7 : Configuration du data layer dual-write
- ✅ Étape 8 : Bascule progressive Neon → Supabase
- ✅ Étape 9 : Vérifications complètes
- ✅ Étape 10 : Rapport final

---

**📍 Vous êtes actuellement ici :**  
✅ Étape 1-2 : Export Neon terminé  
✅ Étape 3 : Fichiers SQL créés  
🔄 **Étape 4-6 : EXÉCUTION EN COURS (vous)**  
⏳ Étape 7-10 : En attente de confirmation

---

💡 **Astuce :** Ouvrez les fichiers SQL dans un éditeur de texte pour les copier plus facilement (VS Code, Notepad++, etc.)
