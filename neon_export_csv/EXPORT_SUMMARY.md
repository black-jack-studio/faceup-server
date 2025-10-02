# 📊 Rapport d'Export Neon → CSV

**Date d'export:** 2 octobre 2025  
**Base source:** Neon (neondb@ep-dark-mouse-afy8dllh.c-2.us-west-2.aws.neon.tech)  
**Destination:** Supabase (migration en cours)

---

## ✅ Résumé de l'Export

- **19 tables exportées** avec succès
- **Total des lignes:** 639 lignes de données + headers
- **Format:** CSV avec headers, virgules séparateurs, guillemets échappés

---

## 📋 Détails par Table

| # | Table | Lignes | Colonnes | Statut | Notes |
|---|-------|--------|----------|--------|-------|
| 1 | **users** | 13 | 31 | ✅ | Profils utilisateurs avec coins/gems/XP |
| 2 | **game_stats** | 420 | 15 | ✅ | Statistiques de jeu |
| 3 | **challenges** | 75 | 10 | ✅ | Défis disponibles |
| 4 | **gem_transactions** | 38 | 7 | ✅ | Transactions gems |
| 5 | **gem_purchases** | 38 | 6 | ✅ | Achats avec gems |
| 6 | **user_card_backs** | 12 | 5 | ✅ | Dos de cartes possédés |
| 7 | **card_backs** | 9 | 7 | ✅ | Dos de cartes disponibles |
| 8 | **rank_rewards_claimed** | 8 | 5 | ✅ | Récompenses rang réclamées |
| 9 | **friendships** | 6 | 6 | ✅ | Relations amis |
| 10 | **seasons** | 6 | 7 | ✅ | Saisons battle pass |
| 11 | **user_challenges** | 6 | 8 | ✅ | Progression défis |
| 12 | **config** | 2 | 4 | ✅ | Configuration serveur |
| 13 | **battle_pass_rewards** | 2 | 8 | ✅ | Récompenses réclamées |
| 14 | **inventory** | 0 | 5 | ⚠️ | Vide (header seulement) |
| 15 | **daily_spins** | 0 | 4 | ⚠️ | Vide (header seulement) |
| 16 | **achievements** | 0 | 4 | ⚠️ | Vide (header seulement) |
| 17 | **streak_leaderboard** | 0 | 9 | ⚠️ | Vide (header seulement) |
| 18 | **bet_drafts** | 0 | 7 | ⚠️ | Vide (temporaire) |
| 19 | **all_in_runs** | 0 | 22 | ⚠️ | Vide (nouveau feature) |

---

## 🔍 Points Critiques Identifiés

### ⚠️ Types de colonnes user_id

**Incohérence dans le schéma actuel :**

- **user_challenges.user_id** : `uuid` type ✅ (déjà compatible Supabase)
- **Toutes les autres tables** : `varchar` avec UUID générés

**Action requise pour Supabase:**
- Convertir tous les `user_id` en type `uuid` natif
- Valider que tous les IDs existants sont des UUID valides
- Gérer les foreign keys après import

### 📊 Colonnes essentielles users

```
id, username, email, password (hashé), 
coins, gems, xp, level, season_xp, tickets,
referral_code, referred_by, referral_count,
max_streak_21, current_streak_21,
owned_avatars (jsonb), privacy_settings (jsonb)
```

### 🔐 Données sensibles

- **passwords** : Déjà hashés (bcrypt) ✅
- **stripe_customer_id** / **stripe_subscription_id** : Conservés
- **privacy_settings** : JSONB à préserver

---

## 📁 Fichiers Générés

Tous les fichiers sont dans `neon_export_csv/` :

```
achievements.csv (38 bytes)
all_in_runs.csv (226 bytes)
battle_pass_rewards.csv (425 bytes)
bet_drafts.csv (52 bytes)
card_backs.csv (1.3K)
challenges.csv (17K)
config.csv (267 bytes)
daily_spins.csv (31 bytes)
friendships.csv (1.5K)
game_stats.csv (95K) ← Plus grosse table
gem_purchases.csv (6.3K)
gem_transactions.csv (6.7K)
inventory.csv (41 bytes)
rank_rewards_claimed.csv (1.2K)
seasons.csv (1.5K)
streak_leaderboard.csv (107 bytes)
user_card_backs.csv (2.0K)
user_challenges.csv (1.2K)
users.csv (4.9K)
```

**Taille totale:** ~138K

---

## ➡️ Prochaines Étapes

1. ✅ **Étape 2 complétée** - Export réussi
2. 🔄 **Étape 3 en cours** - Créer schéma Supabase
   - Convertir user_id en UUID partout
   - Créer tables sans FK initialement
   - Activer RLS sur public.profiles
3. ⏳ **Étape 4** - Trigger auto-création profil
4. ⏳ **Étape 5** - Import CSV → Supabase

---

## 🔄 Procédure de Rollback

Si besoin de revenir en arrière :

1. Les fichiers CSV sont **sauvegardes complètes** de Neon
2. Peuvent être réimportés dans Neon si nécessaire
3. Aucune modification sur Neon pour l'instant (lecture seule)

---

**Généré par:** scripts/export-neon-to-csv.ts  
**Commande:** `npx tsx scripts/export-neon-to-csv.ts`
