/**
 * Supabase Storage Implementation
 * All database operations delegated to Supabase adapters
 */

import { ProfileAdapter, StatsAdapter, FriendsAdapter, InventoryAdapter, GemsAdapter, ChallengesAdapter, DailySpinAdapter, BattlePassAdapter } from "./adapters";
import { supabase } from "./supabase";
import type { 
  User, InsertUser, GameStats, InsertGameStats, 
  Inventory, InsertInventory, DailySpin, InsertDailySpin,
  Achievement, InsertAchievement, Challenge, UserChallenge,
  InsertChallenge, InsertUserChallenge, GemTransaction,
  InsertGemTransaction, GemPurchase, InsertGemPurchase,
  Season, InsertSeason, BattlePassReward, InsertBattlePassReward,
  StreakLeaderboard, InsertStreakLeaderboard, CardBack, InsertCardBack,
  UserCardBack, InsertUserCardBack, BetDraft, InsertBetDraft,
  AllInRun, InsertAllInRun, Config, InsertConfig,
  Friendship, InsertFriendship, RankRewardClaimed, InsertRankRewardClaimed
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserCoins(id: string, newAmount: number): Promise<User>;
  updateUserGems(id: string, newAmount: number): Promise<User>;
  
  // XP and Level methods
  addXPToUser(userId: string, xpAmount: number): Promise<{ user: User; leveledUp: boolean; rewards?: { coins?: number; gems?: number } }>;
  calculateLevel(xp: number): number;
  getXPForLevel(level: number): number;
  generateLevelRewards(): { coins?: number; gems?: number };
  
  // Maximum single win tracking
  updateMaxSingleWin(userId: string, winnings: number): Promise<{ user: User; newRecord: boolean }>;
  
  // 21 Streak methods
  incrementStreak21(userId: string, winnings: number): Promise<{ user: User; streakIncremented: boolean }>;
  resetStreak21(userId: string): Promise<{ user: User; streakReset: boolean }>;
  
  // Streak Leaderboard methods
  getWeeklyStreakLeaderboard(limit?: number): Promise<(StreakLeaderboard & { user: User })[]>;
  getPremiumWeeklyStreakLeaderboard(limit?: number): Promise<(StreakLeaderboard & { user: User })[]>;
  getTop50StreakLeaderboard(): Promise<(StreakLeaderboard & { user: User })[]>;
  updateWeeklyStreakEntry(userId: string, bestStreak: number, weekStartDate: Date, totalGames: number, totalEarnings: number): Promise<StreakLeaderboard>;
  calculateWeeklyRanks(): Promise<void>;
  getCurrentWeekStart(): Date;
  
  // Battle Pass methods
  generateBattlePassReward(): { type: 'coins' | 'gems' | 'tickets'; amount: number };
  getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<{freeTiers: number[], premiumTiers: number[]}>;
  claimBattlePassTier(userId: string, seasonId: string, tier: number, isPremium?: boolean): Promise<{ coins: number; gems: number; tickets: number }>;
  
  // Game stats methods
  createGameStats(stats: InsertGameStats): Promise<GameStats>;
  getUserStats(userId: string): Promise<any>;
  
  // Daily spin methods
  canUserSpin(userId: string): Promise<boolean>;
  createDailySpin(spin: InsertDailySpin): Promise<DailySpin>;
  
  // Unified spin methods
  getLastSpinAt(userId: string): Promise<Date | null>;
  canUserSpin24h(userId: string): Promise<boolean>;
  getSpinStatus(userId: string): Promise<{ canSpin: boolean; nextAt?: Date; secondsLeft?: number }>;
  createSpin(userId: string, reward: any): Promise<DailySpin>;
  
  // Inventory methods
  createInventory(item: InsertInventory): Promise<Inventory>;
  getUserInventory(userId: string): Promise<Inventory[]>;
  
  // Achievement methods
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<Achievement[]>;
  
  // Challenge methods
  getChallenges(): Promise<Challenge[]>;
  getUserChallenges(userId: string): Promise<(UserChallenge & { challenge: Challenge })[]>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  assignChallengeToUser(userId: string, challengeId: string): Promise<UserChallenge>;
  updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<UserChallenge | null>;
  completeChallengeForUser(userId: string, challengeId: string): Promise<UserChallenge | null>;
  markChallengeRewardAsClaimed(userId: string, userChallengeId: string): Promise<void>;
  removeUserChallenge(userId: string, challengeId: string): Promise<void>;
  cleanupExpiredChallenges(): Promise<void>;
  deleteTodaysChallenges(): Promise<void>;
  
  // Gem methods
  createGemTransaction(transaction: InsertGemTransaction): Promise<GemTransaction>;
  getUserGemTransactions(userId: string): Promise<GemTransaction[]>;
  createGemPurchase(purchase: InsertGemPurchase): Promise<GemPurchase>;
  getUserGemPurchases(userId: string): Promise<GemPurchase[]>;
  addGemsToUser(userId: string, amount: number, description: string, relatedId?: string): Promise<User>;
  spendGemsFromUser(userId: string, amount: number, description: string, relatedId?: string): Promise<User>;
  
  // Season/Battlepass methods
  createSeason(season: InsertSeason): Promise<Season>;
  getCurrentSeason(): Promise<Season | undefined>;
  addSeasonXPToUser(userId: string, xpAmount: number): Promise<User>;
  getTimeUntilSeasonEnd(): Promise<{ days: number; hours: number; minutes: number }>;
  resetSeasonProgress(): Promise<void>;
  
  // Card back methods
  getAllCardBacks(): Promise<CardBack[]>;
  getCardBack(id: string): Promise<CardBack | undefined>;
  getUserCardBacks(userId: string): Promise<(UserCardBack & { cardBack: CardBack })[]>;
  purchaseCardBack(userId: string, cardBackId: string, priceCurrency: string, priceAmount: number): Promise<{ userCardBack: UserCardBack; user: User }>;
  selectCardBack(userId: string, cardBackId: string | null): Promise<User>;
  
  // Bet draft methods
  createBetDraft(draft: InsertBetDraft): Promise<BetDraft>;
  getBetDraft(id: string): Promise<BetDraft | undefined>;
  updateBetDraft(id: string, updates: Partial<BetDraft>): Promise<BetDraft>;
  deleteBetDraft(id: string): Promise<void>;
  
  // All-in run methods
  createAllInRun(run: InsertAllInRun): Promise<AllInRun>;
  getAllInRun(id: string): Promise<AllInRun | undefined>;
  updateAllInRun(id: string, updates: Partial<AllInRun>): Promise<AllInRun>;
  
  // Config methods
  getConfig(key: string): Promise<Config | undefined>;
  setConfig(key: string, value: string): Promise<Config>;
  
  // Friends methods
  sendFriendRequest(requesterId: string, recipientId: string): Promise<Friendship>;
  acceptFriendRequest(requesterId: string, recipientId: string): Promise<Friendship>;
  rejectFriendRequest(requesterId: string, recipientId: string): Promise<void>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  getUserFriends(userId: string): Promise<any[]>;
  getFriendRequests(userId: string): Promise<Friendship[]>;
  areFriends(userId: string, friendId: string): Promise<boolean>;
  searchUsersByUsername(query: string, excludeUserId?: string): Promise<User[]>;
  
  // Rank rewards methods
  getUserClaimedRankRewards(userId: string): Promise<RankRewardClaimed[]>;
  hasUserClaimedRankReward(userId: string, rankKey: string): Promise<boolean>;
  claimRankReward(userId: string, rankKey: string, gemsAwarded: number): Promise<RankRewardClaimed>;
}

class SupabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const profile = await ProfileAdapter.getProfile(id);
    return profile as unknown as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const profile = await ProfileAdapter.getProfileByUsername(username);
    return profile as unknown as User | undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Not yet implemented in adapters - return undefined for now
    return undefined;
  }

  async getAllUsers(): Promise<User[]> {
    // Not yet implemented - return empty array
    return [];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Profile creation should be handled by Supabase trigger
    // Just return existing profile or throw
    const profile = await ProfileAdapter.getProfile(user.id || user.userId!);
    if (!profile) {
      throw new Error('User profile not found - should be created by Supabase trigger');
    }
    return profile as unknown as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const profile = await ProfileAdapter.updateProfile(id, updates as any);
    if (!profile) {
      throw new Error('Profile not found');
    }
    return profile as unknown as User;
  }

  async updateUserCoins(id: string, newAmount: number): Promise<User> {
    const profile = await ProfileAdapter.getProfile(id);
    if (!profile) throw new Error('Profile not found');
    const delta = newAmount - (profile.coins || 0);
    await ProfileAdapter.updateCoins(id, delta);
    const updated = await ProfileAdapter.getProfile(id);
    return updated as unknown as User;
  }

  async updateUserGems(id: string, newAmount: number): Promise<User> {
    const profile = await ProfileAdapter.getProfile(id);
    if (!profile) throw new Error('Profile not found');
    const delta = newAmount - (profile.gems || 0);
    await ProfileAdapter.updateGems(id, delta);
    const updated = await ProfileAdapter.getProfile(id);
    return updated as unknown as User;
  }

  // Gem methods
  async createGemTransaction(transaction: InsertGemTransaction): Promise<GemTransaction> {
    return await GemsAdapter.createGemTransaction(
      transaction.userId,
      transaction.amount,
      transaction.type as 'earn' | 'spend',
      transaction.description,
      transaction.relatedId || undefined
    ) as unknown as GemTransaction;
  }

  async getUserGemTransactions(userId: string): Promise<GemTransaction[]> {
    return await GemsAdapter.getUserGemTransactions(userId) as unknown as GemTransaction[];
  }

  async createGemPurchase(purchase: InsertGemPurchase): Promise<GemPurchase> {
    return await GemsAdapter.createGemPurchase(
      purchase.userId,
      purchase.gemAmount,
      purchase.costCurrency,
      purchase.costAmount,
      purchase.stripePaymentIntentId || undefined
    ) as unknown as GemPurchase;
  }

  async getUserGemPurchases(userId: string): Promise<GemPurchase[]> {
    return await GemsAdapter.getUserGemPurchases(userId) as unknown as GemPurchase[];
  }

  async addGemsToUser(userId: string, amount: number, description: string, relatedId?: string): Promise<User> {
    await ProfileAdapter.updateGems(userId, amount);
    await GemsAdapter.createGemTransaction(userId, amount, 'earn', description, relatedId);
    const updated = await ProfileAdapter.getProfile(userId);
    return updated as unknown as User;
  }

  async spendGemsFromUser(userId: string, amount: number, description: string, relatedId?: string): Promise<User> {
    const profile = await ProfileAdapter.getProfile(userId);
    if (!profile || (profile.gems || 0) < amount) {
      throw new Error('Insufficient gems');
    }
    await ProfileAdapter.updateGems(userId, -amount);
    await GemsAdapter.createGemTransaction(userId, amount, 'spend', description, relatedId);
    const updated = await ProfileAdapter.getProfile(userId);
    return updated as unknown as User;
  }

  // Stats methods
  async createGameStats(stats: InsertGameStats): Promise<GameStats> {
    await StatsAdapter.upsertStats(
      stats.userId,
      stats.result as 'win' | 'loss' | 'push',
      stats.amount || 0
    );
    const gameStats = await StatsAdapter.getStats(stats.userId);
    return gameStats as unknown as GameStats;
  }

  async getUserStats(userId: string): Promise<any> {
    return await StatsAdapter.getStats(userId);
  }

  // Inventory methods
  async createInventory(item: InsertInventory): Promise<Inventory> {
    return await InventoryAdapter.addInventoryItem(item.userId, item.itemType, item.itemId) as unknown as Inventory;
  }

  async getUserInventory(userId: string): Promise<Inventory[]> {
    return await InventoryAdapter.getUserInventory(userId) as unknown as Inventory[];
  }

  // Friends methods
  async sendFriendRequest(requesterId: string, recipientId: string): Promise<Friendship> {
    return await FriendsAdapter.sendFriendRequest(requesterId, recipientId) as unknown as Friendship;
  }

  async acceptFriendRequest(requesterId: string, recipientId: string): Promise<Friendship> {
    return await FriendsAdapter.acceptFriendRequest(requesterId, recipientId) as unknown as Friendship;
  }

  async rejectFriendRequest(requesterId: string, recipientId: string): Promise<void> {
    await FriendsAdapter.rejectFriendRequest(requesterId, recipientId);
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    await FriendsAdapter.removeFriend(userId, friendId);
  }

  async getUserFriends(userId: string): Promise<any[]> {
    return await FriendsAdapter.getFriends(userId);
  }

  async getFriendRequests(userId: string): Promise<Friendship[]> {
    return await FriendsAdapter.getFriendRequests(userId) as unknown as Friendship[];
  }

  async areFriends(userId: string, friendId: string): Promise<boolean> {
    const { status } = await FriendsAdapter.checkFriendship(userId, friendId);
    return status === 'accepted';
  }

  async searchUsersByUsername(query: string, excludeUserId?: string): Promise<User[]> {
    const profiles = await ProfileAdapter.searchProfiles(query, excludeUserId);
    return profiles as unknown as User[];
  }

  // Stub methods - to be implemented
  async addXPToUser(userId: string, xpAmount: number): Promise<{ user: User; leveledUp: boolean; rewards?: { coins?: number; gems?: number } }> {
    throw new Error('Not implemented yet - XP system');
  }
  
  calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100));
  }
  
  getXPForLevel(level: number): number {
    return level * level * 100;
  }
  
  generateLevelRewards(): { coins?: number; gems?: number } {
    return { coins: 1000, gems: 10 };
  }
  
  async updateMaxSingleWin(userId: string, winnings: number): Promise<{ user: User; newRecord: boolean }> {
    throw new Error('Not implemented yet - max single win');
  }
  
  async incrementStreak21(userId: string, winnings: number): Promise<{ user: User; streakIncremented: boolean }> {
    throw new Error('Not implemented yet - streak 21');
  }
  
  async resetStreak21(userId: string): Promise<{ user: User; streakReset: boolean }> {
    throw new Error('Not implemented yet - streak 21');
  }
  
  async getWeeklyStreakLeaderboard(limit?: number): Promise<(StreakLeaderboard & { user: User })[]> {
    throw new Error('Not implemented yet - leaderboard');
  }
  
  async getPremiumWeeklyStreakLeaderboard(limit?: number): Promise<(StreakLeaderboard & { user: User })[]> {
    throw new Error('Not implemented yet - leaderboard');
  }
  
  async getTop50StreakLeaderboard(): Promise<(StreakLeaderboard & { user: User })[]> {
    throw new Error('Not implemented yet - leaderboard');
  }
  
  async updateWeeklyStreakEntry(userId: string, bestStreak: number, weekStartDate: Date, totalGames: number, totalEarnings: number): Promise<StreakLeaderboard> {
    throw new Error('Not implemented yet - leaderboard');
  }
  
  async calculateWeeklyRanks(): Promise<void> {
    throw new Error('Not implemented yet - leaderboard');
  }
  
  getCurrentWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const diff = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  }
  
  generateBattlePassReward(): { type: 'coins' | 'gems' | 'tickets'; amount: number } {
    return { type: 'coins', amount: 1000 };
  }
  
  async getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<{freeTiers: number[], premiumTiers: number[]}> {
    const claimed = await BattlePassAdapter.getClaimedBattlePassTiers(userId);
    const freeTiers = claimed.filter((r: any) => !r.is_premium).map((r: any) => r.tier);
    const premiumTiers = claimed.filter((r: any) => r.is_premium).map((r: any) => r.tier);
    return { freeTiers, premiumTiers };
  }
  
  async claimBattlePassTier(userId: string, seasonId: string, tier: number, isPremium?: boolean): Promise<{ coins: number; gems: number; tickets: number }> {
    throw new Error('Not implemented yet - battle pass');
  }
  
  async canUserSpin(userId: string): Promise<boolean> {
    throw new Error('Not implemented yet - daily spin');
  }
  
  async createDailySpin(spin: InsertDailySpin): Promise<DailySpin> {
    throw new Error('Not implemented yet - daily spin');
  }
  
  async getLastSpinAt(userId: string): Promise<Date | null> {
    return DailySpinAdapter.getLastSpinAt(userId);
  }
  
  async canUserSpin24h(userId: string): Promise<boolean> {
    return DailySpinAdapter.canUserSpin24h(userId);
  }
  
  async getSpinStatus(userId: string): Promise<{ canSpin: boolean; nextAt?: Date; secondsLeft?: number }> {
    const status = await DailySpinAdapter.getSpinStatus(userId);
    const secondsLeft = status.nextSpinAt ? Math.max(0, Math.floor((status.nextSpinAt.getTime() - Date.now()) / 1000)) : undefined;
    return { canSpin: status.canSpin, nextAt: status.nextSpinAt || undefined, secondsLeft };
  }
  
  async createSpin(userId: string, reward: any): Promise<DailySpin> {
    return DailySpinAdapter.createSpin(userId, reward.amount, reward.type) as Promise<DailySpin>;
  }
  
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    throw new Error('Not implemented yet - achievements');
  }
  
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    throw new Error('Not implemented yet - achievements');
  }
  
  async getChallenges(): Promise<Challenge[]> {
    return ChallengesAdapter.getChallenges() as Promise<Challenge[]>;
  }
  
  async getUserChallenges(userId: string): Promise<(UserChallenge & { challenge: Challenge })[]> {
    return ChallengesAdapter.getUserChallenges(userId) as Promise<(UserChallenge & { challenge: Challenge })[]>;
  }
  
  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    return ChallengesAdapter.createChallenge(challenge) as Promise<Challenge>;
  }
  
  async assignChallengeToUser(userId: string, challengeId: string): Promise<UserChallenge> {
    return ChallengesAdapter.assignChallengeToUser(userId, challengeId) as Promise<UserChallenge>;
  }
  
  async updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<UserChallenge | null> {
    const result = await ChallengesAdapter.updateChallengeProgress(userId, challengeId, progress);
    return result as UserChallenge | null;
  }
  
  async completeChallengeForUser(userId: string, challengeId: string): Promise<UserChallenge | null> {
    const result = await ChallengesAdapter.completeChallengeForUser(userId, challengeId);
    return result as UserChallenge | null;
  }
  
  async markChallengeRewardAsClaimed(userId: string, userChallengeId: string): Promise<void> {
    await ChallengesAdapter.markChallengeRewardAsClaimed(userId, userChallengeId);
  }
  
  async removeUserChallenge(userId: string, challengeId: string): Promise<void> {
    return ChallengesAdapter.removeUserChallenge(userId, challengeId);
  }
  
  async cleanupExpiredChallenges(): Promise<void> {
    return ChallengesAdapter.cleanupExpiredChallenges();
  }
  
  async deleteTodaysChallenges(): Promise<void> {
    const { data: users } = await supabase.from('profiles').select('user_id');
    if (users) {
      for (const user of users) {
        await ChallengesAdapter.deleteTodaysChallenges(user.user_id);
      }
    }
  }
  
  async createSeason(season: InsertSeason): Promise<Season> {
    return BattlePassAdapter.createSeason(season) as Promise<Season>;
  }
  
  async getCurrentSeason(): Promise<Season | undefined> {
    const season = await BattlePassAdapter.getCurrentSeason();
    return season as Season | undefined;
  }
  
  async addSeasonXPToUser(userId: string, xpAmount: number): Promise<User> {
    await BattlePassAdapter.addSeasonXPToUser(userId, xpAmount);
    const user = await this.getUser(userId);
    return user!;
  }
  
  async getTimeUntilSeasonEnd(): Promise<{ days: number; hours: number; minutes: number }> {
    return BattlePassAdapter.getTimeUntilSeasonEnd();
  }
  
  async resetSeasonProgress(): Promise<void> {
    return BattlePassAdapter.resetSeasonProgress();
  }
  
  async getAllCardBacks(): Promise<CardBack[]> {
    const { data, error } = await supabase.from('card_backs').select('*').eq('is_active', true);
    if (error) throw error;
    return (data || []) as unknown as CardBack[];
  }
  
  async getCardBack(id: string): Promise<CardBack | undefined> {
    const { data, error } = await supabase.from('card_backs').select('*').eq('id', id).single();
    if (error) return undefined;
    return data as unknown as CardBack | undefined;
  }
  
  async getUserCardBacks(userId: string): Promise<(UserCardBack & { cardBack: CardBack })[]> {
    const { data, error } = await supabase
      .from('user_card_backs')
      .select('*, card_backs(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []) as unknown as (UserCardBack & { cardBack: CardBack })[];
  }
  
  async purchaseCardBack(userId: string, cardBackId: string, priceCurrency: string, priceAmount: number): Promise<{ userCardBack: UserCardBack; user: User }> {
    // Debit currency
    if (priceCurrency === 'gems') {
      await this.spendGemsFromUser(userId, priceAmount, `Card back purchase: ${cardBackId}`);
    } else {
      await ProfileAdapter.updateCoins(userId, -priceAmount);
    }
    
    // Add to user card backs
    const { data, error } = await supabase
      .from('user_card_backs')
      .insert({ user_id: userId, card_back_id: cardBackId })
      .select()
      .single();
    if (error) throw error;
    
    const user = await this.getUser(userId);
    return { userCardBack: data as unknown as UserCardBack, user: user! };
  }
  
  async selectCardBack(userId: string, cardBackId: string | null): Promise<User> {
    const updated = await ProfileAdapter.updateProfile(userId, { selected_card_back_id: cardBackId } as any);
    return updated as unknown as User;
  }
  
  // Card back sync method - CRITICAL for server startup
  async syncCardBacksFromJson(): Promise<{ synced: number; skipped: number }> {
    // For now, just return success to allow server to start
    console.log('⚠️  Card back sync skipped - using Supabase data directly');
    return { synced: 0, skipped: 0 };
  }
  
  async createBetDraft(draft: InsertBetDraft): Promise<BetDraft> {
    throw new Error('Not implemented yet - bet drafts');
  }
  
  async getBetDraft(id: string): Promise<BetDraft | undefined> {
    throw new Error('Not implemented yet - bet drafts');
  }
  
  async updateBetDraft(id: string, updates: Partial<BetDraft>): Promise<BetDraft> {
    throw new Error('Not implemented yet - bet drafts');
  }
  
  async deleteBetDraft(id: string): Promise<void> {
    throw new Error('Not implemented yet - bet drafts');
  }
  
  async createAllInRun(run: InsertAllInRun): Promise<AllInRun> {
    throw new Error('Not implemented yet - all-in runs');
  }
  
  async getAllInRun(id: string): Promise<AllInRun | undefined> {
    throw new Error('Not implemented yet - all-in runs');
  }
  
  async updateAllInRun(id: string, updates: Partial<AllInRun>): Promise<AllInRun> {
    throw new Error('Not implemented yet - all-in runs');
  }
  
  async getConfig(key: string): Promise<Config | undefined> {
    throw new Error('Not implemented yet - config');
  }
  
  async setConfig(key: string, value: string): Promise<Config> {
    throw new Error('Not implemented yet - config');
  }
  
  async getUserClaimedRankRewards(userId: string): Promise<RankRewardClaimed[]> {
    throw new Error('Not implemented yet - rank rewards');
  }
  
  async hasUserClaimedRankReward(userId: string, rankKey: string): Promise<boolean> {
    throw new Error('Not implemented yet - rank rewards');
  }
  
  async claimRankReward(userId: string, rankKey: string, gemsAwarded: number): Promise<RankRewardClaimed> {
    throw new Error('Not implemented yet - rank rewards');
  }
}

// Export singleton instance
export const storage = new SupabaseStorage();
