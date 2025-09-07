import { users, gameStats, inventory, dailySpins, achievements, weeklyLeaderboard, type User, type InsertUser, type GameStats, type InsertGameStats, type Inventory, type InsertInventory, type DailySpin, type InsertDailySpin, type Achievement, type InsertAchievement, type WeeklyLeaderboard } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserCoins(id: string, newAmount: number): Promise<User>;
  
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
  
  // Leaderboard methods
  getWeeklyLeaderboard(): Promise<any[]>;
  updateWeeklyLeaderboard(userId: string, weeklyXp: number): Promise<void>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        xp: 0,
        level: 1,
        coins: 5000,
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

  async getWeeklyLeaderboard(): Promise<any[]> {
    const weekStarting = new Date();
    weekStarting.setDate(weekStarting.getDate() - weekStarting.getDay());
    weekStarting.setHours(0, 0, 0, 0);
    
    const leaderboardEntries = await db
      .select({
        userId: weeklyLeaderboard.userId,
        weeklyXp: weeklyLeaderboard.weeklyXp,
        username: users.username,
      })
      .from(weeklyLeaderboard)
      .leftJoin(users, eq(weeklyLeaderboard.userId, users.id))
      .where(eq(weeklyLeaderboard.weekStarting, weekStarting))
      .orderBy(sql`${weeklyLeaderboard.weeklyXp} DESC`)
      .limit(10);

    // Add display properties
    const avatars = ['🤠', '🙋‍♀️', '👻', '🧑‍💻', '👨‍🚀', '🦸‍♀️', '🧙‍♂️', '🦹‍♀️'];
    const medals = ['🥇', '🥈', '🥉', '🏅', '🏆', '⭐', '💫', '✨'];
    
    return leaderboardEntries.map((entry, index) => ({
      id: entry.userId,
      username: entry.username || 'Unknown',
      weeklyXp: entry.weeklyXp,
      position: index + 1,
      avatar: avatars[index % avatars.length],
      medal: medals[Math.min(index, medals.length - 1)],
    }));
  }

  async updateWeeklyLeaderboard(userId: string, weeklyXp: number): Promise<void> {
    const weekStarting = new Date();
    weekStarting.setDate(weekStarting.getDate() - weekStarting.getDay());
    weekStarting.setHours(0, 0, 0, 0);

    // Use upsert pattern with ON CONFLICT
    await db
      .insert(weeklyLeaderboard)
      .values({
        userId,
        weekStarting,
        weeklyXp,
        position: null,
      })
      .onConflictDoUpdate({
        target: [weeklyLeaderboard.userId, weeklyLeaderboard.weekStarting],
        set: { weeklyXp },
      });
  }
}

export const storage = new DatabaseStorage();
