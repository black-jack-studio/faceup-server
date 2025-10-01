# Migration Progress Report - Supabase Adapters

## ✅ Endpoints Migrés (20/80+)

### User Profile & Coins
- ✅ `PATCH /api/user/profile` → `ProfileAdapter.updateProfile()`
- ✅ `GET /api/user/coins` → `ProfileAdapter.getProfile()`
- ✅ `POST /api/user/coins/update` → Supabase direct (déjà fait)

### Gems & Transactions
- ✅ `GET /api/user/gems` → `ProfileAdapter.getProfile()`
- ✅ `POST /api/user/gems/add` → `ProfileAdapter.updateGems()` + `GemsAdapter.createGemTransaction()`
- ✅ `POST /api/user/gems/spend` → `ProfileAdapter.updateGems()` + `GemsAdapter.createGemTransaction()`
- ✅ `GET /api/user/gems/transactions` → `GemsAdapter.getUserGemTransactions()`
- ✅ `GET /api/user/gems/purchases` → `GemsAdapter.getUserGemPurchases()`

### All-in & Tickets
- ✅ `POST /api/allin/consume-ticket` → `ProfileAdapter.updateTickets()`

### Shop & Inventory
- ✅ `POST /api/shop/purchase` → `ProfileAdapter` + `InventoryAdapter.addInventoryItem()`
- ✅ `GET /api/inventory` → `InventoryAdapter.getUserInventory()`
- ✅ `GET /api/inventory/card-backs` → `InventoryAdapter.getUserInventory()`

### Stats
- ✅ `GET /api/stats/summary` → `StatsAdapter.getStats()`
- ✅ `POST /api/stats` → Supabase direct (déjà fait)

### Friends (8 endpoints)
- ✅ `GET /api/friends/search` → `ProfileAdapter.searchProfiles()`
- ✅ `POST /api/friends/request` → `FriendsAdapter.sendFriendRequest()`
- ✅ `POST /api/friends/accept` → `FriendsAdapter.acceptFriendRequest()`
- ✅ `POST /api/friends/reject` → `FriendsAdapter.rejectFriendRequest()`
- ✅ `DELETE /api/friends/remove` → `FriendsAdapter.removeFriend()`
- ✅ `GET /api/friends` → `FriendsAdapter.getFriends()`
- ✅ `GET /api/friends/requests` → `FriendsAdapter.getFriendRequests()`
- ✅ `GET /api/friends/check` → `FriendsAdapter.checkFriendship()`

### Bets (déjà fait précédemment)
- ✅ `POST /api/bets/prepare` → Supabase direct
- ✅ `POST /api/bets/confirm` → Supabase direct

## ❌ Endpoints Restants (à migrer)

### User Profile & Settings
- ❌ `POST /api/user/change-username` → `storage.getUserByUsername()`, `storage.updateUser()`
- ❌ `POST /api/user/select-card-back` → `storage.getUser()`, `storage.updateUser()`
- ❌ `GET /api/user/selected-card-back` → `storage.getUser()`, `storage.getCardBack()`

### Challenges (~8 endpoints)
- ❌ `GET /api/challenges` → `storage.getChallenges()`
- ❌ `GET /api/challenges/user` → `storage.getUserChallenges()`
- ❌ `POST /api/challenges/progress` → `storage.updateChallengeProgress()`
- ❌ `POST /api/challenges/complete` → `storage.completeChallengeForUser()`
- ❌ `POST /api/challenges/claim-reward` → `storage.markChallengeRewardAsClaimed()`
- ❌ `DELETE /api/challenges/user/:id` → `storage.removeUserChallenge()`
- ❌ `POST /api/challenges/cleanup` → `storage.cleanupExpiredChallenges()`
- ❌ `GET /api/challenges/time-until-reset` → calcul seulement

### Leaderboards (~3 endpoints)
- ❌ `GET /api/leaderboard/weekly-streak` → `storage.getWeeklyStreakLeaderboard()`
- ❌ `GET /api/leaderboard/premium-weekly-streak` → `storage.getPremiumWeeklyStreakLeaderboard()`
- ❌ `GET /api/leaderboard/top50-streak` → `storage.getTop50StreakLeaderboard()`
- ❌ `POST /api/leaderboard/update-weekly-streak` → `storage.updateWeeklyStreakEntry()`

### Daily Spin (~4 endpoints)
- ❌ `GET /api/spin/can-spin` → `storage.canUserSpin()`
- ❌ `POST /api/spin` → `storage.createDailySpin()`
- ❌ `GET /api/spin/status` → `storage.getSpinStatus()`
- ❌ `POST /api/spin/wheel` → `storage.createSpin()`

### Battle Pass (~5 endpoints)
- ❌ `GET /api/battlepass/current-season` → `storage.getCurrentSeason()`
- ❌ `POST /api/battlepass/add-xp` → `storage.addSeasonXPToUser()`
- ❌ `GET /api/battlepass/time-until-end` → `storage.getTimeUntilSeasonEnd()`
- ❌ `POST /api/battlepass/claim-tier` → `storage.claimBattlePassTier()`, `storage.getUser()`
- ❌ `GET /api/battlepass/claimed-tiers` → `storage.getClaimedBattlePassTiers()`

### Card Backs (~6 endpoints)
- ❌ `GET /api/card-backs` → `storage.getAllCardBacks()`
- ❌ `GET /api/user/card-backs` → `storage.getUserCardBacks()`
- ❌ `POST /api/shop/buy-card-back` → `storage.*` multiple
- ❌ `POST /api/shop/card-backs/:id/buy` → `storage.*` multiple
- ❌ `POST /api/shop/mystery-card-back` → `storage.*` multiple
- ❌ `GET /api/shop/card-backs` → `storage.getAllCardBacks()`

### Ranks & Achievements (~5 endpoints)
- ❌ `GET /api/ranks/claimed-rewards` → `storage.getUserClaimedRankRewards()`
- ❌ `POST /api/ranks/claim-reward` → `storage.*` multiple
- ❌ `GET /api/achievements` → `storage.getUserAchievements()`
- ❌ `POST /api/achievements` → `storage.createAchievement()`

### Referral System (~3 endpoints)
- ❌ `GET /api/referral/my-code` → `storage.getUser()`
- ❌ `POST /api/referral/use-code` → `storage.*` multiple
- ❌ `GET /api/referral/stats` → `storage.*` multiple

### Gem Purchase & Stripe (~3 endpoints)
- ❌ `POST /api/gems/purchase` → `storage.getUser()`, `storage.*` multiple
- ❌ `POST /api/shop/gem-purchase` → `storage.getUser()`, `storage.updateUser()`

### PayPal Integration (~3 endpoints)
- ❌ `POST /api/paypal/create-order` → `storage.getUser()`
- ❌ `POST /api/paypal/capture-order` → `storage.*` multiple

### Seasons (~2 endpoints)
- ❌ `GET /api/seasons/info` → `storage.*`
- ❌ `POST /api/seasons/check-and-reset` → `storage.*`

### All-In Game (~2 endpoints)
- ❌ `POST /api/allin/start` → `storage.*`
- ❌ `POST /api/allin/action` → `storage.*`

### Bet Drafts (~2 endpoints)
- ❌ `POST /api/bets/draft` → `storage.*`
- ❌ `POST /api/bets/cancel` → `storage.getBetDraft()`, `storage.deleteBetDraft()`

## 📊 Statistiques

- **Endpoints migrés**: 20
- **Endpoints restants**: ~60+
- **Adapters créés**: 5 (Profile, Stats, Friends, Inventory, Gems)
- **Adapters manquants**: ~10+ (Challenges, Leaderboard, Spin, BattlePass, CardBacks, etc.)

## 🚧 Prochaines Étapes

1. **Créer adapters manquants** pour:
   - Challenges
   - Leaderboard/Streak
   - Daily Spin
   - Battle Pass
   - Card Backs
   - Achievements
   - Seasons
   
2. **Migrer endpoints par groupe** (par ordre de priorité):
   - Challenges (utilisés fréquemment)
   - Leaderboards (visibles sur homepage)
   - Battle Pass (feature majeure)
   - Card Backs (shop)
   - Daily Spin (engagement quotidien)
   
3. **Tester chaque groupe** après migration

4. **Supprimer code mort** une fois tous les endpoints migrés
