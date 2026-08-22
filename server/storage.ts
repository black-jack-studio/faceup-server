import { users, gameStats, inventory, dailySpins, achievements, challenges, userChallenges, gemTransactions, gemPurchases, seasons, battlePassRewards, classicStreakLeaderboard, cardBacks, userCardBacks, betDrafts, config, friendships, rankRewardsClaimed, type User, type InsertUser, type GameStats, type InsertGameStats, type Inventory, type InsertInventory, type DailySpin, type InsertDailySpin, type Achievement, type InsertAchievement, type Challenge, type UserChallenge, type InsertChallenge, type InsertUserChallenge, type GemTransaction, type InsertGemTransaction, type GemPurchase, type InsertGemPurchase, type Season, type InsertSeason, type BattlePassReward, type InsertBattlePassReward, type ClassicStreakLeaderboard, type InsertClassicStreakLeaderboard, type CardBack, type InsertCardBack, type UserCardBack, type InsertUserCardBack, type BetDraft, type InsertBetDraft, type Config, type InsertConfig, type Friendship, type InsertFriendship, type RankRewardClaimed, type InsertRankRewardClaimed, activeGames, type ActiveGame, type InsertActiveGame, gameTables, type GameTable, type InsertGameTable, tableSeats, type TableSeat, type InsertTableSeat, tableInvites, type TableInvite, type InsertTableInvite } from "@shared/schema";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import { eq, sql, and, gte, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { generateUniqueReferralCode } from "./utils/referral";
import { ServerBlackjackEngine } from "./BlackjackEngine";
import { computeHandPayout, computeLegalActions, settleHandsAgainstDealer } from "./blackjackSettlement";
import type { Card, PlayerHand, GameAction } from "@shared/blackjack-types";


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

// The daily free spin resets at a fixed wall-clock hour in Paris time (handles DST via Intl, not a fixed UTC offset).
const FREE_SPIN_RESET_HOUR_PARIS = 1;

function getParisOffsetMinutes(date: Date): number {
  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")!.value;
  const match = offsetPart.match(/GMT([+-]\d+)/);
  return match ? parseInt(match[1], 10) * 60 : 60;
}

function getParisDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => +parts.find((p) => p.type === type)!.value;
  return { year: get("year"), month: get("month"), day: get("day") };
}

// The next fixed daily reset instant (in UTC) strictly after `from`.
function getNextParisResetAt(from: Date): Date {
  const { year, month, day } = getParisDateParts(from);
  const offsetMinutes = getParisOffsetMinutes(from);
  const resetOnDay = (y: number, mo: number, d: number) =>
    Date.UTC(y, mo - 1, d, FREE_SPIN_RESET_HOUR_PARIS, 0, 0, 0) - offsetMinutes * 60 * 1000;

  let reset = resetOnDay(year, month, day);
  if (reset <= from.getTime()) {
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    reset = resetOnDay(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
  }
  return new Date(reset);
}

// Daily win-streak: the boundary is the Paris calendar day itself (midnight-to-midnight,
// same as the daily challenges reset), not a fixed reset hour like the free spin above.
function getParisDateKey(date: Date): string {
  const { year, month, day } = getParisDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Whole-day difference between two "YYYY-MM-DD" Paris date keys (b - a). Going through
// Date.UTC on the same y/m/d avoids any DST-related fractional-day drift a raw ms diff on
// zoned instants could introduce.
function parisDateKeyDiffDays(a: string, b: string): number {
  const toUTC = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(b) - toUTC(a)) / (24 * 60 * 60 * 1000));
}

// Fixed 7-day reward cycle for the daily Classic-solo win-streak — server-authoritative so
// it can't be tampered with client-side. Day 7 is the big one, then it loops back to day 1.
// Coin amounts scaled down (Anatole, 2026-08-21) to stay in line with the 150-coin cap on
// daily challenge rewards rather than dwarfing them.
const DAILY_STREAK_REWARDS: { type: "coins" | "gems" | "bolts"; amount: number }[] = [
  { type: "coins", amount: 20 },
  { type: "coins", amount: 30 },
  { type: "bolts", amount: 1 },
  { type: "coins", amount: 50 },
  { type: "gems", amount: 3 },
  { type: "bolts", amount: 2 },
  { type: "gems", amount: 10 },
];

function getDailyStreakReward(streakDay: number): { type: "coins" | "gems" | "bolts"; amount: number } {
  return DAILY_STREAK_REWARDS[(streakDay - 1) % DAILY_STREAK_REWARDS.length];
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createAppleUser(user: { username: string; email: string; appleId: string; password: string }): Promise<User>;
  linkAppleId(userId: string, appleId: string): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  touchLastActive(id: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  updateUserCoins(id: string, newAmount: number): Promise<User>;
  updateUserGems(id: string, newAmount: number): Promise<User>;

  // XP and Level methods
  addXPToUser(userId: string, xpAmount: number): Promise<{ user: User; leveledUp: boolean; rewards?: { coins?: number; gems?: number } }>;
  calculateLevel(xp: number): number;
  getXPForLevel(level: number): number;
  generateLevelRewards(): { coins?: number; gems?: number };

  // Classic Mode win-streak methods
  incrementClassicStreak(userId: string): Promise<{ user: User; newStreak: number }>;
  resetClassicStreak(userId: string): Promise<{ user: User }>;
  upsertClassicWeeklyStreak(userId: string, streak: number): Promise<void>;
  getWeeklyClassicStreakLeaderboard(limit?: number): Promise<(ClassicStreakLeaderboard & { user: User; rank: number })[]>;
  getCurrentWeekStart(): Date;

  // Daily Classic-solo win-streak methods (consecutive calendar days, not consecutive wins).
  // Winning only advances the streak and flags that day's reward as claimable — it does NOT
  // credit currency; the player has to open the streak popup and claim it (claimDailyStreakReward).
  recordDailyStreakWin(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakDay: number;
    justAdvanced: boolean; // false when today had already been counted (e.g. a 2nd win the same day)
  }>;
  getDailyStreakStatus(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    wonToday: boolean;
    claimableReward: { type: "coins" | "gems" | "bolts"; amount: number } | null;
    cycleRewards: { day: number; type: "coins" | "gems" | "bolts"; amount: number }[];
  }>;
  claimDailyStreakReward(userId: string): Promise<
    | { claimed: false }
    | { claimed: true; reward: { type: "coins" | "gems" | "bolts"; amount: number }; currentStreak: number }
  >;

  // Battle Pass methods
  generateBattlePassReward(tier: number): { type: 'coins' | 'gems' | 'bolts'; amount: number };
  generatePremiumBattlePassReward(tier: number): { type: 'coins' | 'gems' | 'bolts'; amount: number };
  getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<{ freeTiers: number[], premiumTiers: number[] }>;
  claimBattlePassTier(userId: string, seasonId: string, tier: number, isPremium?: boolean): Promise<{ coins: number; gems: number; bolts: number }>;

  // Game stats methods
  createGameStats(stats: InsertGameStats): Promise<GameStats>;
  getGameStats(id: string): Promise<GameStats | undefined>;
  updateGameStats(id: string, updates: Partial<GameStats>): Promise<GameStats>;
  getUserStats(userId: string): Promise<any>;

  // Daily spin methods
  canUserSpin(userId: string): Promise<boolean>;
  getFreeSpinStatus(userId: string): Promise<{ canSpin: boolean; secondsUntilReset: number }>;
  getLastFreeSpinAt(userId: string): Promise<Date | null>;
  createDailySpin(spin: InsertDailySpin): Promise<DailySpin>;
  createFreeDailySpin(userId: string, reward: any): Promise<DailySpin>;

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
  hasCompletedTodaysChallenges(userId: string): Promise<boolean>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  assignChallengeToUser(userId: string, challengeId: string): Promise<UserChallenge>;
  updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<UserChallenge | null>;
  completeChallengeForUser(userId: string, challengeId: string): Promise<UserChallenge | null>;
  markChallengeRewardAsClaimed(userId: string, userChallengeId: string): Promise<void>;
  removeUserChallenge(userId: string, challengeId: string): Promise<void>;
  cleanupExpiredChallenges(): Promise<void>;

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

  // New Season Reset methods
  resetAllUserSeasonProgress(): Promise<void>;
  clearBattlePassRewards(): Promise<void>;
  resetAllUserRanks(): Promise<void>;
  clearRankRewardsClaimed(): Promise<void>;
  addSeasonHandsWon(userId: string, amount: number): Promise<void>;
  createOrUpdateSeason(seasonId: string, seasonName: string): Promise<Season>;

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

  // Bet Draft methods
  createBetDraft(betDraft: InsertBetDraft): Promise<BetDraft>;
  getBetDraft(betId: string): Promise<BetDraft | undefined>;
  deleteBetDraft(betId: string): Promise<void>;
  cleanupExpiredBetDrafts(): Promise<void>;

  // Bolts currency (earned via Battle Pass/Wheel of Fortune, spent in the Shop)
  getUserBolts(userId: string): Promise<number>;
  updateUserBolts(userId: string, newCount: number): Promise<void>;

  // Server-authoritative active games
  createActiveGame(game: InsertActiveGame): Promise<ActiveGame>;
  getActiveGame(id: string): Promise<ActiveGame | undefined>;
  getActiveGameForUser(userId: string): Promise<ActiveGame | undefined>;
  updateActiveGame(id: string, updates: Partial<ActiveGame>): Promise<ActiveGame>;
  completeActiveGame(id: string): Promise<ActiveGame>;

  // Game tables (Play with Friends — lobby + the shared hand itself)
  createGameTable(hostUserId: string, mode: string): Promise<{ table: GameTable; seats: TableSeat[] }>;
  joinTableByCode(code: string, userId: string): Promise<{ tableId: string; seat: TableSeat }>;
  startTableHand(tableId: string, hostUserId: string): Promise<void>;
  placeTableBet(tableId: string, userId: string, amount: number): Promise<{ settled: boolean }>;
  applyTableAction(tableId: string, userId: string, action: string): Promise<{ settled: boolean }>;
  getGameTableWithSeats(tableId: string): Promise<{ table: GameTable; seats: (TableSeat & { username: string; selectedAvatarId: string | null })[] } | undefined>;
  getUserActiveTable(userId: string): Promise<GameTable | undefined>;
  addTableSeat(tableId: string, userId: string, position: string): Promise<TableSeat>;
  leaveTable(tableId: string, userId: string): Promise<{ tableClosed: boolean; settled: boolean }>;
  createTableInvite(tableId: string, inviterUserId: string, inviteeUserId: string): Promise<TableInvite>;
  getPendingInvitesForUser(userId: string): Promise<(TableInvite & { table: GameTable; inviterUsername: string })[]>;
  getTableInvite(id: string): Promise<TableInvite | undefined>;
  updateTableInviteStatus(id: string, status: string): Promise<TableInvite>;
  acceptTableInvite(inviteId: string, userId: string): Promise<{ tableId: string; seat: TableSeat }>;

  // Config methods
  getConfig(key: string): Promise<any>;
  setConfig(key: string, value: any): Promise<void>;
  claimDailyKey(key: string): Promise<boolean>;

  // Friends methods
  searchUsersByUsername(query: string, excludeUserId?: string): Promise<User[]>;
  sendFriendRequest(requesterId: string, recipientId: string): Promise<Friendship>;
  acceptFriendRequest(requesterId: string, recipientId: string): Promise<Friendship>;
  rejectFriendRequest(requesterId: string, recipientId: string): Promise<void>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  getUserFriends(userId: string): Promise<(User & { friendshipId: string })[]>;
  getFriendRequests(userId: string): Promise<(Friendship & { requester: User })[]>;
  areFriends(userId1: string, userId2: string): Promise<boolean>;

  // Rank Rewards methods
  getUserClaimedRankRewards(userId: string): Promise<RankRewardClaimed[]>;
  claimRankReward(userId: string, rankKey: string, gemsAwarded: number): Promise<RankRewardClaimed>;
  hasUserClaimedRankReward(userId: string, rankKey: string): Promise<boolean>;
}

// Fixed multiplayer turn order — bottom (host) always acts first, then left, then right.
// No wraparound: once the last occupied seat's hand is done, the hand moves to settlement.
const TABLE_SEAT_ORDER = ["bottom", "left", "right"] as const;

// Same style as generateUniqueReferralCode (server/utils/referral.ts) — a short code a host
// can share outside the app (text message, etc.) so a friend can join without needing to
// already be in the invitee's friends list.
async function generateUniqueTableCode(): Promise<string> {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const existing = await db.select({ id: gameTables.id }).from(gameTables).where(eq(gameTables.code, code)).limit(1);
    if (existing.length === 0) return code;
  }
  throw new Error("Failed to generate a unique table code after 10 attempts");
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
            // Card back already exists, update it with new data (especially imageUrl)
            await db
              .update(cardBacks)
              .set({
                name: cardBack.name,
                rarity: cardBack.rarity,
                priceGems: cardBack.priceGems,
                imageUrl: cardBack.imageUrl,
                isActive: cardBack.isActive
              })
              .where(eq(cardBacks.id, cardBack.id));

            synced++;
            console.log(`🔄 Updated "${cardBack.name}" (${cardBack.id}) - ${cardBack.rarity} - ${cardBack.imageUrl}`);
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
      const minRequired = 0; // Card backs are optional, classic fallback is always available
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

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
    return user || undefined;
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate unique referral code for the new user
    const referralCode = await generateUniqueReferralCode();

    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        xp: 0,
        level: 1,
        gems: 0,
        referralCode,
      })
      .returning();
    return user;
  }

  // Sign-up completed via Apple: identity (email) comes from Apple's identity token, but
  // username/password are still chosen by the user, same as a normal account. Kept separate
  // from createUser() since the caller has already verified the token server-side and this
  // skips the email-verification-link step (Apple already proved the email).
  async createAppleUser(user: { username: string; email: string; appleId: string; password: string }): Promise<User> {
    const referralCode = await generateUniqueReferralCode();

    const [created] = await db
      .insert(users)
      .values({
        username: user.username,
        email: user.email,
        appleId: user.appleId,
        password: user.password,
        emailVerified: true, // Apple already verified this email before allowing sign-in
        xp: 0,
        level: 1,
        gems: 0,
        referralCode,
      })
      .returning();
    return created;
  }

  async linkAppleId(userId: string, appleId: string): Promise<User> {
    const [user] = await db
      .update(users)
      // Successfully signing in with Apple on this email is at least as strong a proof of
      // ownership as clicking an email verification link, so this also verifies the
      // account if it wasn't already (e.g. a password account that never confirmed).
      .set({ appleId, emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
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

  // Drives the online/offline dot on the friends list — not a precise presence system, just
  // "used the app recently" (see requireAuth's throttled call site). Deliberately a standalone
  // single-column write rather than going through updateUser, so it doesn't also bump
  // updatedAt on every authenticated request.
  async touchLastActive(id: string): Promise<void> {
    await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, id));
  }

  // Permanently deletes a user account and every row referencing it (Apple Guideline 5.1.1(v)).
  async deleteUser(id: string): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.delete(gameStats).where(eq(gameStats.userId, id));
      await tx.delete(inventory).where(eq(inventory.userId, id));
      await tx.delete(dailySpins).where(eq(dailySpins.userId, id));
      await tx.delete(achievements).where(eq(achievements.userId, id));
      await tx.delete(userChallenges).where(eq(userChallenges.userId, id));
      await tx.delete(battlePassRewards).where(eq(battlePassRewards.userId, id));
      await tx.delete(gemTransactions).where(eq(gemTransactions.userId, id));
      await tx.delete(gemPurchases).where(eq(gemPurchases.userId, id));
      await tx.delete(classicStreakLeaderboard).where(eq(classicStreakLeaderboard.userId, id));
      await tx.delete(userCardBacks).where(eq(userCardBacks.userId, id));
      await tx.delete(betDrafts).where(eq(betDrafts.userId, id));
      await tx.delete(rankRewardsClaimed).where(eq(rankRewardsClaimed.userId, id));
      await tx.delete(friendships).where(sql`${friendships.requesterId} = ${id} OR ${friendships.recipientId} = ${id}`);

      const [deletedUser] = await tx.delete(users).where(eq(users.id, id)).returning();
      if (!deletedUser) {
        throw new Error('User not found');
      }
    });
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

    // Check if we need to level up (100 XP per level)
    while (newCurrentLevelXP >= 100) {
      newCurrentLevelXP -= 100; // Reset to 0 and carry over
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
    return Math.floor(xp / 100) + 1;
  }

  getXPForLevel(level: number): number {
    return (level - 1) * 100;
  }

  getCurrentLevelXP(xp: number): number {
    return xp % 100;
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

  // Classic Mode win-streak methods — Classic has no premium gate, so every player counts.
  async incrementClassicStreak(userId: string): Promise<{ user: User; newStreak: number }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const newStreak = (user.currentStreakClassic || 0) + 1;
    const [updatedUser] = await db
      .update(users)
      .set({ currentStreakClassic: newStreak, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return { user: updatedUser, newStreak };
  }

  async resetClassicStreak(userId: string): Promise<{ user: User }> {
    const [updatedUser] = await db
      .update(users)
      .set({ currentStreakClassic: 0, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return { user: updatedUser };
  }

  // Upserts this week's best streak for the user — GREATEST() keeps whichever is higher
  // between the existing row and the new value, so a losing hand later in the week can
  // never lower an already-reached best.
  async upsertClassicWeeklyStreak(userId: string, streak: number): Promise<void> {
    const weekStart = this.getCurrentWeekStart();
    await db
      .insert(classicStreakLeaderboard)
      .values({ userId, weekStartDate: weekStart, bestStreak: streak })
      .onConflictDoUpdate({
        target: [classicStreakLeaderboard.userId, classicStreakLeaderboard.weekStartDate],
        set: {
          bestStreak: sql`GREATEST(${classicStreakLeaderboard.bestStreak}, ${streak})`,
          updatedAt: new Date(),
        },
      });
  }

  async getWeeklyClassicStreakLeaderboard(limit: number = 50): Promise<(ClassicStreakLeaderboard & { user: User; rank: number })[]> {
    const weekStart = this.getCurrentWeekStart();

    const entries = await db
      .select({
        id: classicStreakLeaderboard.id,
        userId: classicStreakLeaderboard.userId,
        weekStartDate: classicStreakLeaderboard.weekStartDate,
        bestStreak: classicStreakLeaderboard.bestStreak,
        createdAt: classicStreakLeaderboard.createdAt,
        updatedAt: classicStreakLeaderboard.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          selectedAvatarId: users.selectedAvatarId,
          membershipType: users.membershipType,
        }
      })
      .from(classicStreakLeaderboard)
      .innerJoin(users, eq(classicStreakLeaderboard.userId, users.id))
      .where(eq(classicStreakLeaderboard.weekStartDate, weekStart))
      .orderBy(sql`${classicStreakLeaderboard.bestStreak} DESC`)
      .limit(limit);

    return entries.map((entry: any, index: number) => ({
      ...entry,
      user: entry.user as User,
      rank: index + 1,
    }));
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

  // Daily Classic-solo win-streak (consecutive calendar days, not consecutive wins — see
  // incrementClassicStreak/resetClassicStreak above for that other one). Only advances the
  // streak and flags the day's reward as claimable — currency is credited separately by
  // claimDailyStreakReward, once the player actually opens the popup and claims it.
  async recordDailyStreakWin(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakDay: number;
    justAdvanced: boolean;
  }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const todayKey = getParisDateKey(new Date());
    const lastKey = user.lastStreakWinDate;
    const diff = lastKey ? parisDateKeyDiffDays(lastKey, todayKey) : null;

    if (diff === 0) {
      // Already counted today (e.g. a second winning hand the same day) — no-op, whatever
      // claim state is already there (claimed or still pending) is left untouched.
      const streakDay = ((user.currentDayStreak || 1) - 1) % DAILY_STREAK_REWARDS.length + 1;
      return {
        currentStreak: user.currentDayStreak || 0,
        longestStreak: user.longestDayStreak || 0,
        streakDay,
        justAdvanced: false,
      };
    }

    // diff === 1 (won yesterday) continues the streak; anything else (first-ever win, or a
    // gap of 2+ days) starts a fresh one.
    const newStreak = diff === 1 ? (user.currentDayStreak || 0) + 1 : 1;
    const newLongest = Math.max(user.longestDayStreak || 0, newStreak);
    const streakDay = ((newStreak - 1) % DAILY_STREAK_REWARDS.length) + 1;

    await db
      .update(users)
      .set({
        currentDayStreak: newStreak,
        longestDayStreak: newLongest,
        lastStreakWinDate: todayKey,
        streakRewardClaimed: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { currentStreak: newStreak, longestStreak: newLongest, streakDay, justAdvanced: true };
  }

  async getDailyStreakStatus(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    wonToday: boolean;
    claimableReward: { type: "coins" | "gems" | "bolts"; amount: number } | null;
    cycleRewards: { day: number; type: "coins" | "gems" | "bolts"; amount: number }[];
  }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const todayKey = getParisDateKey(new Date());
    const currentStreak = user.currentDayStreak || 0;

    return {
      currentStreak,
      longestStreak: user.longestDayStreak || 0,
      wonToday: user.lastStreakWinDate === todayKey,
      claimableReward: !user.streakRewardClaimed && currentStreak > 0 ? getDailyStreakReward(currentStreak) : null,
      cycleRewards: DAILY_STREAK_REWARDS.map((r, i) => ({ day: i + 1, ...r })),
    };
  }

  async claimDailyStreakReward(userId: string): Promise<
    | { claimed: false }
    | { claimed: true; reward: { type: "coins" | "gems" | "bolts"; amount: number }; currentStreak: number }
  > {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const currentStreak = user.currentDayStreak || 0;
    if (user.streakRewardClaimed || currentStreak === 0) {
      return { claimed: false };
    }

    const reward = getDailyStreakReward(currentStreak);

    await db
      .update(users)
      .set({ streakRewardClaimed: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    switch (reward.type) {
      case "coins":
        await this.updateUserCoins(userId, (user.coins || 0) + reward.amount);
        break;
      case "gems":
        await this.updateUserGems(userId, (user.gems || 0) + reward.amount);
        break;
      case "bolts":
        await this.updateUserBolts(userId, (user.bolts || 0) + reward.amount);
        break;
    }

    return { claimed: true, reward, currentStreak };
  }

  // Free Battle Pass reward system - fixed gems/bolts, progressive coins
  generateBattlePassReward(tier: number): { type: 'coins' | 'gems' | 'bolts'; amount: number } {
    // Use integer approach for exact 33.33% distribution
    const randomInt = Math.floor(Math.random() * 3); // 0, 1, or 2

    if (randomInt === 0) {
      // 33.33% chance de gagner des pièces (200-400 range for good rewards)
      const baseAmount = 200 + Math.floor(Math.random() * 201); // 200-400 coins
      return { type: 'coins', amount: baseAmount };
    } else if (randomInt === 1) {
      // 33.33% chance de gagner des gemmes (fixed 5)
      return { type: 'gems', amount: 5 };
    } else {
      // 33.33% chance de gagner des éclairs (fixed 5)
      return { type: 'bolts', amount: 5 };
    }
  }

  // Premium Battle Pass reward system - bonus tiers (10,20,30,40,50) have multiplied rewards
  generatePremiumBattlePassReward(tier: number): { type: 'coins' | 'gems' | 'bolts'; amount: number } {
    // Use integer approach for exact 33.33% distribution
    const randomInt = Math.floor(Math.random() * 3); // 0, 1, or 2

    // Check if this is a bonus tier (10, 20, 30, 40, 50)
    const isBonusTier = tier % 10 === 0;

    if (isBonusTier) {
      // BONUS TIERS: Multiplied rewards (up to 10000 coins, 30 gems, 30 bolts)
      if (randomInt === 0) {
        // 33.33% chance - coins (5000-10000 range for bonus tiers)
        return { type: 'coins', amount: 5000 + Math.floor(Math.random() * 5001) };
      } else if (randomInt === 1) {
        // 33.33% chance - gems (15-30 range for bonus tiers)
        return { type: 'gems', amount: 15 + Math.floor(Math.random() * 16) };
      } else {
        // 33.33% chance - bolts (15-30 range for bonus tiers)
        return { type: 'bolts', amount: 15 + Math.floor(Math.random() * 16) };
      }
    } else {
      // NORMAL TIERS: Standard premium rewards (fixed gems/bolts, progressive coins)
      if (randomInt === 0) {
        // 33.33% chance - coins (500-2000 range for good premium rewards)
        const baseAmount = 500 + Math.floor(Math.random() * 1501); // 500-2000 coins
        return { type: 'coins', amount: baseAmount };
      } else if (randomInt === 1) {
        // 33.33% chance - gems (fixed 15)
        return { type: 'gems', amount: 15 };
      } else {
        // 33.33% chance - bolts (fixed 15)
        return { type: 'bolts', amount: 15 };
      }
    }
  }

  async getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<{ freeTiers: number[], premiumTiers: number[] }> {
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

  async claimBattlePassTier(userId: string, seasonId: string, tier: number, isPremium: boolean = false): Promise<{ coins: number; gems: number; bolts: number }> {
    // CRITICAL: Wrap ALL operations in atomic transaction for data integrity
    return await db.transaction(async (tx: any) => {
      // Step 1: Check if tier is already claimed for this reward type and season (with transaction lock)
      const existingClaim = await tx
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

      // Step 2: Generate single random reward
      const reward = this.getBattlePassRewardContent(tier, isPremium);

      // Step 3: Insert claim record atomically with actual reward type and amount
      await tx
        .insert(battlePassRewards)
        .values({
          userId,
          seasonId, // Properly persist seasonId
          tier,
          isPremium,
          rewardType: reward.type,
          rewardAmount: reward.amount
        });

      // Step 4: Lock user row and get current balance atomically
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update'); // CRITICAL: Lock row to prevent race conditions

      if (!user) throw new Error('User not found');

      // Step 5: Apply single reward atomically based on type
      let updateValues: { coins?: number; gems?: number; bolts?: number; updatedAt: Date } = {
        updatedAt: new Date()
      };

      switch (reward.type) {
        case 'coins':
          updateValues.coins = (user.coins || 0) + reward.amount;
          break;
        case 'gems':
          updateValues.gems = (user.gems || 0) + reward.amount;
          break;
        case 'bolts':
          updateValues.bolts = (user.bolts || 0) + reward.amount;
          break;
      }

      await tx
        .update(users)
        .set(updateValues)
        .where(eq(users.id, userId));

      console.log(`🎊 Battle Pass: User ${user.username} claimed tier ${tier} (${isPremium ? 'premium' : 'free'}) - ${reward.amount} ${reward.type}`);

      // Return reward details in expected format (only one reward type will have a value > 0)
      const returnRewards = {
        coins: reward.type === 'coins' ? reward.amount : 0,
        gems: reward.type === 'gems' ? reward.amount : 0,
        bolts: reward.type === 'bolts' ? reward.amount : 0
      };

      return returnRewards;
    });
  }

  async createGameStats(stats: InsertGameStats): Promise<GameStats> {
    const [gameStat] = await db
      .insert(gameStats)
      .values(stats)
      .returning();
    return gameStat;
  }

  async getGameStats(id: string): Promise<GameStats | undefined> {
    const [gameStat] = await db
      .select()
      .from(gameStats)
      .where(eq(gameStats.id, id));
    return gameStat;
  }

  async updateGameStats(id: string, updates: Partial<GameStats>): Promise<GameStats> {
    const [gameStat] = await db
      .update(gameStats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gameStats.id, id))
      .returning();

    if (!gameStat) {
      throw new Error('Game stats not found');
    }
    return gameStat;
  }

  async getUserStats(userId: string): Promise<any> {
    const userStats = await db
      .select()
      .from(gameStats)
      .where(eq(gameStats.userId, userId));

    // Aggregate stats
    const aggregated = userStats.reduce((acc: any, stats: any) => {
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

  // Tracked separately from the unlimited ad-gated spin (which also writes to `dailySpins`):
  // free-spin rows are tagged in the `reward` jsonb so both can share the same log table.
  async getLastFreeSpinAt(userId: string): Promise<Date | null> {
    const rows = await db
      .select({ lastSpinAt: dailySpins.lastSpinAt, reward: dailySpins.reward })
      .from(dailySpins)
      .where(eq(dailySpins.userId, userId))
      .orderBy(sql`${dailySpins.lastSpinAt} DESC`);

    const freeRow = rows.find((r) => (r.reward as any)?.kind === "free_daily");
    return freeRow?.lastSpinAt ? new Date(freeRow.lastSpinAt) : null;
  }

  async createFreeDailySpin(userId: string, reward: any): Promise<DailySpin> {
    const [spin] = await db
      .insert(dailySpins)
      .values({ userId, reward: { ...reward, kind: "free_daily" } })
      .returning();
    return spin;
  }

  async canUserSpin(userId: string): Promise<boolean> {
    // The daily free spin resets once a day at a fixed hour (Paris time), not on a rolling 24h window
    const lastSpinAt = await this.getLastFreeSpinAt(userId);
    if (!lastSpinAt) return true;
    return new Date() >= getNextParisResetAt(lastSpinAt);
  }

  async getFreeSpinStatus(userId: string): Promise<{ canSpin: boolean; secondsUntilReset: number }> {
    const lastSpinAt = await this.getLastFreeSpinAt(userId);
    if (!lastSpinAt) return { canSpin: true, secondsUntilReset: 0 };

    const nextReset = getNextParisResetAt(lastSpinAt);
    const now = new Date();
    if (now >= nextReset) return { canSpin: true, secondsUntilReset: 0 };

    return {
      canSpin: false,
      secondsUntilReset: Math.ceil((nextReset.getTime() - now.getTime()) / 1000),
    };
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
    const now = new Date().toISOString();
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
    const results = await db
      .select({
        id: userChallenges.id,
        userId: userChallenges.userId,
        challengeId: userChallenges.challengeId,
        currentProgress: userChallenges.currentProgress,
        isCompleted: userChallenges.isCompleted,
        completedAt: userChallenges.completedAt,
        startedAt: userChallenges.startedAt,
        rewardClaimed: userChallenges.rewardClaimed,
        challenge: {
          id: challenges.id,
          challengeType: challenges.challengeType,
          title: challenges.title,
          description: challenges.description,
          targetValue: challenges.targetValue,
          reward: challenges.reward,
          isActive: challenges.isActive,
          createdAt: challenges.createdAt,
          expiresAt: challenges.expiresAt,
        }
      })
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(eq(userChallenges.userId, userId));

    return results;
  }

  // "Today's" challenges are whichever ones haven't expired yet — same definition getChallenges()
  // uses — since expired challenges are swept/replaced daily rather than deleted outright.
  // No rows for today (not yet synced since the last reset) counts as not completed, same as
  // any other unfinished challenge.
  async hasCompletedTodaysChallenges(userId: string): Promise<boolean> {
    const userChallenges = await this.getUserChallenges(userId);
    const now = new Date();
    const todays = userChallenges.filter((uc) => new Date(uc.challenge.expiresAt) > now);
    if (todays.length === 0) return false;
    return todays.every((uc) => uc.isCompleted);
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
      .values({
        userId,
        challengeId,
        currentProgress: 0,
        isCompleted: false,
        rewardClaimed: false
      })
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

  async markChallengeRewardAsClaimed(userId: string, userChallengeId: string): Promise<void> {
    await db
      .update(userChallenges)
      .set({ rewardClaimed: true })
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.id, userChallengeId)
      ));
  }

  async removeUserChallenge(userId: string, challengeId: string): Promise<void> {
    await db
      .delete(userChallenges)
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ));
  }

  async cleanupExpiredChallenges(): Promise<void> {
    const now = new Date().toISOString();
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

    // Add the single random reward to user
    switch (rewardContent.type) {
      case 'coins':
        await this.updateUserCoins(userId, (user.coins || 0) + rewardContent.amount);
        break;
      case 'gems':
        await this.updateUserGems(userId, (user.gems || 0) + rewardContent.amount);
        break;
      case 'bolts':
        await this.updateUserBolts(userId, (user.bolts || 0) + rewardContent.amount);
        break;
    }

    // Record the claimed reward with the actual reward type and amount
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

  private getBattlePassRewardContent(tier: number, isPremium: boolean): { type: 'coins' | 'gems' | 'bolts'; amount: number } {
    // Use new reward generation functions with tier-based progression
    if (isPremium) {
      return this.generatePremiumBattlePassReward(tier);
    } else {
      return this.generateBattlePassReward(tier);
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
      .filter((item: any) => item && item.cardBack) // Filter out any null/undefined items
      .map((item: any) => ({
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

    const ownedIds = ownedCardBackIds.map((item: any) => item.cardBackId);

    // Get all active card backs from database instead of JSON
    const allCardBacksFromDb = await db
      .select()
      .from(cardBacks)
      .where(eq(cardBacks.isActive, true));

    // Convert database results to CardBack format
    const allCardBacks: CardBack[] = allCardBacksFromDb.map((cb: any) => ({
      id: cb.id,
      name: cb.name,
      rarity: cb.rarity,
      priceGems: cb.priceGems,
      imageUrl: cb.imageUrl,
      isActive: cb.isActive ?? true,
      createdAt: cb.createdAt || new Date()
    }));

    if (ownedIds.length === 0) {
      // User owns no card backs, return all
      return allCardBacks;
    }

    // Filter out owned card backs
    return allCardBacks.filter(cardBack => !ownedIds.includes(cardBack.id));
  }

  // Buy a specific card back by ID
  async buySpecificCardBack(userId: string, cardBackId: string): Promise<{ cardBack: CardBack; duplicate: boolean }> {
    // CRITICAL: Health check before processing purchase to prevent foreign key errors
    const healthCheck = await this.getCardBacksHealthCheck();
    if (!healthCheck.isHealthy) {
      console.error(`❌ CRITICAL: Card backs not healthy - ${healthCheck.count}/${healthCheck.minRequired} available`);
      throw new Error('Purchase temporarily unavailable - please try again later');
    }

    // Get the specific card back from database
    const [cardBack] = await db
      .select()
      .from(cardBacks)
      .where(eq(cardBacks.id, cardBackId))
      .limit(1);

    if (!cardBack || !cardBack.isActive) {
      throw new Error('Card back not available for purchase');
    }

    return await db.transaction(async (tx: any) => {
      // CRITICAL: Lock user row with SELECT FOR UPDATE to prevent race conditions
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      if (!user) throw new Error('User not found');

      // Check if user has sufficient gems for this specific card back
      const gemCost = cardBack.priceGems;
      if ((user.gems || 0) < gemCost) throw new Error('Insufficient gems');

      // Check if user already owns this card back
      const hasCardBack = await this.hasUserCardBack(userId, cardBackId);
      if (hasCardBack) {
        throw new Error('Card back already owned');
      }

      // Atomically deduct gems within the locked transaction
      const newGemAmount = (user.gems || 0) - gemCost;
      await tx
        .update(users)
        .set({ gems: newGemAmount, updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Record gem transaction
      await tx
        .insert(gemTransactions)
        .values({
          userId,
          transactionType: 'spend',
          amount: -gemCost,
          description: `Purchased card back: ${cardBack.name}`
        });

      // Add card back to user collection
      await tx
        .insert(userCardBacks)
        .values({ userId, cardBackId: cardBack.id, source: 'purchase' });

      // Record the purchase for analytics
      await tx
        .insert(gemPurchases)
        .values({
          userId,
          itemType: 'card_back',
          itemId: cardBack.id,
          gemCost
        });

      return { cardBack, duplicate: false };
    });
  }

  async buyRandomCardBack(userId: string): Promise<{ cardBack: CardBack; duplicate: boolean }> {
    // CRITICAL: Health check before processing purchase to prevent foreign key errors
    const healthCheck = await this.getCardBacksHealthCheck();
    if (!healthCheck.isHealthy) {
      console.error(`❌ CRITICAL: Card backs not healthy - ${healthCheck.count}/${healthCheck.minRequired} available`);
      throw new Error('Mystery pack temporarily unavailable - please try again later');
    }

    return await db.transaction(async (tx: any) => {
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

      // Select random card back with equal probability for all card backs
      const randomIndex = Math.floor(Math.random() * availableCardBacks.length);
      const selectedCardBack = availableCardBacks[randomIndex];

      // Atomically deduct gems within the locked transaction
      const gemCost = selectedCardBack.priceGems;
      const newGemAmount = (user.gems || 0) - gemCost;
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
          amount: -gemCost,
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
          gemCost: 50
        });

      return { cardBack: selectedCardBack, duplicate: false };
    });
  }

  async updateUserSelectedCardBack(userId: string, cardBackId: string): Promise<User> {
    // Handle default/classic card back ID (these are free and don't need ownership check)
    if (cardBackId === "default" || cardBackId === "classic") {
      // Set to null/default for the built-in classic card back
      return await this.updateUser(userId, { selectedCardBackId: null });
    }

    // Verify user owns this custom card back
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

  // Bet Draft methods
  async createBetDraft(betDraft: InsertBetDraft): Promise<BetDraft> {
    const [draft] = await db.insert(betDrafts).values(betDraft).returning();
    return draft;
  }

  async getBetDraft(betId: string): Promise<BetDraft | undefined> {
    const [draft] = await db.select().from(betDrafts).where(eq(betDrafts.betId, betId));
    return draft;
  }

  async deleteBetDraft(betId: string): Promise<void> {
    await db.delete(betDrafts).where(eq(betDrafts.betId, betId));
  }

  async cleanupExpiredBetDrafts(): Promise<void> {
    await db.delete(betDrafts).where(sql`${betDrafts.expiresAt} < NOW()`);
  }

  // Bolts currency
  async getUserBolts(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.bolts || 0;
  }

  async updateUserBolts(userId: string, newCount: number): Promise<void> {
    await this.updateUser(userId, { bolts: newCount });
  }

  // Server-authoritative active games
  async createActiveGame(game: InsertActiveGame): Promise<ActiveGame> {
    const [activeGame] = await db.insert(activeGames).values(game).returning();
    return activeGame;
  }

  async getActiveGame(id: string): Promise<ActiveGame | undefined> {
    const [activeGame] = await db.select().from(activeGames).where(eq(activeGames.id, id)).limit(1);
    return activeGame;
  }

  async getActiveGameForUser(userId: string): Promise<ActiveGame | undefined> {
    const [activeGame] = await db
      .select()
      .from(activeGames)
      .where(and(eq(activeGames.userId, userId), eq(activeGames.status, "in_progress")))
      .limit(1);
    return activeGame;
  }

  async updateActiveGame(id: string, updates: Partial<ActiveGame>): Promise<ActiveGame> {
    const [activeGame] = await db
      .update(activeGames)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(activeGames.id, id))
      .returning();
    return activeGame;
  }

  async completeActiveGame(id: string): Promise<ActiveGame> {
    const [activeGame] = await db
      .update(activeGames)
      .set({ status: "completed", resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(activeGames.id, id))
      .returning();
    return activeGame;
  }

  // Game tables (Play with Friends lobby)
  async createGameTable(hostUserId: string, mode: string): Promise<{ table: GameTable; seats: TableSeat[] }> {
    // Generated before opening the transaction — the uniqueness check loop shouldn't hold a
    // transaction open, same reasoning as generateUniqueReferralCode's call site in createUser.
    const code = await generateUniqueTableCode();
    return await db.transaction(async (tx: any) => {
      // Starts straight in "betting" instead of the schema default "waiting" — Create a Game
      // drops the host directly onto the bet bar (grayed out until a friend joins, see
      // placeTableBet's seat-count check below) instead of an intermediate "Start Hand" screen.
      // Only the very first hand skips that step this way: startTableHand still puts the table
      // back through "waiting" -> "betting" for every hand after the first, unchanged.
      const [table] = await tx.insert(gameTables).values({ hostUserId, mode, code, status: "betting" }).returning();
      const [seat] = await tx
        .insert(tableSeats)
        .values({ tableId: table.id, userId: hostUserId, position: "bottom" })
        .returning();
      return { table, seats: [seat] };
    });
  }

  // Lets a friend join a table without needing an invite — just the 6-char code the host
  // shares. Same seat-assignment/locking logic as acceptTableInvite, minus the invite record.
  async joinTableByCode(code: string, userId: string): Promise<{ tableId: string; seat: TableSeat }> {
    return await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.code, code)).for("update");
      if (!table) throw new Error("No table found for that code");
      // "betting" is joinable too now that a fresh table starts there instead of "waiting" —
      // only an actual hand in progress (or a closed table) turns the code away.
      if (table.status === "in_progress" || table.status === "closed") throw new Error("This table is no longer available");

      const seats: TableSeat[] = await tx.select().from(tableSeats).where(eq(tableSeats.tableId, table.id));
      if (seats.some((s) => s.userId === userId)) {
        throw new Error("You're already seated at this table");
      }

      const takenPositions = new Set(seats.map((s) => s.position));
      const position = !takenPositions.has("left") ? "left" : !takenPositions.has("right") ? "right" : null;
      if (!position) throw new Error("This table is full");

      const [seat] = await tx
        .insert(tableSeats)
        .values({ tableId: table.id, userId, position })
        .returning();

      return { tableId: table.id, seat };
    });
  }

  async getGameTableWithSeats(tableId: string): Promise<{ table: GameTable; seats: (TableSeat & { username: string; selectedAvatarId: string | null })[] } | undefined> {
    const [table] = await db.select().from(gameTables).where(eq(gameTables.id, tableId)).limit(1);
    if (!table) return undefined;

    const seats = await db
      .select({
        id: tableSeats.id,
        tableId: tableSeats.tableId,
        userId: tableSeats.userId,
        position: tableSeats.position,
        joinedAt: tableSeats.joinedAt,
        betAmount: tableSeats.betAmount,
        betConfirmed: tableSeats.betConfirmed,
        hand: tableSeats.hand,
        username: users.username,
        selectedAvatarId: users.selectedAvatarId,
      })
      .from(tableSeats)
      .innerJoin(users, eq(tableSeats.userId, users.id))
      .where(eq(tableSeats.tableId, tableId));

    return { table, seats };
  }

  async getUserActiveTable(userId: string): Promise<GameTable | undefined> {
    const [table] = await db
      .select({ table: gameTables })
      .from(tableSeats)
      .innerJoin(gameTables, eq(tableSeats.tableId, gameTables.id))
      .where(and(eq(tableSeats.userId, userId), sql`${gameTables.status} != 'closed'`))
      .limit(1)
      .then((rows: any[]) => rows.map((r) => r.table));
    return table;
  }

  async addTableSeat(tableId: string, userId: string, position: string): Promise<TableSeat> {
    const [seat] = await db
      .insert(tableSeats)
      .values({ tableId, userId, position })
      .returning();
    return seat;
  }

  // Lets anyone — host or guest — leave at any point, including mid-hand, rather than only
  // while the table is "waiting". Leaving only ever refunds your own unsettled stake and keeps
  // the game moving for whoever's left (advancing the turn, or dealing/settling if your
  // departure happens to be what everyone else was waiting on) — the table itself was never
  // meant to be tied to whoever happened to create it. Only the very last seat leaving actually
  // closes it. If the host specifically leaves while others remain, the host role (needed for
  // starting the next hand) passes to one of the players still seated.
  async leaveTable(tableId: string, userId: string): Promise<{ tableClosed: boolean; settled: boolean }> {
    return await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, tableId)).for("update");
      if (!table) throw new Error("Table not found");

      const seats: TableSeat[] = await tx.select().from(tableSeats).where(eq(tableSeats.tableId, tableId));
      const mySeat = seats.find((s) => s.userId === userId);
      if (!mySeat) throw new Error("You're not seated at this table");

      const refundIfUnsettled = async (seat: TableSeat) => {
        let amount = 0;
        if (table.status === "betting" && seat.betConfirmed && seat.betAmount) {
          amount = seat.betAmount;
        } else if (table.status === "in_progress" && seat.hand && (seat.hand as PlayerHand).result === null) {
          amount = (seat.hand as PlayerHand).bet;
        }
        if (amount > 0) {
          await tx.update(users).set({ coins: sql`${users.coins} + ${amount}`, updatedAt: new Date() }).where(eq(users.id, seat.userId));
        }
      };

      await refundIfUnsettled(mySeat);
      await tx.delete(tableSeats).where(eq(tableSeats.id, mySeat.id));
      const remainingSeats = seats.filter((s) => s.id !== mySeat.id);

      if (remainingSeats.length === 0) {
        await tx.update(gameTables).set({ status: "closed", updatedAt: new Date() }).where(eq(gameTables.id, tableId));
        return { tableClosed: true, settled: false };
      }

      if (table.hostUserId === userId) {
        await tx.update(gameTables).set({ hostUserId: remainingSeats[0].userId }).where(eq(gameTables.id, tableId));
      }

      if (table.status === "betting") {
        if (remainingSeats.length > 0 && remainingSeats.every((s) => s.betConfirmed)) {
          const result = await this.dealTableHand(tx, tableId, table.mode, remainingSeats);
          return { tableClosed: false, settled: result.settled };
        }
        return { tableClosed: false, settled: false };
      }

      if (table.status === "in_progress" && table.currentTurnUserId === userId) {
        // It was their turn — nobody else will ever naturally advance past a
        // currentTurnUserId that no longer has a seat, so this has to hand it off explicitly.
        const orderedRemaining = TABLE_SEAT_ORDER
          .map((pos) => remainingSeats.find((s) => s.position === pos))
          .filter((s): s is TableSeat => !!s);

        const nextSeat = orderedRemaining.find((s) => s.hand && (s.hand as PlayerHand).status === "active");
        if (nextSeat) {
          await tx.update(gameTables).set({ currentTurnUserId: nextSeat.userId, updatedAt: new Date() }).where(eq(gameTables.id, tableId));
          return { tableClosed: false, settled: false };
        }

        const seatsWithHands = orderedRemaining
          .filter((s) => s.hand && (s.hand as PlayerHand).result === null)
          .map((s) => ({ seatId: s.id, userId: s.userId, hand: s.hand as PlayerHand }));

        if (seatsWithHands.length > 0) {
          await this.settleTableAndCredit(tx, tableId, table.mode, table.deck as Card[], table.dealerHand as Card[], seatsWithHands);
          return { tableClosed: false, settled: true };
        }

        await tx.update(gameTables).set({ status: "waiting", currentTurnUserId: null, updatedAt: new Date() }).where(eq(gameTables.id, tableId));
        return { tableClosed: false, settled: false };
      }

      // Not their turn (or the table's just "waiting") — a seat missing from the turn order
      // is already handled transparently wherever that order gets rebuilt.
      return { tableClosed: false, settled: false };
    });
  }

  async createTableInvite(tableId: string, inviterUserId: string, inviteeUserId: string): Promise<TableInvite> {
    // Resending replaces rather than blocks: a fresh invite (and its own push notification)
    // supersedes whatever's still sitting unanswered, instead of erroring until the invitee
    // gets around to accepting/declining the first one. UNIQUE(table_id, invitee_user_id) is
    // table-wide, not scoped to "pending" — a prior accepted/declined/expired row for this
    // same pair blocks the insert below just as much as a pending one, so this must clear
    // every status, not just pending.
    await db
      .delete(tableInvites)
      .where(and(
        eq(tableInvites.tableId, tableId),
        eq(tableInvites.inviteeUserId, inviteeUserId),
      ));

    const [invite] = await db
      .insert(tableInvites)
      .values({ tableId, inviterUserId, inviteeUserId })
      .returning();
    return invite;
  }

  async getPendingInvitesForUser(userId: string): Promise<(TableInvite & { table: GameTable; inviterUsername: string })[]> {
    const rows = await db
      .select({
        id: tableInvites.id,
        tableId: tableInvites.tableId,
        inviterUserId: tableInvites.inviterUserId,
        inviteeUserId: tableInvites.inviteeUserId,
        status: tableInvites.status,
        createdAt: tableInvites.createdAt,
        table: gameTables,
        inviterUsername: users.username,
      })
      .from(tableInvites)
      .innerJoin(gameTables, eq(tableInvites.tableId, gameTables.id))
      .innerJoin(users, eq(tableInvites.inviterUserId, users.id))
      .where(and(eq(tableInvites.inviteeUserId, userId), eq(tableInvites.status, "pending")))
      .orderBy(tableInvites.createdAt);
    return rows;
  }

  async getTableInvite(id: string): Promise<TableInvite | undefined> {
    const [invite] = await db.select().from(tableInvites).where(eq(tableInvites.id, id)).limit(1);
    return invite;
  }

  async updateTableInviteStatus(id: string, status: string): Promise<TableInvite> {
    const [invite] = await db
      .update(tableInvites)
      .set({ status })
      .where(eq(tableInvites.id, id))
      .returning();
    return invite;
  }

  // Locks the table row for the duration of the transaction (mirrors the SELECT...FOR UPDATE
  // pattern already used by /api/game/action) so two simultaneous accepts for the same table
  // can't both compute the same free seat position and double-book it.
  async acceptTableInvite(inviteId: string, userId: string): Promise<{ tableId: string; seat: TableSeat }> {
    return await db.transaction(async (tx: any) => {
      const [invite] = await tx.select().from(tableInvites).where(eq(tableInvites.id, inviteId)).limit(1);
      if (!invite || invite.inviteeUserId !== userId) {
        throw new Error("Invite not found");
      }
      if (invite.status !== "pending") {
        throw new Error("This invite is no longer valid");
      }

      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, invite.tableId)).for("update");
      // "betting" is acceptable too — see joinTableByCode's comment on the same check.
      if (!table || table.status === "in_progress" || table.status === "closed") {
        await tx.update(tableInvites).set({ status: "expired" }).where(eq(tableInvites.id, inviteId));
        throw new Error("This table is no longer available");
      }

      const seats: TableSeat[] = await tx.select().from(tableSeats).where(eq(tableSeats.tableId, invite.tableId));
      if (seats.some((s) => s.userId === userId)) {
        throw new Error("You're already seated at this table");
      }

      const takenPositions = new Set(seats.map((s) => s.position));
      const position = !takenPositions.has("left") ? "left" : !takenPositions.has("right") ? "right" : null;
      if (!position) {
        await tx.update(tableInvites).set({ status: "expired" }).where(eq(tableInvites.id, inviteId));
        throw new Error("This table is full");
      }

      const [seat] = await tx
        .insert(tableSeats)
        .values({ tableId: invite.tableId, userId, position })
        .returning();
      await tx.update(tableInvites).set({ status: "accepted" }).where(eq(tableInvites.id, inviteId));

      return { tableId: invite.tableId, seat };
    });
  }

  // Opens a betting round. Clears any leftover bet/hand state from a previous hand at this
  // table (seats stay put between hands — only their bet/hand is per-hand).
  async startTableHand(tableId: string, hostUserId: string): Promise<void> {
    await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, tableId)).for("update");
      if (!table) throw new Error("Table not found");
      if (table.hostUserId !== hostUserId) throw new Error("Only the host can start a hand");
      if (table.status !== "waiting") throw new Error("A hand is already in progress");

      const seats: TableSeat[] = await tx.select().from(tableSeats).where(eq(tableSeats.tableId, tableId));
      if (seats.length === 0) throw new Error("No one is seated at this table");

      await tx
        .update(tableSeats)
        .set({ betAmount: null, betConfirmed: false, hand: null })
        .where(eq(tableSeats.tableId, tableId));

      await tx.update(gameTables).set({ status: "betting", updatedAt: new Date() }).where(eq(gameTables.id, tableId));
    });
  }

  // Debits the caller's bet and marks them ready. Once every seated player has confirmed,
  // deals the whole table in the same transaction — a real-money debit and a deal must not be
  // split across separate transactions, or a crash between them could lose track of a bet.
  async placeTableBet(tableId: string, userId: string, amount: number): Promise<{ settled: boolean }> {
    return await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, tableId)).for("update");
      if (!table) throw new Error("Table not found");
      if (table.status !== "betting") throw new Error("This table isn't taking bets right now");

      const seats: TableSeat[] = await tx.select().from(tableSeats).where(eq(tableSeats.tableId, tableId));
      const mySeat = seats.find((s) => s.userId === userId);
      if (!mySeat) throw new Error("You're not seated at this table");
      if (mySeat.betConfirmed) throw new Error("You've already placed your bet");
      // Play with Friends means at least one friend — the client already grays out Confirm Bet
      // until someone else is seated, this is just the server-side backstop against a direct
      // API call bypassing that.
      if (seats.length < 2) throw new Error("Wait for a friend to join before betting");

      const [debited] = await tx
        .update(users)
        .set({ coins: sql`${users.coins} - ${amount}`, updatedAt: new Date() })
        .where(and(eq(users.id, userId), gte(users.coins, amount)))
        .returning();
      if (!debited) throw new Error("Insufficient funds");

      await tx.update(tableSeats).set({ betAmount: amount, betConfirmed: true }).where(eq(tableSeats.id, mySeat.id));

      const refreshedSeats: TableSeat[] = seats.map((s) =>
        s.id === mySeat.id ? { ...s, betAmount: amount, betConfirmed: true } : s
      );
      if (!refreshedSeats.every((s) => s.betConfirmed)) {
        return { settled: false };
      }

      return await this.dealTableHand(tx, tableId, table.mode, refreshedSeats);
    });
  }

  // Shuffles and deals the whole table once every seated player has confirmed a bet — shared
  // by placeTableBet (the normal path) and leaveTable (a guest leaving mid-betting can
  // happen to be the last confirmation everyone else was waiting on).
  private async dealTableHand(tx: any, tableId: string, mode: string, seats: TableSeat[]): Promise<{ settled: boolean }> {
    const deck = ServerBlackjackEngine.createShuffledDeck();
    const deckSeed = randomBytes(16).toString("hex");
    const deckHash = createHash("sha256").update(JSON.stringify(deck)).digest("hex");

    const orderedSeats = TABLE_SEAT_ORDER
      .map((pos) => seats.find((s) => s.position === pos))
      .filter((s): s is TableSeat => !!s);

    const dealt: { seat: TableSeat; hand: PlayerHand }[] = [];
    for (const seat of orderedSeats) {
      const cards = [deck.pop()!, deck.pop()!];
      const hand: PlayerHand = {
        cards,
        bet: seat.betAmount!,
        doubled: false,
        status: ServerBlackjackEngine.isBlackjack(cards) ? "blackjack" : "active",
        result: null,
        payout: null,
      };
      dealt.push({ seat, hand });
      await tx.update(tableSeats).set({ hand }).where(eq(tableSeats.id, seat.id));
    }

    const dealerHand: Card[] = [deck.pop()!, deck.pop()!];
    const firstToAct = dealt.find((d) => d.hand.status === "active");

    if (!firstToAct) {
      // Every seat got dealt a natural blackjack (or was somehow otherwise already
      // resolved) — nothing left to play, settle immediately.
      await this.settleTableAndCredit(
        tx, tableId, mode, deck, dealerHand,
        dealt.map((d) => ({ seatId: d.seat.id, userId: d.seat.userId, hand: d.hand }))
      );
      return { settled: true };
    }

    await tx
      .update(gameTables)
      .set({
        status: "in_progress",
        deck,
        deckSeed,
        deckHash,
        dealerHand,
        currentTurnUserId: firstToAct.seat.userId,
        updatedAt: new Date(),
      })
      .where(eq(gameTables.id, tableId));

    return { settled: false };
  }

  // Hit/stand/double/surrender for whichever seat's turn it currently is. No split in
  // multiplayer (see the plan) — computeLegalActions' split branch is filtered out.
  async applyTableAction(tableId: string, userId: string, action: string): Promise<{ settled: boolean }> {
    return await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, tableId)).for("update");
      if (!table) throw new Error("Table not found");
      if (table.status !== "in_progress") throw new Error("No hand in progress");
      if (table.currentTurnUserId !== userId) throw new Error("It's not your turn");

      const seats: TableSeat[] = await tx.select().from(tableSeats).where(eq(tableSeats.tableId, tableId));
      const mySeat = seats.find((s) => s.userId === userId);
      if (!mySeat || !mySeat.hand) throw new Error("You don't have a hand to act on");

      const hand = mySeat.hand as PlayerHand;
      const deck = table.deck as Card[];
      const legalActions: GameAction[] = computeLegalActions(hand, table.mode, [hand]).filter((a) => a !== "split");
      if (!legalActions.includes(action as GameAction)) {
        throw new Error("Illegal action for current game state");
      }

      if (action === "hit") {
        const card = deck.pop();
        if (!card) throw new Error("Deck exhausted");
        hand.cards.push(card);
        if (ServerBlackjackEngine.calculateTotal(hand.cards) > 21) hand.status = "busted";
      } else if (action === "stand") {
        hand.status = "standing";
      } else if (action === "double") {
        const [debited] = await tx
          .update(users)
          .set({ coins: sql`${users.coins} - ${hand.bet}`, updatedAt: new Date() })
          .where(and(eq(users.id, userId), gte(users.coins, hand.bet)))
          .returning();
        if (!debited) throw new Error("Insufficient funds to double");
        hand.bet *= 2;
        hand.doubled = true;
        const card = deck.pop();
        if (!card) throw new Error("Deck exhausted");
        hand.cards.push(card);
        hand.status = ServerBlackjackEngine.calculateTotal(hand.cards) > 21 ? "busted" : "standing";
      } else if (action === "surrender") {
        hand.status = "surrendered";
      }

      await tx.update(tableSeats).set({ hand }).where(eq(tableSeats.id, mySeat.id));
      await tx.update(gameTables).set({ deck, updatedAt: new Date() }).where(eq(gameTables.id, tableId));

      if (hand.status === "active") {
        // Same seat still has decisions left (e.g. hit without busting).
        return { settled: false };
      }

      const orderedSeats = TABLE_SEAT_ORDER
        .map((pos) => seats.find((s) => s.position === pos))
        .filter((s): s is TableSeat => !!s);
      const handBySeatId = new Map<string, PlayerHand>(
        orderedSeats.map((s) => [s.id, s.id === mySeat.id ? hand : (s.hand as PlayerHand)])
      );

      const currentIndex = orderedSeats.findIndex((s) => s.id === mySeat.id);
      const nextSeat = orderedSeats
        .slice(currentIndex + 1)
        .find((s) => handBySeatId.get(s.id)!.status === "active");

      if (nextSeat) {
        await tx
          .update(gameTables)
          .set({ currentTurnUserId: nextSeat.userId, updatedAt: new Date() })
          .where(eq(gameTables.id, tableId));
        return { settled: false };
      }

      // No one left to act — settle every seat against the dealer.
      const dealerHand = table.dealerHand as Card[];
      await this.settleTableAndCredit(
        tx, tableId, table.mode, deck, dealerHand,
        orderedSeats.map((s) => ({ seatId: s.id, userId: s.userId, hand: handBySeatId.get(s.id)! }))
      );
      return { settled: true };
    });
  }

  // Shared by placeTableBet (everyone dealt a natural) and applyTableAction (last seat
  // done): plays the dealer out once against every seat's final hand, credits each seat's
  // own user with their own payout, and returns the table to the lobby. Deliberately leaves
  // each seat's `hand` (with its final result/payout) and the table's `dealerHand` in place
  // rather than clearing them — the lobby shows the last hand's outcome until the host starts
  // a new one, at which point startTableHand clears it.
  private async settleTableAndCredit(
    tx: any,
    tableId: string,
    mode: string,
    deck: Card[],
    dealerHand: Card[],
    seatsWithHands: { seatId: string; userId: string; hand: PlayerHand }[]
  ): Promise<void> {
    const hands = seatsWithHands.map((s) => s.hand);
    settleHandsAgainstDealer(mode, deck, dealerHand, hands);

    for (const s of seatsWithHands) {
      await tx
        .update(users)
        .set({ coins: sql`${users.coins} + ${s.hand.payout || 0}`, updatedAt: new Date() })
        .where(eq(users.id, s.userId));
      await tx.update(tableSeats).set({ hand: s.hand }).where(eq(tableSeats.id, s.seatId));
    }

    await tx
      .update(gameTables)
      .set({ status: "waiting", deck, dealerHand, currentTurnUserId: null, updatedAt: new Date() })
      .where(eq(gameTables.id, tableId));
  }

  // Config methods
  async getConfig(key: string): Promise<any> {
    try {
      const [configRecord] = await db
        .select()
        .from(config)
        .where(eq(config.key, key))
        .limit(1);

      if (!configRecord) {
        return undefined;
      }

      // Parse JSON value
      return JSON.parse(configRecord.value);
    } catch (error) {
      console.error(`Error getting config for key ${key}:`, error);
      return undefined;
    }
  }

  async setConfig(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);

      // Use INSERT ... ON CONFLICT (upsert) to update existing or create new
      await db
        .insert(config)
        .values({
          key,
          value: jsonValue,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: config.key,
          set: {
            value: jsonValue,
            updatedAt: new Date()
          }
        });
    } catch (error) {
      console.error(`Error setting config for key ${key}:`, error);
      throw error;
    }
  }

  // Atomic "claim a one-time action" primitive, built on the config table's unique key
  // constraint: ON CONFLICT DO NOTHING means only the first of several concurrent callers
  // actually inserts a row and gets `true` back — everyone else racing for the same key gets
  // `false`, telling them someone else already won and they should not repeat the action.
  async claimDailyKey(key: string): Promise<boolean> {
    try {
      const inserted = await db
        .insert(config)
        .values({ key, value: JSON.stringify(true), updatedAt: new Date() })
        .onConflictDoNothing({ target: config.key })
        .returning({ key: config.key });
      return inserted.length > 0;
    } catch (error) {
      console.error(`Error claiming key ${key}:`, error);
      return false;
    }
  }

  // Friends methods implementation
  async searchUsersByUsername(query: string, excludeUserId?: string): Promise<(User & { friendshipStatus: string | null })[]> {
    const searchPattern = `%${query.toLowerCase()}%`;

    let conditions = sql`lower(${users.username}) LIKE ${searchPattern}`;

    if (excludeUserId) {
      conditions = and(conditions, sql`${users.id} != ${excludeUserId}`) || conditions;
    }

    // Join with friendships to get the friendship status
    const foundUsers = await db
      .select({
        id: users.id,
        username: users.username,
        selectedAvatarId: users.selectedAvatarId,
        level: users.level,
        coins: users.coins,
        xp: users.xp,
        membershipType: users.membershipType,
        createdAt: users.createdAt,
        friendshipStatus: sql<string | null>`
          CASE 
            WHEN ${friendships.status} = 'accepted' THEN 'friends'
            WHEN ${friendships.status} = 'pending' AND ${friendships.requesterId} = ${excludeUserId} THEN 'pending_sent'
            WHEN ${friendships.status} = 'pending' AND ${friendships.recipientId} = ${excludeUserId} THEN 'pending_received'
            ELSE NULL
          END
        `.as('friendshipStatus')
      })
      .from(users)
      .leftJoin(
        friendships,
        sql`(${friendships.requesterId} = ${users.id} AND ${friendships.recipientId} = ${excludeUserId}) OR 
            (${friendships.requesterId} = ${excludeUserId} AND ${friendships.recipientId} = ${users.id})`
      )
      .where(conditions)
      .orderBy(users.username)
      .limit(20);

    return foundUsers as (User & { friendshipStatus: string | null })[];
  }

  async sendFriendRequest(requesterId: string, recipientId: string): Promise<Friendship> {
    // Check if they are already friends or have a pending request
    const existingFriendship = await db
      .select()
      .from(friendships)
      .where(
        sql`(${friendships.requesterId} = ${requesterId} AND ${friendships.recipientId} = ${recipientId}) OR 
            (${friendships.requesterId} = ${recipientId} AND ${friendships.recipientId} = ${requesterId})`
      )
      .limit(1);

    if (existingFriendship.length > 0) {
      throw new Error('Friend request already exists or users are already friends');
    }

    const [friendship] = await db
      .insert(friendships)
      .values({
        requesterId,
        recipientId,
        status: 'pending'
      })
      .returning();

    return friendship;
  }

  async acceptFriendRequest(requesterId: string, recipientId: string): Promise<Friendship> {
    const [friendship] = await db
      .update(friendships)
      .set({
        status: 'accepted',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(friendships.requesterId, requesterId),
          eq(friendships.recipientId, recipientId),
          eq(friendships.status, 'pending')
        )
      )
      .returning();

    if (!friendship) {
      throw new Error('Friend request not found or already processed');
    }

    return friendship;
  }

  async rejectFriendRequest(requesterId: string, recipientId: string): Promise<void> {
    await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.requesterId, requesterId),
          eq(friendships.recipientId, recipientId),
          eq(friendships.status, 'pending')
        )
      );
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    await db
      .delete(friendships)
      .where(
        sql`((${friendships.requesterId} = ${userId} AND ${friendships.recipientId} = ${friendId}) OR 
             (${friendships.requesterId} = ${friendId} AND ${friendships.recipientId} = ${userId})) AND 
            ${friendships.status} = 'accepted'`
      );
  }

  async getUserFriends(userId: string): Promise<(User & { friendshipId: string; totalGamesPlayed: number; winRate: number; isOnline: boolean })[]> {
    const friends = await db
      .select({
        friendshipId: friendships.id,
        id: users.id,
        username: users.username,
        selectedAvatarId: users.selectedAvatarId,
        level: users.level,
        coins: users.coins,
        xp: users.xp,
        membershipType: users.membershipType,
        createdAt: users.createdAt,
        lastActiveAt: users.lastActiveAt,
        totalGamesPlayed: sql<number>`COALESCE(SUM(${gameStats.handsPlayed}), 0)`.as('totalGamesPlayed'),
        totalWins: sql<number>`COALESCE(SUM(${gameStats.handsWon}), 0)`.as('totalWins')
      })
      .from(friendships)
      .innerJoin(
        users,
        sql`(${friendships.requesterId} = ${userId} AND ${users.id} = ${friendships.recipientId}) OR
            (${friendships.recipientId} = ${userId} AND ${users.id} = ${friendships.requesterId})`
      )
      .leftJoin(gameStats, eq(gameStats.userId, users.id))
      .where(eq(friendships.status, 'accepted'))
      .groupBy(friendships.id, users.id, users.username, users.selectedAvatarId, users.level, users.coins, users.xp, users.membershipType, users.createdAt, users.lastActiveAt)
      .orderBy(users.username);

    // Not a precise presence system — "online" just means requireAuth touched lastActiveAt
    // recently (see server/storage.ts' touchLastActive), so this window has to comfortably
    // cover normal gaps between authenticated requests while the app is foregrounded.
    const ONLINE_WINDOW_MS = 2 * 60 * 1000;
    const now = Date.now();

    // Calculate win rate for each friend
    return friends.map((friend: any) => ({
      ...friend,
      isOnline: !!friend.lastActiveAt && now - new Date(friend.lastActiveAt).getTime() < ONLINE_WINDOW_MS,
      winRate: friend.totalGamesPlayed > 0 ? Math.round((friend.totalWins / friend.totalGamesPlayed) * 100) : 0
    })) as (User & { friendshipId: string; totalGamesPlayed: number; winRate: number; isOnline: boolean })[];
  }

  async getFriendRequests(userId: string): Promise<(Friendship & { requester: User })[]> {
    const requests = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        recipientId: friendships.recipientId,
        status: friendships.status,
        createdAt: friendships.createdAt,
        updatedAt: friendships.updatedAt,
        requester: {
          id: users.id,
          username: users.username,
          selectedAvatarId: users.selectedAvatarId,
          level: users.level,
          membershipType: users.membershipType
        }
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(
        and(
          eq(friendships.recipientId, userId),
          eq(friendships.status, 'pending')
        )
      )
      .orderBy(friendships.createdAt);

    return requests.map((request: any) => ({
      ...request,
      requester: request.requester as User
    }));
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        and(
          sql`((${friendships.requesterId} = ${userId1} AND ${friendships.recipientId} = ${userId2}) OR 
               (${friendships.requesterId} = ${userId2} AND ${friendships.recipientId} = ${userId1}))`,
          eq(friendships.status, 'accepted')
        )
      )
      .limit(1);

    return friendship.length > 0;
  }

  // Rank Rewards methods
  async getUserClaimedRankRewards(userId: string): Promise<RankRewardClaimed[]> {
    const claimed = await db
      .select()
      .from(rankRewardsClaimed)
      .where(eq(rankRewardsClaimed.userId, userId));

    return claimed;
  }

  async claimRankReward(userId: string, rankKey: string, gemsAwarded: number): Promise<RankRewardClaimed> {
    // Check if already claimed
    const existing = await db
      .select()
      .from(rankRewardsClaimed)
      .where(
        and(
          eq(rankRewardsClaimed.userId, userId),
          eq(rankRewardsClaimed.rankKey, rankKey)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Rank reward already claimed');
    }

    // Create claim record
    const [claim] = await db
      .insert(rankRewardsClaimed)
      .values({
        userId,
        rankKey,
        gemsAwarded
      })
      .returning();

    // Add gems to user
    const user = await this.getUser(userId);
    if (user) {
      await this.updateUserGems(userId, (user.gems || 0) + gemsAwarded);
    }

    return claim;
  }

  async hasUserClaimedRankReward(userId: string, rankKey: string): Promise<boolean> {
    const claim = await db
      .select()
      .from(rankRewardsClaimed)
      .where(
        and(
          eq(rankRewardsClaimed.userId, userId),
          eq(rankRewardsClaimed.rankKey, rankKey)
        )
      )
      .limit(1);

    return claim.length > 0;
  }

  // New Season Reset methods implementation
  async resetAllUserSeasonProgress(): Promise<void> {
    // Reset level, currentLevelXP and seasonXP for all users so the Battle Pass
    // (which reads level/currentLevelXP directly) shows everyone back at tier 1, 0 XP.
    await db
      .update(users)
      .set({
        level: 1,
        currentLevelXP: 0,
        seasonXp: 0,
        updatedAt: new Date()
      });

    console.log('✅ Reset all user levels, currentLevelXP and seasonXP');
  }

  async clearBattlePassRewards(): Promise<void> {
    // Delete all battle pass rewards from the database
    await db.delete(battlePassRewards);
    console.log('✅ Cleared all battle pass rewards');
  }

  async resetAllUserRanks(): Promise<void> {
    // Reset the season-scoped hands-won counter that drives the animal rank — NOT
    // gameStats.handsWon, which is the lifetime "Hands Won"/Win Rate stat shown
    // permanently on the profile and must keep accumulating forever.
    await db
      .update(users)
      .set({
        seasonHandsWon: 0,
        updatedAt: new Date()
      });

    console.log('✅ Reset all user ranks (seasonHandsWon set to 0)');
  }

  async clearRankRewardsClaimed(): Promise<void> {
    await db.delete(rankRewardsClaimed);
    console.log('✅ Cleared all claimed rank rewards');
  }

  async addSeasonHandsWon(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    const user = await this.getUser(userId);
    if (!user) return;
    await db
      .update(users)
      .set({
        seasonHandsWon: (user.seasonHandsWon || 0) + amount,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async createOrUpdateSeason(seasonId: string, seasonName: string): Promise<Season> {
    // Check if season already exists by seasonIdentifier
    const existingSeason = await db
      .select()
      .from(seasons)
      .where(eq(seasons.seasonIdentifier, seasonId))
      .limit(1);

    if (existingSeason.length > 0) {
      // Update existing season
      const [updatedSeason] = await db
        .update(seasons)
        .set({
          name: seasonName,
          isActive: true
        })
        .where(eq(seasons.seasonIdentifier, seasonId))
        .returning();

      return updatedSeason;
    } else {
      // Deactivate all previous seasons
      await db
        .update(seasons)
        .set({ isActive: false });

      // Create new season
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of current month
      endDate.setHours(23, 59, 59, 999);

      const [newSeason] = await db
        .insert(seasons)
        .values({
          seasonIdentifier: seasonId, // Use seasonIdentifier instead of id
          name: seasonName,
          startDate: new Date(),
          endDate: endDate,
          maxXp: 500,
          isActive: true
        })
        .returning();

      return newSeason;
    }
  }


}

export const storage = new DatabaseStorage();
