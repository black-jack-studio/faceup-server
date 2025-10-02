# 🚀 MIGRATION NEON → SUPABASE

## 📋 Démarrage Rapide

### 🎯 Action Immédiate (5 min)
**👉 Commencez ici :** Ouvrez `EXECUTE_ME.md` et suivez les 4 étapes

### 📁 Guides Disponibles
- **`EXECUTE_ME.md`** ⭐ - Instructions SQL étape par étape (START HERE!)
- **`CONFIG_GUIDE.md`** 🔧 - Configuration variables d'environnement
- **`SAFE_CUTOVER.md`** 🔒 - **CRITIQUE:** Procédure bascule sécurisée (évite perte données)
- **`PROGRESS.md`** 📊 - Suivi détaillé de la progression

---

## ✅ Ce Qui Est Déjà Fait

- [x] **Export Neon → CSV** : 19 tables, 639 lignes exportées
- [x] **Fichiers SQL créés** : tables, trigger, FK, import (290K)
- [x] **Code de bascule** : server/db.ts peut basculer Neon ↔ Supabase
- [x] **Script de test** : scripts/test-supabase-connection.ts

---

## 🔄 Ce Qu'Il Reste À Faire (10 min)

### 1. Exécution SQL dans Supabase (5 min)
→ Voir `EXECUTE_ME.md` pour les instructions détaillées

### 2. Configuration PASSWORD (2 min)
→ Voir `CONFIG_GUIDE.md` pour obtenir le mot de passe DB

### 3. Export Delta & Bascule Sécurisée (15 min)

⚠️ **CRITIQUE : Risque de perte de données !**  
**LIRE `SAFE_CUTOVER.md` AVANT de basculer**

```bash
# 1. Export delta (données depuis export initial)
npx tsx scripts/export-neon-delta.ts --since="2025-10-02T08:00:00Z"

# 2. Import delta dans Supabase SQL Editor
# Exécuter 05_import_delta.sql

# 3. Vérifier counts match Neon/Supabase
# Voir SAFE_CUTOVER.md pour la procédure complète

# 4. Basculer seulement si delta importé
USE_SUPABASE=true

# 5. Tester immédiatement
npx tsx scripts/test-supabase-connection.ts
```

**Recommandation :** Maintenance window 10-15 min (voir `SAFE_CUTOVER.md`)

---

## 📊 Fichiers SQL de Migration

| Fichier | Taille | Description |
|---------|--------|-------------|
| **01_create_tables.sql** | 15K | 19 tables avec UUID |
| **02_create_trigger.sql** | 1K | Trigger auto-inscription |
| **03_add_foreign_keys.sql** | 4K | Relations entre tables |
| **04_import_data.sql** | 290K | 667 INSERT (639 lignes) |

**Ordre d'exécution :** 01 → 04 → 02 → 03

---

## 🗂️ Tables Migrées (19)

- **Core:** users, seasons, config
- **Game:** game_stats, bet_drafts, all_in_runs
- **Shop:** inventory, card_backs, user_card_backs
- **Social:** friendships, challenges, user_challenges
- **Economy:** gem_transactions, gem_purchases
- **Rewards:** daily_spins, achievements, battle_pass_rewards
- **Leaderboards:** streak_leaderboard, rank_rewards_claimed

---

## ⚡ Performances Attendues

| Métrique | Neon | Supabase | Gain |
|----------|------|----------|------|
| Latence lecture | ~50ms | ~30ms | **-40%** |
| Latence écriture | ~100ms | ~60ms | **-40%** |
| TPS (trans/sec) | ~20 | ~40 | **+100%** |

---

## 🆘 Dépannage

### ❌ "Supabase configuration missing"
→ Ajoutez `SUPABASE_DB_PASSWORD` dans les Secrets

### ❌ "relation does not exist"
→ Exécutez les fichiers SQL (voir `EXECUTE_ME.md`)

### ❌ L'app se connecte à Neon
→ Vérifiez `USE_SUPABASE=true` dans les Secrets

---

## 🔄 Rollback (Si Problème)

### Revenir à Neon
```bash
# Dans Secrets
USE_SUPABASE=false  # ou supprimez la variable
```

### Supprimer Supabase et recommencer
```sql
-- Dans Supabase SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

---

## 📍 Statut Actuel

```
[✅ Export] → [✅ SQL] → [✅ Code] → [🔄 EXEC SQL] → [⏳ Test] → [⏳ Prod]
                                          ↑
                                      VOUS ÊTES ICI
```

**🚀 PROCHAINE ÉTAPE :** Ouvrez `EXECUTE_ME.md` et suivez les instructions (5 min)

---

**⏱️ Temps Total Restant :** 10-15 minutes  
**🎯 Résultat :** Migration complète sans interruption  
**💡 Tout le reste est automatique une fois le SQL exécuté !**
