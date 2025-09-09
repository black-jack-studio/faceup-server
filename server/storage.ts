import { users, gameStats, inventory, dailySpins, achievements, challenges, userChallenges, gemTransactions, gemPurchases, seasons, battlePassRewards, type User, type InsertUser, type GameStats, type InsertGameStats, type Inventory, type InsertInventory, type DailySpin, type InsertDailySpin, type Achievement, type InsertAchievement, type Challenge, type UserChallenge, type InsertChallenge, type InsertUserChallenge, type GemTransaction, type InsertGemTransaction, type GemPurchase, type InsertGemPurchase, type Season, type InsertSeason, type BattlePassReward, type InsertBattlePassReward } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { randomUUID } from "crypto";

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
  
  // Battle Pass methods
  generateBattlePassReward(): { type: 'coins' | 'gems'; amount: number };
  getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<number[]>;
  claimBattlePassTier(userId: string, seasonId: string, tier: number): Promise<{ type: 'coins' | 'gems'; amount: number }>;
  
  // Game stats methods
  createGameStats(stats: InsertGameStats): Promise<GameStats>;
  getUserStats(userId: string): Promise<any>;
  
  // Daily spin methods
  canUserSpin(userId: string): Promise<boolean>;
  createDailySpin(spin: InsertDailySpin): Promise<DailySpin>;
  
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
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
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

  async getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<number[]> {
    const claimedRewards = await db
      .select({ tier: battlePassRewards.tier })
      .from(battlePassRewards)
      .where(
        and(
          eq(battlePassRewards.userId, userId),
          eq(battlePassRewards.isPremium, false)
        )
      );
    
    return claimedRewards.map(r => r.tier);
  }

  async claimBattlePassTier(userId: string, seasonId: string, tier: number): Promise<{ type: 'coins' | 'gems'; amount: number }> {
    // Check if tier is already claimed
    const existingClaim = await db
      .select()
      .from(battlePassRewards)
      .where(
        and(
          eq(battlePassRewards.userId, userId),
          eq(battlePassRewards.tier, tier),
          eq(battlePassRewards.isPremium, false)
        )
      );

    if (existingClaim.length > 0) {
      throw new Error('This tier has already been claimed');
    }

    // Generate reward
    const reward = this.generateBattlePassReward();

    // Save the claimed reward without season reference for now
    await db
      .insert(battlePassRewards)
      .values({
        userId,
        seasonId: null as any, // Temporarily bypass season constraint
        tier,
        isPremium: false,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysSpin = await db
      .select()
      .from(dailySpins)
      .where(eq(dailySpins.userId, userId))
      .limit(1);
    
    if (todaysSpin.length === 0) return true;
    
    const spinDate = new Date(todaysSpin[0].lastSpinAt || new Date());
    spinDate.setHours(0, 0, 0, 0);
    
    return spinDate.getTime() !== today.getTime();
  }

  async canUserSpinWheel(userId: string): Promise<boolean> {
    const userSpin = await db
      .select()
      .from(dailySpins)
      .where(eq(dailySpins.userId, userId))
      .limit(1);
    
    if (userSpin.length === 0) return true;
    
    const lastSpinDate = userSpin[0].lastSpinAt;
    if (!lastSpinDate) return true;
    
    const now = new Date();
    const lastSpin = new Date(lastSpinDate);
    
    // Calculate French midnight (23:00 UTC for simplicity)
    const todayFrenchMidnight = new Date(now);
    todayFrenchMidnight.setUTCHours(23, 0, 0, 0);
    
    // If current time is before 23:00 UTC, use yesterday's midnight
    if (now.getUTCHours() < 23) {
      todayFrenchMidnight.setUTCDate(todayFrenchMidnight.getUTCDate() - 1);
    }
    
    const lastSpinFrenchMidnight = new Date(lastSpin);
    lastSpinFrenchMidnight.setUTCHours(23, 0, 0, 0);
    
    if (lastSpin.getUTCHours() < 23) {
      lastSpinFrenchMidnight.setUTCDate(lastSpinFrenchMidnight.getUTCDate() - 1);
    }
    
    return todayFrenchMidnight.getTime() !== lastSpinFrenchMidnight.getTime();
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
}

export const storage = new DatabaseStorage();
