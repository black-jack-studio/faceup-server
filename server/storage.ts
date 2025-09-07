import { type User, type InsertUser, type GameStats, type InsertGameStats, type Inventory, type InsertInventory, type DailySpin, type InsertDailySpin, type Achievement, type InsertAchievement, type WeeklyLeaderboard } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private gameStats: Map<string, GameStats>;
  private inventory: Map<string, Inventory>;
  private dailySpins: Map<string, DailySpin>;
  private achievements: Map<string, Achievement>;
  private weeklyLeaderboard: Map<string, WeeklyLeaderboard>;

  constructor() {
    this.users = new Map();
    this.gameStats = new Map();
    this.inventory = new Map();
    this.dailySpins = new Map();
    this.achievements = new Map();
    this.weeklyLeaderboard = new Map();
    
    // Seed some sample leaderboard data
    this.seedLeaderboard();
  }

  private seedLeaderboard() {
    const sampleUsers = [
      { username: 'jack', weeklyXp: 13600, avatar: '🤠', medal: '🥇' },
      { username: 'evelyn', weeklyXp: 8350, avatar: '🙋‍♀️', medal: '🥈' },
      { username: 'mike', weeklyXp: 6264, avatar: '👻', medal: '🥉' },
    ];

    sampleUsers.forEach((userData, index) => {
      const userId = randomUUID();
      const weekStarting = new Date();
      weekStarting.setDate(weekStarting.getDate() - weekStarting.getDay()); // Start of week
      
      const leaderboardEntry: WeeklyLeaderboard = {
        id: randomUUID(),
        userId,
        weekStarting,
        weeklyXp: userData.weeklyXp,
        position: index + 1,
      };
      
      this.weeklyLeaderboard.set(leaderboardEntry.id, leaderboardEntry);

      // Create corresponding user
      const user: User = {
        id: userId,
        username: userData.username,
        email: `${userData.username}@example.com`,
        password: 'dummy',
        xp: userData.weeklyXp,
        level: Math.floor(userData.weeklyXp / 1000) + 1,
        coins: 1000,
        gems: 0,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.users.set(userId, user);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      xp: 0,
      level: 1,
      coins: 1000, // Starting coins
      gems: 0,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = { 
      ...user, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createGameStats(insertStats: InsertGameStats): Promise<GameStats> {
    const id = randomUUID();
    const now = new Date();
    const stats: GameStats = {
      ...insertStats,
      id,
      handsPlayed: insertStats.handsPlayed || 0,
      handsWon: insertStats.handsWon || 0,
      handsLost: insertStats.handsLost || 0,
      handsPushed: insertStats.handsPushed || 0,
      totalWinnings: insertStats.totalWinnings || 0,
      totalLosses: insertStats.totalLosses || 0,
      blackjacks: insertStats.blackjacks || 0,
      busts: insertStats.busts || 0,
      correctDecisions: insertStats.correctDecisions || 0,
      totalDecisions: insertStats.totalDecisions || 0,
      createdAt: now,
      updatedAt: now,
    };
    this.gameStats.set(id, stats);
    return stats;
  }

  async getUserStats(userId: string): Promise<any> {
    const userStats = Array.from(this.gameStats.values()).filter(
      stats => stats.userId === userId
    );

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
    
    const userSpins = Array.from(this.dailySpins.values()).filter(
      spin => spin.userId === userId
    );
    
    const todaysSpin = userSpins.find(spin => {
      const spinDate = new Date(spin.lastSpinAt);
      spinDate.setHours(0, 0, 0, 0);
      return spinDate.getTime() === today.getTime();
    });
    
    return !todaysSpin;
  }

  async createDailySpin(insertSpin: InsertDailySpin): Promise<DailySpin> {
    const id = randomUUID();
    const now = new Date();
    const spin: DailySpin = {
      ...insertSpin,
      id,
      lastSpinAt: now,
    };
    this.dailySpins.set(id, spin);
    return spin;
  }

  async createInventory(insertItem: InsertInventory): Promise<Inventory> {
    const id = randomUUID();
    const now = new Date();
    const item: Inventory = {
      ...insertItem,
      id,
      acquiredAt: now,
    };
    this.inventory.set(id, item);
    return item;
  }

  async getUserInventory(userId: string): Promise<Inventory[]> {
    return Array.from(this.inventory.values()).filter(
      item => item.userId === userId
    );
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const id = randomUUID();
    const now = new Date();
    const achievement: Achievement = {
      ...insertAchievement,
      id,
      unlockedAt: now,
    };
    this.achievements.set(id, achievement);
    return achievement;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return Array.from(this.achievements.values()).filter(
      achievement => achievement.userId === userId
    );
  }

  async getWeeklyLeaderboard(): Promise<any[]> {
    const weekStarting = new Date();
    weekStarting.setDate(weekStarting.getDate() - weekStarting.getDay());
    weekStarting.setHours(0, 0, 0, 0);
    
    const weeklyEntries = Array.from(this.weeklyLeaderboard.values())
      .filter(entry => {
        const entryWeek = new Date(entry.weekStarting);
        entryWeek.setHours(0, 0, 0, 0);
        return entryWeek.getTime() === weekStarting.getTime();
      })
      .sort((a, b) => b.weeklyXp - a.weeklyXp);

    // Join with user data and add display properties
    const leaderboardWithUsers = await Promise.all(
      weeklyEntries.map(async (entry, index) => {
        const user = await this.getUser(entry.userId);
        const avatars = ['🤠', '🙋‍♀️', '👻', '🧑‍💻', '👨‍🚀', '🦸‍♀️', '🧙‍♂️', '🦹‍♀️'];
        const medals = ['🥇', '🥈', '🥉', '🏅', '🏆', '⭐', '💫', '✨'];
        
        return {
          id: entry.userId,
          username: user?.username || 'Unknown',
          weeklyXp: entry.weeklyXp,
          position: index + 1,
          avatar: avatars[index % avatars.length],
          medal: medals[Math.min(index, medals.length - 1)],
        };
      })
    );

    return leaderboardWithUsers.slice(0, 10); // Top 10
  }

  async updateWeeklyLeaderboard(userId: string, weeklyXp: number): Promise<void> {
    const weekStarting = new Date();
    weekStarting.setDate(weekStarting.getDate() - weekStarting.getDay());
    weekStarting.setHours(0, 0, 0, 0);

    // Find existing entry for this week
    const existingEntry = Array.from(this.weeklyLeaderboard.values()).find(
      entry => entry.userId === userId && 
      new Date(entry.weekStarting).getTime() === weekStarting.getTime()
    );

    if (existingEntry) {
      existingEntry.weeklyXp = weeklyXp;
      this.weeklyLeaderboard.set(existingEntry.id, existingEntry);
    } else {
      const newEntry: WeeklyLeaderboard = {
        id: randomUUID(),
        userId,
        weekStarting,
        weeklyXp,
        position: null, // Will be calculated when fetching leaderboard
      };
      this.weeklyLeaderboard.set(newEntry.id, newEntry);
    }
  }
}

export const storage = new MemStorage();
