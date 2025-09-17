import { users, gameStats, inventory, dailySpins, achievements, challenges, userChallenges, gemTransactions, gemPurchases, seasons, battlePassRewards, streakLeaderboard, cardBacks, userCardBacks, type User, type InsertUser, type GameStats, type InsertGameStats, type Inventory, type InsertInventory, type DailySpin, type InsertDailySpin, type Achievement, type InsertAchievement, type Challenge, type UserChallenge, type InsertChallenge, type InsertUserChallenge, type GemTransaction, type InsertGemTransaction, type GemPurchase, type InsertGemPurchase, type Season, type InsertSeason, type BattlePassReward, type InsertBattlePassReward, type StreakLeaderboard, type InsertStreakLeaderboard, type CardBack, type InsertCardBack, type UserCardBack, type InsertUserCardBack } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

// JSON Card Back interface from the generated file
interface JsonCardBack {
  id: string;
  name: string;
  slug: string;
  rarity: 'COMMON' | 'RARE' | 'SUPER_RARE' | 'LEGENDARY';
  imageUrl: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}

interface JsonCardBackData {
  version: string;
  generated: boolean;
  generatedAt: string;
  cards: JsonCardBack[];
}

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
  
  // 21 Streak methods
  incrementStreak21(userId: string, winnings: number): Promise<{ user: User; streakIncremented: boolean }>;
  resetStreak21(userId: string): Promise<{ user: User; streakReset: boolean }>;
  
  // Streak Leaderboard methods
  getWeeklyStreakLeaderboard(limit?: number): Promise<(StreakLeaderboard & { user: User })[]>;
  updateWeeklyStreakEntry(userId: string, bestStreak: number, weekStartDate: Date, totalGames: number, totalEarnings: number): Promise<StreakLeaderboard>;
  calculateWeeklyRanks(): Promise<void>;
  getCurrentWeekStart(): Date;
  
  // Battle Pass methods
  generateBattlePassReward(): { type: 'coins' | 'gems'; amount: number };
  getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<{freeTiers: number[], premiumTiers: number[]}>;
  claimBattlePassTier(userId: string, seasonId: string, tier: number, isPremium?: boolean): Promise<{ type: 'coins' | 'gems'; amount: number }>;
  
  // Game stats methods
  createGameStats(stats: InsertGameStats): Promise<GameStats>;
  getUserStats(userId: string): Promise<any>;
  
  // Daily spin methods
  canUserSpin(userId: string): Promise<boolean>;
  createDailySpin(spin: InsertDailySpin): Promise<DailySpin>;
  
  // Unified spin methods (24h cooldown consistently using UTC)
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
  
  // Battle Pass Rewards methods
  claimBattlePassReward(userId: string, tier: number, isPremium: boolean): Promise<BattlePassReward | null>;
  getUserBattlePassRewards(userId: string, seasonId?: string): Promise<BattlePassReward[]>;
  hasUserClaimedReward(userId: string, tier: number, isPremium: boolean, seasonId?: string): Promise<boolean>;
  
  // Card Back methods
  getAllCardBacks(): Promise<CardBack[]>;
  getCardBack(id: string): Promise<CardBack | undefined>;
  createCardBack(cardBack: InsertCardBack): Promise<CardBack>;
  updateCardBack(id: string, updates: Partial<CardBack>): Promise<CardBack>;
  syncCardBacksFromJson(): Promise<{ synced: number; skipped: number }>;
  getCardBacksHealthCheck(): Promise<{ isHealthy: boolean; count: number; minRequired: number }>;
  
  // User Card Back methods
  getUserCardBacks(userId: string): Promise<(UserCardBack & { cardBack: CardBack })[]>;
  addCardBackToUser(userId: string, cardBackId: string): Promise<UserCardBack>;
  hasUserCardBack(userId: string, cardBackId: string): Promise<boolean>;
  getAvailableCardBacksForPurchase(userId: string): Promise<CardBack[]>;
  buyRandomCardBack(userId: string): Promise<{ cardBack: CardBack; duplicate: boolean }>;
  updateUserSelectedCardBack(userId: string, cardBackId: string): Promise<User>;
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  // Cache for JSON card backs to avoid re-reading file
  private cardBacksCache: CardBack[] | null = null;

  // Load card backs from JSON file
  private loadCardBacksFromJson(): CardBack[] {
    if (this.cardBacksCache) {
      return this.cardBacksCache;
    }

    try {
      const jsonPath = path.join(process.cwd(), 'card-backs-pipeline', 'card-backs.json');
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      const cardBackData: JsonCardBackData = JSON.parse(jsonData);
      
      this.cardBacksCache = cardBackData.cards.map(jsonCard => this.mapJsonToCardBack(jsonCard));
      return this.cardBacksCache;
    } catch (error) {
      console.error('Error loading card backs from JSON:', error);
      // Fallback to empty array if JSON loading fails
      return [];
    }
  }

  // Map JSON card back to our CardBack type
  private mapJsonToCardBack(jsonCard: JsonCardBack): CardBack {
    return {
      id: jsonCard.id,
      name: jsonCard.name,
      rarity: jsonCard.rarity as 'COMMON' | 'RARE' | 'SUPER_RARE' | 'LEGENDARY',
      priceGems: this.getGemPriceForRarity(jsonCard.rarity),
      imageUrl: jsonCard.imageUrl,
      isActive: true,
      createdAt: new Date('2025-09-17T09:38:39.640Z') // Use generation date from JSON
    };
  }

  // Get gem price based on rarity
  private getGemPriceForRarity(rarity: string): number {
    switch (rarity) {
      case 'COMMON': return 25;
      case 'RARE': return 50;
      case 'SUPER_RARE': return 100;
      case 'LEGENDARY': return 200;
      default: return 50; // Default to RARE price
    }
  }

  // CRITICAL: Synchronize all card backs from JSON to database 
  async syncCardBacksFromJson(): Promise<{ synced: number; skipped: number }> {
    console.log('🔄 Synchronizing card backs from JSON to database...');
    
    try {
      // Load all card backs from JSON file
      const jsonCardBacks = this.loadCardBacksFromJson();
      console.log(`📋 Found ${jsonCardBacks.length} card backs in JSON file`);

      let synced = 0;
      let skipped = 0;

      // Process each card back
      for (const cardBack of jsonCardBacks) {
        try {
          // Check if card back already exists in database
          const existing = await db
            .select()
            .from(cardBacks)
            .where(eq(cardBacks.id, cardBack.id))
            .limit(1);

          if (existing.length > 0) {
            // Card back already exists, skip it
            skipped++;
            console.log(`⏭️  Skipped "${cardBack.name}" (${cardBack.id}) - already exists`);
          } else {
            // Insert new card back into database
            await db
              .insert(cardBacks)
              .values({
                id: cardBack.id,
                name: cardBack.name,
                rarity: cardBack.rarity,
                priceGems: cardBack.priceGems,
                imageUrl: cardBack.imageUrl,
                isActive: cardBack.isActive,
                createdAt: cardBack.createdAt
              });
            
            synced++;
            console.log(`✅ Synced "${cardBack.name}" (${cardBack.id}) - ${cardBack.rarity} - ${cardBack.priceGems} gems`);
          }
        } catch (error) {
          console.error(`❌ Error syncing card back "${cardBack.name}" (${cardBack.id}):`, error);
          // Continue with next card back instead of failing completely
        }
      }

      console.log(`🎯 Sync complete: ${synced} synced, ${skipped} skipped`);
      return { synced, skipped };
    } catch (error) {
      console.error('❌ Error in syncCardBacksFromJson:', error);
      throw error;
    }
  }

  // Health check for card backs availability
  async getCardBacksHealthCheck(): Promise<{ isHealthy: boolean; count: number; minRequired: number }> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(cardBacks)
        .where(eq(cardBacks.isActive, true));
      
      const count = result[0]?.count || 0;
      const minRequired = 20; // Minimum required card backs for safe operations
      const isHealthy = count >= minRequired;
      
      return { isHealthy, count, minRequired };
    } catch (error) {
      console.error('❌ Error in card backs health check:', error);
      return { isHealthy: false, count: 0, minRequired: 20 };
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        xp: 0,
        level: 1,
        coins: 1000,
        gems: 0,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateUserCoins(id: string, newAmount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ coins: newAmount, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateUserGems(id: string, newAmount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ gems: newAmount, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  // XP and Level methods implementation
  async addXPToUser(userId: string, xpAmount: number): Promise<{ user: User; leveledUp: boolean; rewards?: { coins?: number; gems?: number } }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const currentLevel = user.level || 1;
    const currentLevelXP = user.currentLevelXP || 0;
    const totalXP = user.xp || 0;
    
    // Add XP to current level
    let newCurrentLevelXP = currentLevelXP + xpAmount;
    let newLevel = currentLevel;
    let leveledUp = false;
    
    // Check if we need to level up (500 XP per level)
    while (newCurrentLevelXP >= 500) {
      newCurrentLevelXP -= 500; // Reset to 0 and carry over
      newLevel++;
      leveledUp = true;
    }
    
    const newTotalXP = totalXP + xpAmount;
    
    let rewards;
    if (leveledUp) {
      rewards = this.generateLevelRewards();
      
      // Apply level rewards
      const updatedCoins = (user.coins || 0) + (rewards.coins || 0);
      const updatedGems = (user.gems || 0) + (rewards.gems || 0);
      
      const [updatedUser] = await db
        .update(users)
        .set({ 
          xp: newTotalXP,
          currentLevelXP: newCurrentLevelXP, 
          level: newLevel,
          coins: updatedCoins,
          gems: updatedGems,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      
      return { user: updatedUser, leveledUp, rewards };
    } else {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          xp: newTotalXP,
          currentLevelXP: newCurrentLevelXP,
          level: newLevel, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId))
        .returning();
      
      return { user: updatedUser, leveledUp };
    }
  }
  
  calculateLevel(xp: number): number {
    return Math.floor(xp / 500) + 1;
  }
  
  getXPForLevel(level: number): number {
    return (level - 1) * 500;
  }
  
  getCurrentLevelXP(xp: number): number {
    return xp % 500;
  }
  
  generateLevelRewards(): { coins?: number; gems?: number } {
    const random = Math.random();
    
    // 10% chance de gems
    if (random < 0.1) {
      return { gems: Math.floor(Math.random() * 3) + 1 }; // 1-3 gems
    }
    
    // 90% chance de coins avec différentes probabilités
    const coinRandom = Math.random();
    if (coinRandom < 0.05) {
      // 5% chance de 1000 coins (très rare)
      return { coins: 1000 };
    } else if (coinRandom < 0.15) {
      // 10% chance de 500 coins (rare)
      return { coins: 500 };
    } else if (coinRandom < 0.35) {
      // 20% chance de 200 coins (peu commun)
      return { coins: 200 };
    } else if (coinRandom < 0.60) {
      // 25% chance de 100 coins (commun)
      return { coins: 100 };
    } else {
      // 40% chance de 50 coins (très commun)
      return { coins: 50 };
    }
  }

  // 21 Streak system methods
  async incrementStreak21(userId: string, winnings: number): Promise<{ user: User; streakIncremented: boolean }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const currentStreak = (user.currentStreak21 || 0) + 1;
    const maxStreak = Math.max(user.maxStreak21 || 0, currentStreak);
    const totalStreakWins = (user.totalStreakWins || 0) + 1;
    const totalStreakEarnings = (user.totalStreakEarnings || 0) + winnings;
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        currentStreak21: currentStreak,
        maxStreak21: maxStreak,
        totalStreakWins: totalStreakWins,
        totalStreakEarnings: totalStreakEarnings,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return { user: updatedUser, streakIncremented: true };
  }

  async resetStreak21(userId: string): Promise<{ user: User; streakReset: boolean }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        currentStreak21: 0,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return { user: updatedUser, streakReset: true };
  }

  // Streak Leaderboard methods
  async getWeeklyStreakLeaderboard(limit: number = 10): Promise<(StreakLeaderboard & { user: User })[]> {
    const weekStart = this.getCurrentWeekStart();
    
    const leaderboardEntries = await db
      .select({
        id: streakLeaderboard.id,
        userId: streakLeaderboard.userId,
        weekStartDate: streakLeaderboard.weekStartDate,
        bestStreak: streakLeaderboard.bestStreak,
        totalStreakGames: streakLeaderboard.totalStreakGames,
        totalStreakEarnings: streakLeaderboard.totalStreakEarnings,
        rank: streakLeaderboard.rank,
        createdAt: streakLeaderboard.createdAt,
        updatedAt: streakLeaderboard.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          selectedAvatarId: users.selectedAvatarId,
          membershipType: users.membershipType,
        }
      })
      .from(streakLeaderboard)
      .innerJoin(users, eq(streakLeaderboard.userId, users.id))
      .where(eq(streakLeaderboard.weekStartDate, weekStart))
      .orderBy(streakLeaderboard.rank)
      .limit(limit);

    return leaderboardEntries.map(entry => ({
      ...entry,
      user: entry.user as User
    }));
  }

  async updateWeeklyStreakEntry(userId: string, bestStreak: number, weekStartDate: Date, totalGames: number, totalEarnings: number): Promise<StreakLeaderboard> {
    // Check if entry already exists for this user and week
    const [existingEntry] = await db
      .select()
      .from(streakLeaderboard)
      .where(and(eq(streakLeaderboard.userId, userId), eq(streakLeaderboard.weekStartDate, weekStartDate)))
      .limit(1);

    if (existingEntry) {
      // Update existing entry if this is a better streak
      if (bestStreak > existingEntry.bestStreak) {
        const [updatedEntry] = await db
          .update(streakLeaderboard)
          .set({
            bestStreak,
            totalStreakGames: totalGames,
            totalStreakEarnings: totalEarnings,
            updatedAt: new Date()
          })
          .where(eq(streakLeaderboard.id, existingEntry.id))
          .returning();
        return updatedEntry;
      }
      return existingEntry;
    } else {
      // Create new entry
      const [newEntry] = await db
        .insert(streakLeaderboard)
        .values({
          userId,
          weekStartDate,
          bestStreak,
          totalStreakGames: totalGames,
          totalStreakEarnings: totalEarnings,
        })
        .returning();
      return newEntry;
    }
  }

  async calculateWeeklyRanks(): Promise<void> {
    const weekStart = this.getCurrentWeekStart();
    
    // Get all entries for current week ordered by best streak descending
    const entries = await db
      .select()
      .from(streakLeaderboard)
      .where(eq(streakLeaderboard.weekStartDate, weekStart))
      .orderBy(sql`${streakLeaderboard.bestStreak} DESC, ${streakLeaderboard.totalStreakEarnings} DESC`);

    // Update ranks
    for (let i = 0; i < entries.length; i++) {
      await db
        .update(streakLeaderboard)
        .set({ rank: i + 1 })
        .where(eq(streakLeaderboard.id, entries[i].id));
    }
  }

  getCurrentWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0 days to subtract
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0); // Set to beginning of day
    
    return weekStart;
  }

  // Battle Pass reward system with user-specified probabilities
  generateBattlePassReward(): { type: 'coins' | 'gems'; amount: number } {
    const random = Math.random();
    
    if (random < 0.5) {
      // 50% chance de gagner 100 pièces
      return { type: 'coins', amount: 100 };
    } else if (random < 0.8) {
      // 30% chance de gagner 200 pièces
      return { type: 'coins', amount: 200 };
    } else if (random < 0.9) {
      // 10% chance de gagner 500 pièces
      return { type: 'coins', amount: 500 };
    } else {
      // 10% chance de gagner 3 Gems
      return { type: 'gems', amount: 3 };
    }
  }

  // Premium Battle Pass reward system with better rewards
  generatePremiumBattlePassReward(): { type: 'coins' | 'gems'; amount: number } {
    const random = Math.random();
    
    if (random < 0.3) {
      // 30% chance de gagner 300 pièces
      return { type: 'coins', amount: 300 };
    } else if (random < 0.6) {
      // 30% chance de gagner 500 pièces
      return { type: 'coins', amount: 500 };
    } else if (random < 0.8) {
      // 20% chance de gagner 1000 pièces
      return { type: 'coins', amount: 1000 };
    } else if (random < 0.95) {
      // 15% chance de gagner 5 Gems
      return { type: 'gems', amount: 5 };
    } else {
      // 5% chance de gagner 10 Gems (très rare)
      return { type: 'gems', amount: 10 };
    }
  }

  async getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<{freeTiers: number[], premiumTiers: number[]}> {
    // Get free rewards with proper season filtering
    const freeRewards = await db
      .select({ tier: battlePassRewards.tier })
      .from(battlePassRewards)
      .where(
        and(
          eq(battlePassRewards.userId, userId),
          eq(battlePassRewards.seasonId, seasonId),
          eq(battlePassRewards.isPremium, false)
        )
      );
    
    // Get premium rewards with proper season filtering
    const premiumRewards = await db
      .select({ tier: battlePassRewards.tier })
      .from(battlePassRewards)
      .where(
        and(
          eq(battlePassRewards.userId, userId),
          eq(battlePassRewards.seasonId, seasonId),
          eq(battlePassRewards.isPremium, true)
        )
      );
    
    return {
      freeTiers: freeRewards.map(r => r.tier),
      premiumTiers: premiumRewards.map(r => r.tier)
    };
  }

  async claimBattlePassTier(userId: string, seasonId: string, tier: number, isPremium: boolean = false): Promise<{ type: 'coins' | 'gems'; amount: number }> {
    // Check if tier is already claimed for this reward type and season
    const existingClaim = await db
      .select()
      .from(battlePassRewards)
      .where(
        and(
          eq(battlePassRewards.userId, userId),
          eq(battlePassRewards.seasonId, seasonId),
          eq(battlePassRewards.tier, tier),
          eq(battlePassRewards.isPremium, isPremium)
        )
      );

    if (existingClaim.length > 0) {
      throw new Error(`This ${isPremium ? 'premium' : 'free'} tier has already been claimed for this season`);
    }

    // Generate reward (premium rewards are better)
    const reward = isPremium ? 
      this.generatePremiumBattlePassReward() : 
      this.generateBattlePassReward();

    // Save the claimed reward with proper season reference
    await db
      .insert(battlePassRewards)
      .values({
        userId,
        seasonId, // Properly persist seasonId
        tier,
        isPremium,
        rewardType: reward.type,
        rewardAmount: reward.amount
      });

    // Update user balance
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    if (reward.type === 'coins') {
      await db
        .update(users)
        .set({ 
          coins: (user.coins || 0) + reward.amount,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } else {
      await db
        .update(users)
        .set({ 
          gems: (user.gems || 0) + reward.amount,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }

    return reward;
  }

  async createGameStats(insertStats: InsertGameStats): Promise<GameStats> {
    const [stats] = await db
      .insert(gameStats)
      .values(insertStats)
      .returning();
    return stats;
  }

  async getUserStats(userId: string): Promise<any> {
    const userStats = await db
      .select()
      .from(gameStats)
      .where(eq(gameStats.userId, userId));

    // Aggregate stats
    const aggregated = userStats.reduce((acc, stats) => {
      acc.handsPlayed += stats.handsPlayed || 0;
      acc.handsWon += stats.handsWon || 0;
      acc.handsLost += stats.handsLost || 0;
      acc.handsPushed += stats.handsPushed || 0;
      acc.totalWinnings += stats.totalWinnings || 0;
      acc.totalLosses += stats.totalLosses || 0;
      acc.blackjacks += stats.blackjacks || 0;
      acc.busts += stats.busts || 0;
      acc.correctDecisions += stats.correctDecisions || 0;
      acc.totalDecisions += stats.totalDecisions || 0;
      return acc;
    }, {
      handsPlayed: 0,
      handsWon: 0,
      handsLost: 0,
      handsPushed: 0,
      totalWinnings: 0,
      totalLosses: 0,
      blackjacks: 0,
      busts: 0,
      correctDecisions: 0,
      totalDecisions: 0,
    });

    return aggregated;
  }

  async canUserSpin(userId: string): Promise<boolean> {
    // Delegate to unified logic for consistency
    return this.canUserSpin24h(userId);
  }

  async canUserSpinWheel(userId: string): Promise<boolean> {
    // Delegate to unified logic for consistency  
    return this.canUserSpin24h(userId);
  }

  async createWheelSpin(insertSpin: InsertDailySpin): Promise<DailySpin> {
    // Check if user already has a spin record
    const existingSpin = await db
      .select()
      .from(dailySpins)
      .where(eq(dailySpins.userId, insertSpin.userId!))
      .limit(1);
    
    if (existingSpin.length > 0) {
      // Update existing record
      const [updated] = await db
        .update(dailySpins)
        .set({ 
          lastSpinAt: new Date(),
          reward: insertSpin.reward 
        })
        .where(eq(dailySpins.userId, insertSpin.userId!))
        .returning();
      return updated;
    } else {
      // Create new record
      const [spin] = await db
        .insert(dailySpins)
        .values(insertSpin)
        .returning();
      return spin;
    }
  }

  async createDailySpin(insertSpin: InsertDailySpin): Promise<DailySpin> {
    const [spin] = await db
      .insert(dailySpins)
      .values(insertSpin)
      .returning();
    return spin;
  }

  // Unified spin methods - consistent 24h cooldown using UTC
  async getLastSpinAt(userId: string): Promise<Date | null> {
    const lastSpin = await db
      .select({ lastSpinAt: dailySpins.lastSpinAt })
      .from(dailySpins)
      .where(eq(dailySpins.userId, userId))
      .orderBy(sql`${dailySpins.lastSpinAt} DESC`)
      .limit(1);

    return lastSpin.length > 0 && lastSpin[0].lastSpinAt ? new Date(lastSpin[0].lastSpinAt) : null;
  }

  async canUserSpin24h(userId: string): Promise<boolean> {
    const lastSpinAt = await this.getLastSpinAt(userId);
    if (!lastSpinAt) return true;
    
    const now = new Date();
    const timeSinceLastSpin = now.getTime() - lastSpinAt.getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    return timeSinceLastSpin >= twentyFourHours;
  }

  async getSpinStatus(userId: string): Promise<{ canSpin: boolean; nextAt?: Date; secondsLeft?: number }> {
    const lastSpinAt = await this.getLastSpinAt(userId);
    
    if (!lastSpinAt) {
      return { canSpin: true };
    }
    
    const now = new Date();
    const nextAt = new Date(lastSpinAt.getTime() + 24 * 60 * 60 * 1000);
    
    if (now >= nextAt) {
      return { canSpin: true };
    }
    
    const secondsLeft = Math.ceil((nextAt.getTime() - now.getTime()) / 1000);
    
    return {
      canSpin: false,
      nextAt,
      secondsLeft
    };
  }

  async createSpin(userId: string, reward: any): Promise<DailySpin> {
    const [spin] = await db
      .insert(dailySpins)
      .values({
        userId,
        lastSpinAt: new Date(),
        reward
      })
      .returning();
    return spin;
  }

  async createInventory(insertItem: InsertInventory): Promise<Inventory> {
    const [item] = await db
      .insert(inventory)
      .values(insertItem)
      .returning();
    return item;
  }

  async getUserInventory(userId: string): Promise<Inventory[]> {
    return await db
      .select()
      .from(inventory)
      .where(eq(inventory.userId, userId));
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievements)
      .values(insertAchievement)
      .returning();
    return achievement;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId));
  }

  async getChallenges(): Promise<Challenge[]> {
    const now = new Date();
    return await db
      .select()
      .from(challenges)
      .where(and(
        eq(challenges.isActive, true),
        sql`${challenges.expiresAt} > ${now}`
      ))
      .orderBy(challenges.createdAt);
  }

  async getUserChallenges(userId: string): Promise<(UserChallenge & { challenge: Challenge })[]> {
    return await db
      .select({
        id: userChallenges.id,
        userId: userChallenges.userId,
        challengeId: userChallenges.challengeId,
        currentProgress: userChallenges.currentProgress,
        isCompleted: userChallenges.isCompleted,
        completedAt: userChallenges.completedAt,
        startedAt: userChallenges.startedAt,
        challenge: {
          id: challenges.id,
          challengeType: challenges.challengeType,
          title: challenges.title,
          description: challenges.description,
          targetValue: challenges.targetValue,
          reward: challenges.reward,
          difficulty: challenges.difficulty,
          isActive: challenges.isActive,
          createdAt: challenges.createdAt,
          expiresAt: challenges.expiresAt,
        }
      })
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(eq(userChallenges.userId, userId));
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const [created] = await db
      .insert(challenges)
      .values(challenge)
      .returning();
    return created;
  }

  async assignChallengeToUser(userId: string, challengeId: string): Promise<UserChallenge> {
    const [assigned] = await db
      .insert(userChallenges)
      .values({ userId, challengeId })
      .returning();
    return assigned;
  }

  async updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<UserChallenge | null> {
    const [updated] = await db
      .update(userChallenges)
      .set({ currentProgress: progress })
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ))
      .returning();
    return updated || null;
  }

  async completeChallengeForUser(userId: string, challengeId: string): Promise<UserChallenge | null> {
    const [completed] = await db
      .update(userChallenges)
      .set({ 
        isCompleted: true, 
        completedAt: new Date() 
      })
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ))
      .returning();
    return completed || null;
  }

  async cleanupExpiredChallenges(): Promise<void> {
    const now = new Date();
    try {
      // Deactivate expired challenges
      await db
        .update(challenges)
        .set({ isActive: false })
        .where(sql`${challenges.expiresAt} <= ${now}`);
      
      // Optional: delete old UserChallenges from expired challenges to avoid accumulation
      await db
        .delete(userChallenges)
        .where(sql`${userChallenges.challengeId} IN (
          SELECT ${challenges.id} FROM ${challenges} 
          WHERE ${challenges.expiresAt} <= ${now} AND ${challenges.isActive} = false
        )`);
    } catch (error) {
      console.error('Error during expired challenges cleanup:', error);
      throw error;
    }
  }

  async deleteTodaysChallenges(): Promise<void> {
    try {
      // Calculate current French day bounds (same logic as in ChallengeService)
      const now = new Date();
      const currentFrenchDay = new Date(now);
      
      // Adjust for French timezone
      if (now.getUTCHours() >= 23) {
        currentFrenchDay.setUTCDate(currentFrenchDay.getUTCDate() + 1);
      }
      currentFrenchDay.setUTCHours(0, 0, 0, 0);
      
      const nextFrenchDay = new Date(currentFrenchDay);
      nextFrenchDay.setUTCDate(nextFrenchDay.getUTCDate() + 1);
      
      // Find today's challenges
      const todaysChallengeIds = await db
        .select({ id: challenges.id })
        .from(challenges)
        .where(sql`${challenges.createdAt} >= ${currentFrenchDay} AND ${challenges.createdAt} < ${nextFrenchDay}`);
      
      const challengeIds = todaysChallengeIds.map(c => c.id);
      
      if (challengeIds.length > 0) {
        // Delete user challenges first (foreign key constraint)
        await db
          .delete(userChallenges)
          .where(sql`${userChallenges.challengeId} IN (${challengeIds.join(',')})`);
        
        // Delete the challenges themselves
        await db
          .delete(challenges)
          .where(sql`${challenges.id} IN (${challengeIds.join(',')})`);
        
        console.log(`Deleted ${challengeIds.length} today's challenges`);
      }
    } catch (error) {
      console.error('Error deleting today\'s challenges:', error);
      throw error;
    }
  }

  // Gem methods implementation
  async createGemTransaction(insertTransaction: InsertGemTransaction): Promise<GemTransaction> {
    const [transaction] = await db
      .insert(gemTransactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getUserGemTransactions(userId: string): Promise<GemTransaction[]> {
    return await db
      .select()
      .from(gemTransactions)
      .where(eq(gemTransactions.userId, userId))
      .orderBy(sql`${gemTransactions.createdAt} DESC`);
  }

  async createGemPurchase(insertPurchase: InsertGemPurchase): Promise<GemPurchase> {
    const [purchase] = await db
      .insert(gemPurchases)
      .values(insertPurchase)
      .returning();
    return purchase;
  }

  async getUserGemPurchases(userId: string): Promise<GemPurchase[]> {
    return await db
      .select()
      .from(gemPurchases)
      .where(eq(gemPurchases.userId, userId))
      .orderBy(sql`${gemPurchases.purchasedAt} DESC`);
  }

  async addGemsToUser(userId: string, amount: number, description: string, relatedId?: string): Promise<User> {
    // Start transaction
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newGemAmount = (user.gems || 0) + amount;
    
    // Update user gems
    const updatedUser = await this.updateUserGems(userId, newGemAmount);
    
    // Create transaction record
    await this.createGemTransaction({
      userId,
      transactionType: 'reward',
      amount,
      description,
      relatedId,
    });

    return updatedUser;
  }

  async spendGemsFromUser(userId: string, amount: number, description: string, relatedId?: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if ((user.gems || 0) < amount) {
      throw new Error('Insufficient gems');
    }

    const newGemAmount = (user.gems || 0) - amount;
    
    // Update user gems
    const updatedUser = await this.updateUserGems(userId, newGemAmount);
    
    // Create transaction record (negative amount for spending)
    await this.createGemTransaction({
      userId,
      transactionType: 'spend',
      amount: -amount,
      description,
      relatedId,
    });

    return updatedUser;
  }

  // Season/Battlepass methods implementation
  async createSeason(season: InsertSeason): Promise<Season> {
    const [newSeason] = await db
      .insert(seasons)
      .values(season)
      .returning();
    return newSeason;
  }

  async getCurrentSeason(): Promise<Season | undefined> {
    const [currentSeason] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.isActive, true))
      .limit(1);
    return currentSeason || undefined;
  }

  async addSeasonXPToUser(userId: string, xpAmount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const newSeasonXP = (user.seasonXp || 0) + xpAmount;
    
    const [updatedUser] = await db
      .update(users)
      .set({ seasonXp: newSeasonXP, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // Calculate next season end date (30th of current or next month)
  private getNextSeasonEndDate(): Date {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    
    // If we're past the 30th of this month, go to next month
    let targetMonth = currentMonth;
    let targetYear = currentYear;
    
    if (currentDay > 30) {
      targetMonth = currentMonth + 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear = currentYear + 1;
      }
    }
    
    // Set to 30th of target month at 23:59:59
    const endDate = new Date(targetYear, targetMonth, 30, 23, 59, 59, 999);
    return endDate;
  }

  async getTimeUntilSeasonEnd(): Promise<{ days: number; hours: number; minutes: number }> {
    const currentSeason = await this.getCurrentSeason();
    const nextSeasonEnd = this.getNextSeasonEndDate();
    
    if (!currentSeason) {
      // If no active season, create a new one ending on 30th of month
      const now = new Date();
      const monthName = nextSeasonEnd.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      
      await this.createSeason({
        name: `Season ${monthName}`,
        startDate: now,
        endDate: nextSeasonEnd,
        maxXp: 500,
        isActive: true
      });
    }
    
    const now = new Date();
    const timeDiff = nextSeasonEnd.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      // Season expired, reset needed
      await this.resetSeasonProgress();
      // Recalculate for new season
      const newNextSeasonEnd = this.getNextSeasonEndDate();
      const newTimeDiff = newNextSeasonEnd.getTime() - now.getTime();
      const newDays = Math.floor(newTimeDiff / (1000 * 60 * 60 * 24));
      const newHours = Math.floor((newTimeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const newMinutes = Math.floor((newTimeDiff % (1000 * 60 * 60)) / (1000 * 60));
      return { days: newDays, hours: newHours, minutes: newMinutes };
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  }

  async resetSeasonProgress(): Promise<void> {
    // Deactivate current season
    await db
      .update(seasons)
      .set({ isActive: false })
      .where(eq(seasons.isActive, true));
    
    // Reset season XP for all users
    await db
      .update(users)
      .set({ seasonXp: 0 });
    
    // Create a new season ending on 30th of next month
    const now = new Date();
    const endDate = this.getNextSeasonEndDate();
    const monthName = endDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    await this.createSeason({
      name: `Season ${monthName}`,
      startDate: now,
      endDate: endDate,
      maxXp: 500,
      isActive: true
    });
  }

  // Battle Pass Rewards methods implementation
  async claimBattlePassReward(userId: string, tier: number, isPremium: boolean): Promise<BattlePassReward | null> {
    // Get current season
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) return null;

    // Check if already claimed
    const hasAlreadyClaimed = await this.hasUserClaimedReward(userId, tier, isPremium, currentSeason.id);
    if (hasAlreadyClaimed) return null;

    // Define rewards based on tier and type
    const rewardContent = this.getBattlePassRewardContent(tier, isPremium);
    
    // Add reward to user
    const user = await this.getUser(userId);
    if (!user) return null;

    if (rewardContent.type === 'coins') {
      await this.updateUserCoins(userId, (user.coins || 0) + rewardContent.amount);
    } else if (rewardContent.type === 'gems') {
      await this.updateUserGems(userId, (user.gems || 0) + rewardContent.amount);
    }

    // Record the claimed reward
    const [claimedReward] = await db
      .insert(battlePassRewards)
      .values({
        userId,
        seasonId: currentSeason.id,
        tier,
        isPremium,
        rewardType: rewardContent.type,
        rewardAmount: rewardContent.amount,
      })
      .returning();

    return claimedReward;
  }

  async getUserBattlePassRewards(userId: string, seasonId?: string): Promise<BattlePassReward[]> {
    if (seasonId) {
      return await db
        .select()
        .from(battlePassRewards)
        .where(and(eq(battlePassRewards.userId, userId), eq(battlePassRewards.seasonId, seasonId)));
    } else {
      return await db
        .select()
        .from(battlePassRewards)
        .where(eq(battlePassRewards.userId, userId));
    }
  }

  async hasUserClaimedReward(userId: string, tier: number, isPremium: boolean, seasonId?: string): Promise<boolean> {
    let whereCondition = and(
      eq(battlePassRewards.userId, userId),
      eq(battlePassRewards.tier, tier),
      eq(battlePassRewards.isPremium, isPremium)
    );

    if (seasonId) {
      whereCondition = and(whereCondition, eq(battlePassRewards.seasonId, seasonId));
    }

    const [reward] = await db
      .select()
      .from(battlePassRewards)
      .where(whereCondition)
      .limit(1);

    return !!reward;
  }

  private getBattlePassRewardContent(tier: number, isPremium: boolean): { type: 'coins' | 'gems'; amount: number } {
    if (isPremium) {
      return {
        type: 'gems',
        amount: tier * 5 // 5, 10, 15, 20, 25 gems
      };
    } else {
      return {
        type: 'coins',
        amount: tier * 100 // 100, 200, 300, 400, 500 coins
      };
    }
  }

  // Card Back methods implementation
  async getAllCardBacks(): Promise<CardBack[]> {
    return this.loadCardBacksFromJson().sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCardBack(id: string): Promise<CardBack | undefined> {
    const cardBacks = this.loadCardBacksFromJson();
    
    // Handle legacy "classic" card back ID by using the first common card back
    if (id === "classic") {
      const commonCardBacks = cardBacks.filter(cb => cb.rarity === 'COMMON');
      return commonCardBacks.length > 0 ? commonCardBacks[0] : cardBacks[0];
    }
    
    return cardBacks.find(cardBack => cardBack.id === id);
  }

  async createCardBack(insertCardBack: InsertCardBack): Promise<CardBack> {
    const [cardBack] = await db
      .insert(cardBacks)
      .values(insertCardBack)
      .returning();
    return cardBack;
  }

  async updateCardBack(id: string, updates: Partial<CardBack>): Promise<CardBack> {
    const [cardBack] = await db
      .update(cardBacks)
      .set(updates)
      .where(eq(cardBacks.id, id))
      .returning();
    if (!cardBack) {
      throw new Error('Card back not found');
    }
    return cardBack;
  }

  // User Card Back methods implementation
  async getUserCardBacks(userId: string): Promise<(UserCardBack & { cardBack: CardBack })[]> {
    const userCardBacksWithDetails = await db
      .select({
        id: userCardBacks.id,
        userId: userCardBacks.userId,
        cardBackId: userCardBacks.cardBackId,
        source: userCardBacks.source,
        acquiredAt: userCardBacks.acquiredAt,
        cardBack: {
          id: cardBacks.id,
          name: cardBacks.name,
          rarity: cardBacks.rarity,
          priceGems: cardBacks.priceGems,
          imageUrl: cardBacks.imageUrl,
          isActive: cardBacks.isActive,
          createdAt: cardBacks.createdAt,
        }
      })
      .from(userCardBacks)
      .innerJoin(cardBacks, eq(userCardBacks.cardBackId, cardBacks.id))
      .where(eq(userCardBacks.userId, userId))
      .orderBy(
        sql`CASE 
          WHEN ${cardBacks.rarity} = 'COMMON' THEN 1
          WHEN ${cardBacks.rarity} = 'RARE' THEN 2
          WHEN ${cardBacks.rarity} = 'SUPER_RARE' THEN 3
          WHEN ${cardBacks.rarity} = 'LEGENDARY' THEN 4
          ELSE 5 END`,
        cardBacks.name
      );

    return userCardBacksWithDetails
      .filter(item => item && item.cardBack) // Filter out any null/undefined items
      .map(item => ({
        id: item.id,
        userId: item.userId,
        cardBackId: item.cardBackId,
        source: item.source,
        acquiredAt: item.acquiredAt,
        cardBack: {
          id: item.cardBack.id,
          name: item.cardBack.name || '',
          rarity: item.cardBack.rarity || 'COMMON',
          priceGems: item.cardBack.priceGems || 0,
          imageUrl: item.cardBack.imageUrl || '',
          isActive: item.cardBack.isActive ?? true,
          createdAt: item.cardBack.createdAt || new Date()
        } as CardBack
      }));
  }

  async addCardBackToUser(userId: string, cardBackId: string): Promise<UserCardBack> {
    // Check if user already has this card back
    const existing = await this.hasUserCardBack(userId, cardBackId);
    if (existing) {
      throw new Error('User already owns this card back');
    }

    const [userCardBack] = await db
      .insert(userCardBacks)
      .values({ userId, cardBackId, source: 'purchase' })
      .returning();
    return userCardBack;
  }

  async hasUserCardBack(userId: string, cardBackId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(userCardBacks)
      .where(and(eq(userCardBacks.userId, userId), eq(userCardBacks.cardBackId, cardBackId)))
      .limit(1);
    return !!existing;
  }

  async getAvailableCardBacksForPurchase(userId: string): Promise<CardBack[]> {
    // Get all card backs that the user doesn't own
    const ownedCardBackIds = await db
      .select({ cardBackId: userCardBacks.cardBackId })
      .from(userCardBacks)
      .where(eq(userCardBacks.userId, userId));

    const ownedIds = ownedCardBackIds.map(item => item.cardBackId);
    
    // Load all card backs from JSON
    const allCardBacks = this.loadCardBacksFromJson();

    if (ownedIds.length === 0) {
      // User owns no card backs, return all
      return allCardBacks;
    }

    // Filter out owned card backs
    return allCardBacks.filter(cardBack => !ownedIds.includes(cardBack.id));
  }

  async buyRandomCardBack(userId: string): Promise<{ cardBack: CardBack; duplicate: boolean }> {
    // CRITICAL: Health check before processing purchase to prevent foreign key errors
    const healthCheck = await this.getCardBacksHealthCheck();
    if (!healthCheck.isHealthy) {
      console.error(`❌ CRITICAL: Card backs not healthy - ${healthCheck.count}/${healthCheck.minRequired} available`);
      throw new Error('Mystery pack temporarily unavailable - please try again later');
    }

    return await db.transaction(async (tx) => {
      // CRITICAL: Lock user row with SELECT FOR UPDATE to prevent race conditions
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      
      if (!user) throw new Error('User not found');
      if ((user.gems || 0) < 50) throw new Error('Insufficient gems');

      // Get available card backs for purchase from JSON (no database lock needed for JSON data)
      const availableCardBacks = await this.getAvailableCardBacksForPurchase(userId);
      
      if (availableCardBacks.length === 0) {
        // CRITICAL SECURITY FIX: Reject purchase when all card backs owned
        // This prevents the infinite gem farming exploit
        throw new Error('All card backs owned');
      }

      // Determine rarity based on probabilities
      const rarity = this.getRandomCardBackRarity();
      
      // Filter available card backs by rarity
      const availableByRarity = availableCardBacks.filter(cb => cb.rarity === rarity);
      
      // If no card backs available in this rarity, pick from any available
      const finalAvailable = availableByRarity.length > 0 ? availableByRarity : availableCardBacks;
      
      // Select random card back
      const randomIndex = Math.floor(Math.random() * finalAvailable.length);
      const selectedCardBack = finalAvailable[randomIndex];

      // Atomically deduct gems within the locked transaction
      const newGemAmount = (user.gems || 0) - 50;
      await tx
        .update(users)
        .set({ gems: newGemAmount, updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Record gem transaction first (in case of constraint violations)
      await tx
        .insert(gemTransactions)
        .values({
          userId,
          transactionType: 'spend',
          amount: -100,
          description: `Purchased card back: ${selectedCardBack.name}`
        });

      // Add card back to user collection (protected by UNIQUE constraint)
      try {
        await tx
          .insert(userCardBacks)
          .values({ userId, cardBackId: selectedCardBack.id, source: 'purchase' });
      } catch (error: any) {
        // Handle duplicate key constraint violation gracefully
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('UNIQUE constraint')) {
          throw new Error('Card back already owned');
        }
        
        // CRITICAL: Handle foreign key constraint violation (card_back doesn't exist)
        if (error.code === '23503' || error.message?.includes('violates foreign key constraint') || error.message?.includes('is not present in table')) {
          console.error(`❌ CRITICAL: Card back "${selectedCardBack.id}" missing from database during purchase`);
          console.error(`📊 Error details:`, { 
            cardBackId: selectedCardBack.id, 
            cardBackName: selectedCardBack.name,
            errorCode: error.code,
            errorMessage: error.message 
          });
          throw new Error('Card back unavailable - please try again');
        }
        
        throw error;
      }

      // Record the purchase for analytics
      await tx
        .insert(gemPurchases)
        .values({
          userId,
          itemType: 'card_back',
          itemId: selectedCardBack.id,
          gemCost: 100
        });

      return { cardBack: selectedCardBack, duplicate: false };
    });
  }

  async updateUserSelectedCardBack(userId: string, cardBackId: string): Promise<User> {
    // Handle legacy "classic" card back ID
    if (cardBackId === "classic") {
      const cardBacks = this.loadCardBacksFromJson();
      const commonCardBacks = cardBacks.filter(cb => cb.rarity === 'COMMON');
      const defaultCardBack = commonCardBacks.length > 0 ? commonCardBacks[0] : cardBacks[0];
      
      if (defaultCardBack) {
        // Ensure user has this card back, if not add it
        const hasCardBack = await this.hasUserCardBack(userId, defaultCardBack.id);
        if (!hasCardBack) {
          await this.addCardBackToUser(userId, defaultCardBack.id);
        }
        return await this.updateUser(userId, { selectedCardBackId: defaultCardBack.id });
      }
    }
    
    // Verify user owns this card back
    const hasCardBack = await this.hasUserCardBack(userId, cardBackId);
    if (!hasCardBack) {
      throw new Error('User does not own this card back');
    }

    return await this.updateUser(userId, { selectedCardBackId: cardBackId });
  }

  private getRandomCardBackRarity(): string {
    const rand = Math.random() * 100;
    
    if (rand <= 60) return 'COMMON';        // 0-60% (60%)
    if (rand <= 85) return 'RARE';          // 61-85% (25%)
    if (rand <= 95) return 'SUPER_RARE';    // 86-95% (10%)
    return 'LEGENDARY';                     // 96-100% (5%)
  }
}

export const storage = new DatabaseStorage();
