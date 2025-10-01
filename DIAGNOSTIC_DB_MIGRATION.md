# Diagnostic: Migration Database Replit/Neon → Supabase

## 📊 État actuel des connexions DB

### Connexions actives détectées

1. **Neon/PG (Database Replit)** ❌
   - Host: `ep-dark-mouse-afy8dllh.c-2.us-west-2.aws.neon.tech`
   - Variables d'env: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
   - Fichier: `server/db.ts` utilise `@neondatabase/serverless`
   - Utilisé par: `server/storage.ts` (2798 lignes) via `db` de Drizzle

2. **Supabase** ✅
   - URL: `https://lrnubjkajqylnsiqmhqk.supabase.co`
   - Variables d'env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - Fichier client: `client/src/lib/supabase.ts`
   - Fichier serveur: `server/supabase.ts`

## 🔍 Analyse par endpoint

### ✅ Endpoints utilisant SUPABASE (OK)

| Endpoint | Source DB | Méthode | Ligne |
|----------|-----------|---------|-------|
| `GET /api/user/profile` | **Supabase** `profiles` | `.from('profiles')` | 378 |
| `POST /api/user/coins/update` | **Supabase** `profiles` | `.from('profiles')` | 475 |
| `POST /api/bets/prepare` | **Supabase** `profiles` | `.from('profiles')` | 845 |
| `POST /api/bets/confirm` | **Supabase** `profiles`, `game_stats` | `.from('profiles')`, `.from('game_stats')` | 914, 949 |
| `POST /api/stats` | **Supabase** `game_stats` | `.from('game_stats')` | 1069 |

### ❌ Endpoints utilisant NEON (À migrer)

| Endpoint | Source DB | Appel Storage | Ligne |
|----------|-----------|---------------|-------|
| `PATCH /api/user/profile` | **Neon** | `storage.updateUser()` | 433 |
| `GET /api/user/coins` | **Neon** | `storage.getUser()` | 444 |
| `GET /api/user/gems` | **Neon** | `storage.getUser()` | 505 |
| `POST /api/user/gems/add` | **Neon** | `storage.addGemsToUser()` | 528 |
| `POST /api/user/gems/spend` | **Neon** | `storage.spendGemsFromUser()` | 548 |
| `POST /api/allin/consume-ticket` | **Neon** | `storage.getUser()`, `storage.updateUser()` | 560, 571 |
| `POST /api/shop/gem-purchase` | **Neon** | `storage.getUser()`, `storage.updateUser()` | ~800+ |
| `GET /api/stats/summary` | **Neon** | `storage.getUserStats()` | 1120 |
| `POST /api/shop/purchase` | **Neon** | `storage.getUser()`, `storage.updateUser()`, `storage.createInventory()` | 1789, 1807, 1810 |
| `POST /api/shop/buy-card-back` | **Neon** | `storage.*` | 2380+ |
| `POST /api/shop/mystery-card-back` | **Neon** | `storage.*` | 2498+ |
| `GET /api/friends/search` | **Neon** | `storage.searchUsersByUsername()` | 2649 |
| `POST /api/friends/request` | **Neon** | `storage.sendFriendRequest()` | 2670 |
| `POST /api/friends/accept` | **Neon** | `storage.acceptFriendRequest()` | 2690 |
| `POST /api/friends/reject` | **Neon** | `storage.rejectFriendRequest()` | 2710 |
| `DELETE /api/friends/remove` | **Neon** | `storage.removeFriend()` | ~2720+ |
| `GET /api/friends` | **Neon** | `storage.getFriends()` | ~2735+ |
| `GET /api/friends/requests` | **Neon** | `storage.getFriendRequests()` | ~2746+ |
| `GET /api/challenges/user` | **Neon** | `storage.getUserChallenges()` | ~1400+ |
| `GET /api/battlepass/*` | **Neon** | `storage.*` | ~1700+ |
| `GET /api/leaderboard/*` | **Neon** | `storage.*` | ~1128+ |
| `GET /api/spin/*` | **Neon** | `storage.*` | ~1191+ |

### 📋 Hooks/Store client utilisant fetch directs

| Hook/Store | Endpoint appelé | Type DB |
|------------|-----------------|---------|
| `user-store.ts` | `PATCH /api/user/profile` | ❌ Neon |
| `chips-store.ts` | `POST /api/user/coins/update` | ✅ Supabase |
| `use-betting.ts` | `POST /api/bets/prepare` | ✅ Supabase |
| `game.tsx` | `POST /api/bets/confirm` | ✅ Supabase |

## 🔧 Tables à migrer de Neon → Supabase

### Tables présentes dans Neon (via shared/schema.ts)

```
users → public.profiles (mapping existant)
game_stats → public.game_stats  
inventory → public.inventory (à créer?)
daily_spins → public.daily_spins (à créer?)
achievements → public.achievements (à créer?)
challenges → public.challenges (à créer?)
user_challenges → public.user_challenges (à créer?)
gem_transactions → public.gem_transactions (à créer?)
gem_purchases → public.gem_purchases (à créer?)
seasons → public.seasons (à créer?)
battle_pass_rewards → public.battle_pass_rewards (à créer?)
streak_leaderboard → public.streak_leaderboard (à créer?)
card_backs → public.card_backs (à créer?)
user_card_backs → public.user_card_backs (à créer?)
bet_drafts → public.bet_drafts (à créer?)
all_in_runs → public.all_in_runs (à créer?)
friendships → public.friendships (à créer?)
rank_rewards_claimed → public.rank_rewards_claimed (à créer?)
config → public.config (à créer?)
```

## 🚨 Erreurs détectées dans les logs

```
❌ getUser error: error: column "user_id" does not exist
   at DatabaseStorage.getUser (/home/runner/workspace/server/storage.ts:341:22)

❌ Error getting user challenges: error: column "user_id" of relation "users" does not exist
   at DatabaseStorage.createUser (/home/runner/workspace/server/storage.ts:396:20)
```

**Cause**: Le schéma Drizzle ne correspond pas à la structure Supabase. La table `public.profiles` a `user_id` comme FK vers `auth.users(id)`, mais le schéma Drizzle cherche une colonne qui n'existe pas dans la DB Neon locale.

## 📝 Plan d'action (6 étapes)

1. ✅ **Diagnostic complet** - FAIT
2. ⏳ **Créer adapters Supabase** - Créer `server/adapters/` pour centraliser accès Supabase
3. ⏳ **Migrer endpoints** - Remplacer tous les `storage.*` par appels Supabase directs
4. ⏳ **Script de migration** - Créer `scripts/migrate-to-supabase.ts` pour copier données
5. ⏳ **RLS/Triggers** - Vérifier trigger `auth.users` → `public.profiles`
6. ⏳ **Nettoyage** - Supprimer vars d'env Neon et code mort

## 🎯 Objectif final

- ✅ Toutes les lectures/écritures via Supabase uniquement
- ✅ Plus d'appels à `storage.*` (Neon)
- ✅ Variables d'env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- ✅ Supprimer: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- ✅ Supprimer: `server/db.ts`, `server/storage.ts` (legacy)
