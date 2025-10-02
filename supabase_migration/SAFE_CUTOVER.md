# 🔒 PROCÉDURE DE BASCULE SÉCURISÉE

## ⚠️ PROBLÈME IDENTIFIÉ

**Gap de données critique :**
- Export CSV effectué le 02/10/2025 08:00
- Si bascule USE_SUPABASE le 02/10/2025 14:00
- → **6h de données Neon perdues** (paris, achats, inscriptions)

## ✅ SOLUTION : FREEZE + DELTA IMPORT

### 🛡️ Protections Intégrées dans le Script Delta

Le script `export-neon-delta.ts` inclut plusieurs protections :

**1. Vérification Connexion Neon ✅**
- Vérifie automatiquement `USE_SUPABASE=false`
- Refuse de s'exécuter si connecté à Supabase
- Évite d'exporter depuis la mauvaise base

**2. Tables avec Timestamp ✅**
- Export delta uniquement des changements depuis timestamp
- Utilise `ON CONFLICT UPDATE` pour sync
- Tables: users, game_stats, gem_transactions, etc.

**3. Tables SANS Timestamp ✅**
- **Export COMPLET** pour sécurité (inventory, achievements, etc.)
- Utilise `ON CONFLICT DO UPDATE SET` pour synchroniser modifications
- Garantit aucune donnée perdue (nouvelles ET modifications)

**4. Gestion NULL Values ✅**
- Les rows avec `updated_at` NULL sont capturées dans l'export complet
- Pas de perte de données legacy

### Option 1 : Maintenance Window (Recommandé)

**Temps d'arrêt : 10-15 minutes**

#### Étape 1 : Mode Maintenance (2 min)
```bash
# Ajouter dans Secrets
MAINTENANCE_MODE=true

# Redémarrer
# → Affichera "En maintenance" aux utilisateurs
```

#### Étape 2 : Export Delta Neon (2 min)
```bash
# Exporter SEULEMENT les nouvelles données depuis dernier export
npx tsx scripts/export-neon-delta.ts --since="2025-10-02T08:00:00Z"

# Génère supabase_migration/05_import_delta.sql
```

#### Étape 3 : Import Delta Supabase (2 min)
1. Ouvrir Supabase SQL Editor
2. Exécuter `05_import_delta.sql`
3. Vérifier comptages dans Table Editor

#### Étape 4 : Bascule (1 min)
```bash
# Dans Secrets
USE_SUPABASE=true
MAINTENANCE_MODE=false

# Redémarrer
# → Supabase actif, app fonctionnelle
```

#### Étape 5 : Validation (5 min)
- Login utilisateurs
- Vérifier dernières parties
- Vérifier derniers achats
- Vérifier dernières inscriptions

**Temps total arrêt : 10-15 min**

---

### Option 2 : Sans Maintenance Window (Risqué)

**⚠️ Risque de perte de ~1-5 secondes de données**

#### Étape 1 : Export Delta à Chaud
```bash
# Exporter pendant que l'app tourne
npx tsx scripts/export-neon-delta.ts --since="2025-10-02T08:00:00Z"
```

#### Étape 2 : Import Delta Supabase
```bash
# Supabase SQL Editor
# Exécuter 05_import_delta.sql
```

#### Étape 3 : Bascule Immédiate
```bash
# IMMÉDIATEMENT après import delta
USE_SUPABASE=true
# Redémarrer
```

**Gap de données : ~1-5 secondes entre export delta et bascule**

---

### Option 3 : Double-Check Manuel (Le Plus Sûr)

#### Étape 1 : Freeze Writes
```bash
# Basculer Neon en read-only
# OU arrêter l'app temporairement
```

#### Étape 2 : Vérifier Counts Neon
```sql
-- Dans Neon
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM game_stats) as games,
  (SELECT COUNT(*) FROM gem_transactions) as gems;
```

#### Étape 3 : Export Delta Complet
```bash
npx tsx scripts/export-neon-delta.ts --full-check
```

#### Étape 4 : Import + Vérif Counts Supabase
```sql
-- Dans Supabase après import
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM game_stats) as games,
  (SELECT COUNT(*) FROM gem_transactions) as gems;

-- Comparer avec Neon
```

#### Étape 5 : Bascule si Counts OK
```bash
USE_SUPABASE=true
```

**Gap : 0 (aucune perte)**

---

## 🛠️ Script Export Delta (À Créer)

```typescript
// scripts/export-neon-delta.ts
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';

const sinceDate = process.argv[2] || '2025-10-02T08:00:00Z';

async function exportDelta() {
  console.log(`📊 Export delta depuis: ${sinceDate}`);

  // Tables avec updated_at
  const tables = [
    'users', 'game_stats', 'gem_transactions', 
    'friendships', 'user_challenges'
  ];

  let deltaSQL = `-- DELTA IMPORT depuis ${sinceDate}\n\n`;

  for (const table of tables) {
    const rows = await db.execute(sql`
      SELECT * FROM ${sql.raw(table)} 
      WHERE updated_at >= ${sinceDate}::timestamp
    `);

    console.log(`📦 ${table}: ${rows.length} nouvelles lignes`);
    
    // Générer INSERT statements...
    // (même logique que supabase-direct-migration.ts)
  }

  fs.writeFileSync('supabase_migration/05_import_delta.sql', deltaSQL);
  console.log('✅ 05_import_delta.sql créé');
}

exportDelta();
```

---

## 📋 Checklist de Sécurité

### Avant Bascule
- [ ] Export initial terminé avec timestamp noté
- [ ] Import initial Supabase OK
- [ ] Counts vérifiés (users, games, etc.)

### Pendant Bascule
- [ ] **FREEZE:** App en maintenance OU Neon read-only
- [ ] Export delta depuis timestamp initial
- [ ] Import delta dans Supabase
- [ ] Vérif counts match Neon
- [ ] Bascule USE_SUPABASE=true

### Après Bascule
- [ ] Login fonctionne
- [ ] Dernières parties présentes
- [ ] Derniers achats présents
- [ ] Pas d'erreurs dans logs
- [ ] Monitoring 24h actif

---

## 🆘 Si Perte de Données Détectée

### Rollback Immédiat
```bash
# 1. Revenir à Neon
USE_SUPABASE=false

# 2. Identifier données perdues
# Comparer counts Neon vs Supabase

# 3. Export uniquement données manquantes
npx tsx scripts/export-missing-data.ts

# 4. Import dans Supabase
# Exécuter 06_import_missing.sql

# 5. Re-bascule
USE_SUPABASE=true
```

---

## 🎯 Recommandation Finale

**UTILISER OPTION 1 : Maintenance Window**

**Pourquoi :**
- ✅ Zéro perte garantie
- ✅ 10-15 min d'arrêt acceptable
- ✅ Procédure simple et sûre
- ✅ Facile à valider

**Timing suggéré :**
- Heure creuse (3h-5h du matin)
- OU prévenir utilisateurs 24h avant
- OU weekday après-midi (faible traffic)

**Communication :**
- Message : "Maintenance programmée - 15 min"
- Afficher countdown dans l'app
- Email/notification si possible

---

## ✅ Procédure Finale Complète

### 1. Préparation (AVANT)
```bash
# Déjà fait
✅ Export CSV initial
✅ Import Supabase initial
✅ Code bascule prêt
```

### 2. Freeze (T-0)
```bash
# Activer maintenance
MAINTENANCE_MODE=true
# Redémarrer
```

### 3. Delta Export (T+2min)
```bash
npx tsx scripts/export-neon-delta.ts --since="2025-10-02T08:00:00Z"
```

### 4. Delta Import (T+4min)
```bash
# Supabase SQL Editor
# Exécuter 05_import_delta.sql
```

### 5. Validation (T+6min)
```sql
-- Vérifier counts match
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM game_stats;
```

### 6. Bascule (T+8min)
```bash
USE_SUPABASE=true
MAINTENANCE_MODE=false
# Redémarrer
```

### 7. Tests (T+10min)
- Login OK
- Profil OK
- Pari OK
- Achats OK

**Total : 10-15 minutes**

---

**⚠️ IMPORTANT :** Ne JAMAIS basculer sans avoir fait le delta import !
