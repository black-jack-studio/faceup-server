import { users, gameStats, inventory, dailySpins, achievements, challenges, userChallenges, gemTransactions, gemPurchases, seasons, battlePassRewards, classicStreakLeaderboard, weeklyXpLeaderboard, weeklyXpRewardsClaimed, cardBacks, userCardBacks, betDrafts, config, friendships, blockedUsers, userReports, rankRewardsClaimed, type User, type InsertUser, type GameStats, type InsertGameStats, type Inventory, type InsertInventory, type DailySpin, type InsertDailySpin, type Achievement, type InsertAchievement, type Challenge, type UserChallenge, type InsertChallenge, type InsertUserChallenge, type GemTransaction, type InsertGemTransaction, type GemPurchase, type InsertGemPurchase, type Season, type InsertSeason, type BattlePassReward, type InsertBattlePassReward, type ClassicStreakLeaderboard, type InsertClassicStreakLeaderboard, type WeeklyXpLeaderboard, type InsertWeeklyXpLeaderboard, type WeeklyXpRewardClaimed, type CardBack, type UserCardBack, type InsertUserCardBack, type BetDraft, type InsertBetDraft, type Config, type InsertConfig, type Friendship, type InsertFriendship, type BlockedUser, type UserReport, type RankRewardClaimed, type InsertRankRewardClaimed, activeGames, type ActiveGame, type InsertActiveGame, gameTables, type GameTable, type InsertGameTable, tableSeats, type TableSeat, type InsertTableSeat, tableInvites, type TableInvite, type InsertTableInvite } from "@shared/schema";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import { eq, sql, and, gte, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { generateUniqueReferralCode } from "./utils/referral";
import { ServerBlackjackEngine } from "./BlackjackEngine";
import { computeHandPayout, computeLegalActions, settleHandsAgainstDealer } from "./blackjackSettlement";
import type { Card, PlayerHand, GameAction } from "@shared/blackjack-types";
import {
  getChestTierForPassTier,
  rollChestReward,
  rollFallbackResourceReward,
  amountMultiplierForTier,
  type BattlePassChestTier,
  type ChestResourceKind,
  type ChestItemKind,
} from "@shared/battlePassChests";
import { chestCostFor, type ChestTier } from "@shared/chestCatalog";
import { MYSTERY_AVATAR_IDS, MYSTERY_AVATAR_NAMES } from "@shared/avatarCatalog";
import { EMOTE_CATALOG } from "@shared/emoteCatalog";
import { userEmotes as userEmotesTable, type UserEmote } from "@shared/schema";

// Shared shape for both "claim a Battle Pass tier" and "buy a chest in the Shop" — a chest
// pays out either a single item (card back, Mystery avatar, or emote — never more than one),
// or 1-2 resource rewards, never both (see rollChestReward() in shared/battlePassChests.ts).
export interface ChestOpenResult {
  chestTier: BattlePassChestTier;
  rewards: { kind: ChestResourceKind; amount: number }[];
  cardBack: { id: string; name: string; rarity: string; imageUrl: string } | null;
  avatar: { id: string; name: string } | null;
  emote: { id: string; name: string } | null;
}

export type BattlePassClaimResult = ChestOpenResult;

interface ResolvedChestItem {
  kind: ChestItemKind;
  id: string;
  name: string;
  rarity?: string;
  imageUrl?: string;
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

// The next fixed daily reset instant (in UTC) strictly after `from`, at `resetHour` Paris
// wall-clock time (defaults to the free spin's fixed hour; pass 0 for a plain midnight boundary).
function getNextParisResetAt(from: Date, resetHour: number = FREE_SPIN_RESET_HOUR_PARIS): Date {
  const { year, month, day } = getParisDateParts(from);
  const offsetMinutes = getParisOffsetMinutes(from);
  const resetOnDay = (y: number, mo: number, d: number) =>
    Date.UTC(y, mo - 1, d, resetHour, 0, 0, 0) - offsetMinutes * 60 * 1000;

  let reset = resetOnDay(year, month, day);
  if (reset <= from.getTime()) {
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    reset = resetOnDay(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
  }
  return new Date(reset);
}

// Midnight-to-midnight Paris boundary — used by features whose daily reset is the plain
// calendar day rather than the free spin's fixed 1am hour.
export function getNextParisMidnight(from: Date): Date {
  return getNextParisResetAt(from, 0);
}

// Daily win-streak: the boundary is the Paris calendar day itself (midnight-to-midnight,
// same as the daily challenges reset), not a fixed reset hour like the free spin above.
export function getParisDateKey(date: Date): string {
  const { year, month, day } = getParisDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "Watch an ad to 2X your win" — capped at 3 plays per Paris calendar day.
export const DOUBLE_REWARD_AD_DAILY_LIMIT = 3;

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

// Fixed 14-day (two-week) reward cycle for the daily Classic-solo win-streak — server-
// authoritative so it can't be tampered with client-side. Day 14 is the big finale (Stanislas,
// 2026-08-26: a flat 500-coin bonus for finishing the full two weeks), then it loops back to
// day 1 — getDailyStreakReward's `% DAILY_STREAK_REWARDS.length` below handles the wrap
// automatically, so currentDayStreak itself never needs to be reset back to 0.
// Days 1-13 stay within the ~150-coin-equivalent range daily challenges use (Anatole,
// 2026-08-21) so they don't dwarf those; day 14 is a deliberate one-off exception to that cap.
const DAILY_STREAK_REWARDS: { type: "coins" | "gems"; amount: number }[] = [
  { type: "coins", amount: 20 },
  { type: "coins", amount: 30 },
  { type: "gems", amount: 2 },
  { type: "coins", amount: 50 },
  { type: "gems", amount: 3 },
  { type: "gems", amount: 5 },
  { type: "gems", amount: 10 },
  { type: "coins", amount: 70 },
  { type: "gems", amount: 12 },
  { type: "coins", amount: 100 },
  { type: "gems", amount: 15 },
  { type: "coins", amount: 150 },
  { type: "gems", amount: 20 },
  { type: "coins", amount: 500 },
];

function getDailyStreakReward(streakDay: number): { type: "coins" | "gems"; amount: number } {
  return DAILY_STREAK_REWARDS[(streakDay - 1) % DAILY_STREAK_REWARDS.length];
}

// Gems awarded to the top 3 of the previous week's XP leaderboard. Ranks below 3 get nothing.
const WEEKLY_XP_LEADERBOARD_REWARDS: Record<number, number> = {
  1: 50,
  2: 25,
  3: 10,
};

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
  getWeeklyClassicStreakLeaderboard(limit?: number, viewerId?: string): Promise<(ClassicStreakLeaderboard & { user: User; rank: number })[]>;
  getCurrentWeekStart(): Date;

  // Weekly XP leaderboard methods
  addWeeklyXP(userId: string, xpAmount: number): Promise<void>;
  getWeeklyXpLeaderboard(limit?: number, viewerId?: string): Promise<(WeeklyXpLeaderboard & { user: User; rank: number })[]>;
  claimWeeklyXpLeaderboardReward(userId: string): Promise<
    | { claimed: false }
    | { claimed: true; rank: number; gemsAwarded: number }
  >;
  getPendingWeeklyXpReward(userId: string): Promise<{ rank: number; gemsAwarded: number } | null>;
  getMyWeeklyXpStatus(userId: string): Promise<{
    rank: number;
    weeklyXp: number;
    prizeGems: number;
    weekEndsAt: string;
  }>;

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
    claimableReward: { type: "coins" | "gems"; amount: number } | null;
    cycleRewards: { day: number; type: "coins" | "gems"; amount: number }[];
  }>;
  claimDailyStreakReward(userId: string): Promise<
    | { claimed: false }
    | { claimed: true; reward: { type: "coins" | "gems"; amount: number }; currentStreak: number }
  >;

  // Battle Pass methods
  getClaimedBattlePassTiers(userId: string, seasonId: string): Promise<{ freeTiers: number[], premiumTiers: number[] }>;
  claimBattlePassTier(userId: string, seasonId: string, tier: number, isPremium?: boolean): Promise<BattlePassClaimResult>;

  // Shop chests (gold/purple/crown) — same reward tables as their Battle Pass counterparts.
  openChest(userId: string, tier: ChestTier): Promise<ChestOpenResult>;

  // Game stats methods
  createGameStats(stats: InsertGameStats): Promise<GameStats>;
  getGameStats(id: string): Promise<GameStats | undefined>;
  updateGameStats(id: string, updates: Partial<GameStats>): Promise<GameStats>;
  getUserStats(userId: string): Promise<any>;
  getCoinsHistory(userId: string, range: "24h" | "7d" | "30d"): Promise<{ bucketStart: string; net: number }[]>;

  // Daily spin methods
  canUserSpin(userId: string): Promise<boolean>;
  getFreeSpinStatus(userId: string): Promise<{ canSpin: boolean; secondsUntilReset: number; spinsTowardBonus: number }>;
  getLastFreeSpinAt(userId: string): Promise<Date | null>;
  createDailySpin(spin: InsertDailySpin): Promise<DailySpin>;
  createFreeDailySpin(userId: string, reward: any): Promise<DailySpin>;
  incrementSpinsTowardBonusFreeSpin(userId: string): Promise<void>;

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
  getUserBattlePassRewards(userId: string, seasonId?: string): Promise<BattlePassReward[]>;
  hasUserClaimedReward(userId: string, tier: number, isPremium: boolean, seasonId?: string): Promise<boolean>;

  // Card Back methods
  getAllCardBacks(): Promise<CardBack[]>;
  getCardBack(id: string): Promise<CardBack | undefined>;

  // User Card Back methods
  getUserCardBacks(userId: string): Promise<(UserCardBack & { cardBack: CardBack })[]>;
  addCardBackToUser(userId: string, cardBackId: string): Promise<{ duplicate: boolean }>;
  hasUserCardBack(userId: string, cardBackId: string): Promise<boolean>;
  updateUserSelectedCardBack(userId: string, cardBackId: string): Promise<User>;

  // User Emote methods — the emote catalog itself is a static list (shared/emoteCatalog.ts),
  // not a DB table, so these only track which catalog ids a user has unlocked.
  getUserEmotes(userId: string): Promise<UserEmote[]>;
  addEmoteToUser(userId: string, emoteId: string): Promise<{ duplicate: boolean }>;
  hasUserEmote(userId: string, emoteId: string): Promise<boolean>;

  // Bet Draft methods
  createBetDraft(betDraft: InsertBetDraft): Promise<BetDraft>;
  getBetDraft(betId: string): Promise<BetDraft | undefined>;
  deleteBetDraft(betId: string): Promise<void>;
  cleanupExpiredBetDrafts(): Promise<void>;

  // Server-authoritative active games
  createActiveGame(game: InsertActiveGame): Promise<ActiveGame>;
  getActiveGame(id: string): Promise<ActiveGame | undefined>;
  getActiveGameForUser(userId: string): Promise<ActiveGame | undefined>;
  updateActiveGame(id: string, updates: Partial<ActiveGame>): Promise<ActiveGame>;
  completeActiveGame(id: string): Promise<ActiveGame>;

  // Game tables (Play with Friends — lobby + the shared hand itself)
  createGameTable(hostUserId: string, mode: string): Promise<{ table: GameTable; seats: TableSeat[] }>;
  joinTableByCode(code: string, userId: string): Promise<{ tableId: string; seat: TableSeat }>;
  placeTableBet(tableId: string, userId: string, amount: number): Promise<{ settled: boolean }>;
  acknowledgeTableResult(tableId: string, userId: string): Promise<void>;
  applyTableAction(tableId: string, userId: string, action: string): Promise<{ settled: boolean }>;
  applyTableSwap(
    tableId: string,
    userId: string,
    viaAd: boolean
  ): Promise<
    | { status: 404 | 400 | 409; message: string }
    | { status: 200; settled: boolean; swapTokens: number }
  >;
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

  // Block/report methods (Apple UGC moderation — Guideline 1.2)
  isBlocked(userAId: string, userBId: string): Promise<boolean>;
  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  reportUser(reporterId: string, reportedId: string, reason: string): Promise<UserReport>;

  // Rank Rewards methods
  getUserClaimedRankRewards(userId: string): Promise<RankRewardClaimed[]>;
  claimRankReward(userId: string, rankKey: string, gemsAwarded: number): Promise<RankRewardClaimed>;
  hasUserClaimedRankReward(userId: string, rankKey: string): Promise<boolean>;
}

// Default/fallback multiplayer turn order. The order actually used for a given hand is
// shuffled fresh in dealTableHand and stored on the table as `turnOrder` so it's the same
// for every seat's turn advance within that hand — this constant only matters as the
// starting point for that shuffle and as a fallback for hands dealt before turnOrder existed.
// No wraparound: once the last occupied seat's hand is done, the hand moves to settlement.
const TABLE_SEAT_ORDER = ["bottom", "left", "right"] as const;

// Fisher-Yates, same approach as ServerBlackjackEngine.createShuffledDeck — picks which seat
// acts first for the hand instead of always starting with the host's seat ("bottom").
function shuffleSeatOrder(): (typeof TABLE_SEAT_ORDER)[number][] {
  const order = [...TABLE_SEAT_ORDER];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

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
        level: 0,
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
        level: 0,
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

    const currentLevel = user.level ?? 0;
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

  // viewerId, when passed, hides rows on either side of a block relationship with the viewer
  // (see blockedUsers' own comment) — optional so callers that don't have a logged-in viewer
  // in scope (none currently, but kept safe) still get the unfiltered leaderboard.
  async getWeeklyClassicStreakLeaderboard(limit: number = 50, viewerId?: string): Promise<(ClassicStreakLeaderboard & { user: User; rank: number })[]> {
    const weekStart = this.getCurrentWeekStart();

    const notBlocked = viewerId
      ? sql`AND NOT EXISTS (
          SELECT 1 FROM ${blockedUsers}
          WHERE (${blockedUsers.blockerId} = ${viewerId} AND ${blockedUsers.blockedId} = ${users.id})
             OR (${blockedUsers.blockerId} = ${users.id} AND ${blockedUsers.blockedId} = ${viewerId})
        )`
      : sql``;

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
      .where(sql`${eq(classicStreakLeaderboard.weekStartDate, weekStart)} ${notBlocked}`)
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

  getPreviousWeekStart(): Date {
    const previousWeekStart = this.getCurrentWeekStart();
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    return previousWeekStart;
  }

  // Adds to this week's net coins total for the leaderboard — called from recordGameSettlement
  // (routes.ts) with each hand's netResult (payout - bet), so it accumulates what the player
  // actually won or lost from play this week, not their raw balance. Can go negative; the
  // underlying column is still named weekly_xp/weeklyXp (unmigrated — this table used to rank
  // by level-XP earned) but it now holds net coins won/lost instead.
  async addWeeklyXP(userId: string, coinsDelta: number): Promise<void> {
    const weekStart = this.getCurrentWeekStart();
    await db
      .insert(weeklyXpLeaderboard)
      .values({ userId, weekStartDate: weekStart, weeklyXp: coinsDelta })
      .onConflictDoUpdate({
        target: [weeklyXpLeaderboard.userId, weeklyXpLeaderboard.weekStartDate],
        set: {
          weeklyXp: sql`${weeklyXpLeaderboard.weeklyXp} + ${coinsDelta}`,
          updatedAt: new Date(),
        },
      });
  }

  // viewerId, when passed, hides rows on either side of a block relationship with the viewer —
  // see getWeeklyClassicStreakLeaderboard's own comment.
  async getWeeklyXpLeaderboard(limit: number = 50, viewerId?: string): Promise<(WeeklyXpLeaderboard & { user: User; rank: number })[]> {
    const weekStart = this.getCurrentWeekStart();

    const notBlocked = viewerId
      ? sql`AND NOT EXISTS (
          SELECT 1 FROM ${blockedUsers}
          WHERE (${blockedUsers.blockerId} = ${viewerId} AND ${blockedUsers.blockedId} = ${users.id})
             OR (${blockedUsers.blockerId} = ${users.id} AND ${blockedUsers.blockedId} = ${viewerId})
        )`
      : sql``;

    const entries = await db
      .select({
        id: weeklyXpLeaderboard.id,
        userId: weeklyXpLeaderboard.userId,
        weekStartDate: weeklyXpLeaderboard.weekStartDate,
        weeklyXp: weeklyXpLeaderboard.weeklyXp,
        createdAt: weeklyXpLeaderboard.createdAt,
        updatedAt: weeklyXpLeaderboard.updatedAt,
        user: {
          id: users.id,
          username: users.username,
          selectedAvatarId: users.selectedAvatarId,
          membershipType: users.membershipType,
          // level/seasonHandsWon: not previously needed here, now used by the Player Stats
          // popup (RankBadge + the "Lvl" header line) when a leaderboard row is tapped.
          level: users.level,
          seasonHandsWon: users.seasonHandsWon,
        }
      })
      .from(weeklyXpLeaderboard)
      .innerJoin(users, eq(weeklyXpLeaderboard.userId, users.id))
      .where(sql`${eq(weeklyXpLeaderboard.weekStartDate, weekStart)} ${notBlocked}`)
      .orderBy(sql`${weeklyXpLeaderboard.weeklyXp} DESC`)
      .limit(limit);

    return entries.map((entry: any, index: number) => ({
      ...entry,
      user: entry.user as User,
      rank: index + 1,
    }));
  }

  // Shared by claimWeeklyXpLeaderboardReward and getPendingWeeklyXpReward: figures out whether
  // the player placed top-3 in the previous (fully finished) week and hasn't claimed it yet,
  // without actually crediting anything — that side effect stays in claim* alone.
  private async getUnclaimedPreviousWeekPlacement(
    userId: string
  ): Promise<{ rank: number; gemsAwarded: number } | null> {
    const previousWeekStart = this.getPreviousWeekStart();

    const [alreadyClaimed] = await db
      .select()
      .from(weeklyXpRewardsClaimed)
      .where(
        and(
          eq(weeklyXpRewardsClaimed.userId, userId),
          eq(weeklyXpRewardsClaimed.weekStartDate, previousWeekStart)
        )
      );
    if (alreadyClaimed) return null;

    const topEntries = await db
      .select({ userId: weeklyXpLeaderboard.userId })
      .from(weeklyXpLeaderboard)
      .where(eq(weeklyXpLeaderboard.weekStartDate, previousWeekStart))
      .orderBy(sql`${weeklyXpLeaderboard.weeklyXp} DESC`)
      .limit(3);

    const rank = topEntries.findIndex((entry: { userId: string | null }) => entry.userId === userId) + 1;
    const gemsAwarded = rank > 0 ? WEEKLY_XP_LEADERBOARD_REWARDS[rank] : undefined;
    if (!gemsAwarded) return null;

    return { rank, gemsAwarded };
  }

  // Read-only peek used to drive the "Claim your reward" button/notification dot on the
  // leaderboard page — unlike claimWeeklyXpLeaderboardReward, this never credits gems, so it's
  // safe to call on every page load/poll instead of only once behind an explicit tap.
  async getPendingWeeklyXpReward(userId: string): Promise<{ rank: number; gemsAwarded: number } | null> {
    return this.getUnclaimedPreviousWeekPlacement(userId);
  }

  // Claims the gem reward for the player's rank in the *previous* (fully finished) week, if
  // they finished top 3 and haven't already claimed for that week. Ranking is recomputed from
  // scratch here rather than stored at week-end, since there's no cron/reset job in this
  // codebase's leaderboard pattern (see classicStreakLeaderboard's comment) — a new week is
  // just a new row, so "did I place" is answered on demand instead.
  async claimWeeklyXpLeaderboardReward(userId: string): Promise<
    | { claimed: false }
    | { claimed: true; rank: number; gemsAwarded: number }
  > {
    const previousWeekStart = this.getPreviousWeekStart();

    const placement = await this.getUnclaimedPreviousWeekPlacement(userId);
    if (!placement) return { claimed: false };
    const { rank, gemsAwarded } = placement;

    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    await this.updateUserGems(userId, (user.gems || 0) + gemsAwarded);
    await db.insert(weeklyXpRewardsClaimed).values({
      userId,
      weekStartDate: previousWeekStart,
      rank,
      gemsAwarded,
    });

    return { claimed: true, rank, gemsAwarded };
  }

  // Current week's live status for the header rank badge / prize subtitle — rank is computed
  // on the fly (count of players with strictly more XP this week, +1) rather than read off the
  // top-N list, since the player is very likely outside the top 50 shown there.
  async getMyWeeklyXpStatus(userId: string): Promise<{
    rank: number;
    weeklyXp: number;
    prizeGems: number;
    weekEndsAt: string;
  }> {
    const weekStart = this.getCurrentWeekStart();

    const [myEntry] = await db
      .select({ weeklyXp: weeklyXpLeaderboard.weeklyXp })
      .from(weeklyXpLeaderboard)
      .where(
        and(
          eq(weeklyXpLeaderboard.userId, userId),
          eq(weeklyXpLeaderboard.weekStartDate, weekStart)
        )
      );
    const weeklyXp = myEntry?.weeklyXp || 0;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(weeklyXpLeaderboard)
      .where(
        and(
          eq(weeklyXpLeaderboard.weekStartDate, weekStart),
          sql`${weeklyXpLeaderboard.weeklyXp} > ${weeklyXp}`
        )
      );
    const rank = count + 1;

    const weekEndsAt = new Date(weekStart);
    weekEndsAt.setDate(weekEndsAt.getDate() + 7);

    return {
      rank,
      weeklyXp,
      prizeGems: WEEKLY_XP_LEADERBOARD_REWARDS[rank] || 0,
      weekEndsAt: weekEndsAt.toISOString(),
    };
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

    // diff === 1 (won yesterday) only continues the streak if yesterday's reward was actually
    // claimed — winning alone used to be enough, which meant the streak survived even if the
    // player never opened the popup to collect anything. Requiring the claim (Stanislas,
    // 2026-08-26) means an unclaimed day breaks the chain exactly like a missed day would:
    // today's win still counts, but as a fresh day 1, not a continuation. Any other case
    // (first-ever win, yesterday claimed but a gap of 2+ days since, or diff === 1 with
    // streakRewardClaimed still false) also starts over at 1.
    const newStreak = diff === 1 && user.streakRewardClaimed ? (user.currentDayStreak || 0) + 1 : 1;
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
    claimableReward: { type: "coins" | "gems"; amount: number } | null;
    cycleRewards: { day: number; type: "coins" | "gems"; amount: number }[];
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
    | { claimed: true; reward: { type: "coins" | "gems"; amount: number }; currentStreak: number }
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
    }

    return { claimed: true, reward, currentStreak };
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

  // Picks a random unowned item of the given kind (read-only — no DB writes). Returns null if
  // the player already owns everything in that category.
  private async pickUnownedChestItem(userId: string, kind: ChestItemKind): Promise<ResolvedChestItem | null> {
    if (kind === 'cardBack') {
      const [allCardBacks, ownedCardBacks] = await Promise.all([
        this.getAllCardBacks(),
        this.getUserCardBacks(userId),
      ]);
      const ownedIds = new Set(ownedCardBacks.map((uc) => uc.cardBackId));
      const unowned = allCardBacks.filter((cb) => !ownedIds.has(cb.id));
      if (unowned.length === 0) return null;
      const cardBack = unowned[Math.floor(Math.random() * unowned.length)];
      return { kind, id: cardBack.id, name: cardBack.name, rarity: cardBack.rarity, imageUrl: cardBack.imageUrl };
    }

    if (kind === 'avatar') {
      const user = await this.getUser(userId);
      const owned = new Set(((user?.ownedAvatars as string[] | null) || []));
      const unowned = MYSTERY_AVATAR_IDS.filter((id) => !owned.has(id));
      if (unowned.length === 0) return null;
      const id = unowned[Math.floor(Math.random() * unowned.length)];
      return { kind, id, name: MYSTERY_AVATAR_NAMES[id] };
    }

    // emote
    const ownedEmotes = await this.getUserEmotes(userId);
    const ownedIds = new Set(ownedEmotes.map((e) => e.emoteId));
    const unowned = EMOTE_CATALOG.filter((e) => !ownedIds.has(e.id));
    if (unowned.length === 0) return null;
    const entry = unowned[Math.floor(Math.random() * unowned.length)];
    return { kind, id: entry.id, name: entry.name };
  }

  // Rolls a chest's reward and, if it landed on an item, picks which specific unowned card
  // back/avatar/emote to grant (read-only — no DB writes). Shared by claimBattlePassTier and
  // openChest so the Shop and the Battle Pass resolve gold/purple/crown chests through the
  // exact same logic. If the rolled item type has nothing left to unlock, tries the other two
  // item types before finally falling back to a guaranteed resource reward — a chest never
  // resolves to nothing.
  private async resolveChestRoll(
    userId: string,
    chestTier: BattlePassChestTier,
    multiplier: number
  ): Promise<{ rewards: { kind: ChestResourceKind; amount: number }[]; item: ResolvedChestItem | null }> {
    const roll = rollChestReward(chestTier, multiplier);

    if (roll.itemKind) {
      const otherKinds = (['cardBack', 'avatar', 'emote'] as const).filter((k) => k !== roll.itemKind);
      for (const kind of [roll.itemKind, ...otherKinds]) {
        const item = await this.pickUnownedChestItem(userId, kind);
        if (item) return { rewards: [], item };
      }
      // Every item category is fully collected — fall back to a guaranteed resource reward.
      return { rewards: rollFallbackResourceReward(chestTier, multiplier), item: null };
    }

    return { rewards: roll.rewards, item: null };
  }

  // Applies a resolved item's grant inside an open transaction, merging it into the same
  // `balanceUpdates` object the caller uses for the users-row update (so a card back/emote
  // insert is the only *extra* write — an avatar grant needs none, it's part of that same
  // users-row update). Returns the {cardBack, avatar, emote} triple for the response.
  private async applyChestItemGrant(
    tx: any,
    userId: string,
    user: { ownedAvatars: unknown },
    balanceUpdates: any,
    item: ResolvedChestItem | null,
    source: 'battlepass' | 'shop'
  ): Promise<{
    cardBack: { id: string; name: string; rarity: string; imageUrl: string } | null;
    avatar: { id: string; name: string } | null;
    emote: { id: string; name: string } | null;
  }> {
    if (!item) return { cardBack: null, avatar: null, emote: null };

    if (item.kind === 'cardBack') {
      try {
        await tx.insert(userCardBacks).values({ userId, cardBackId: item.id, source });
        return { cardBack: { id: item.id, name: item.name, rarity: item.rarity!, imageUrl: item.imageUrl! }, avatar: null, emote: null };
      } catch (error: any) {
        if (error.code !== '23505') throw error;
        return { cardBack: null, avatar: null, emote: null };
      }
    }

    if (item.kind === 'avatar') {
      const owned = ((user.ownedAvatars as string[] | null) || []);
      if (!owned.includes(item.id)) {
        balanceUpdates.ownedAvatars = [...owned, item.id];
      }
      return { cardBack: null, avatar: { id: item.id, name: item.name }, emote: null };
    }

    // emote
    try {
      await tx.insert(userEmotesTable).values({ userId, emoteId: item.id, source });
      return { cardBack: null, avatar: null, emote: { id: item.id, name: item.name } };
    } catch (error: any) {
      if (error.code !== '23505') throw error;
      return { cardBack: null, avatar: null, emote: null };
    }
  }

  async claimBattlePassTier(userId: string, seasonId: string, tier: number, isPremium: boolean = false): Promise<BattlePassClaimResult> {
    const chestTier = getChestTierForPassTier(tier, isPremium);
    const multiplier = amountMultiplierForTier(tier);
    const { rewards, item } = await this.resolveChestRoll(userId, chestTier, multiplier);
    const coinsForLog = rewards.find((r) => r.kind === 'coins')?.amount ?? 0;

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

      // Step 2: Insert claim record atomically. rewardType/rewardAmount aren't read back
      // anywhere else in the codebase (checked: only tier/isPremium/userId/seasonId are
      // queried) so they just carry a human-readable summary for admin/DB debugging.
      await tx
        .insert(battlePassRewards)
        .values({
          userId,
          seasonId,
          tier,
          isPremium,
          rewardType: chestTier,
          rewardAmount: coinsForLog
        });

      // Step 3: Lock user row and get current balances atomically
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update'); // CRITICAL: Lock row to prevent race conditions

      if (!user) throw new Error('User not found');

      // Step 4: Apply every resource this chest rolled (1 for wood/silver/gold, 0-2 for
      // purple/crown) plus an avatar grant if that's what was rolled (card back/emote grants
      // are separate inserts, applied right after), atomically
      const balanceUpdates: any = { updatedAt: new Date() };
      for (const reward of rewards) {
        if (reward.kind === 'coins') balanceUpdates.coins = (user.coins || 0) + reward.amount;
        if (reward.kind === 'gems') balanceUpdates.gems = (user.gems || 0) + reward.amount;
        if (reward.kind === 'swapTokens') balanceUpdates.swapTokens = (user.swapTokens || 0) + reward.amount;
      }
      const granted = await this.applyChestItemGrant(tx, userId, user, balanceUpdates, item, 'battlepass');
      await tx.update(users).set(balanceUpdates).where(eq(users.id, userId));

      const rewardsSummary = rewards.map((r) => `${r.amount} ${r.kind}`).join(', ')
        || granted.cardBack?.name || granted.avatar?.name || granted.emote?.name || 'nothing';
      console.log(`🎊 Battle Pass: User ${user.username} claimed tier ${tier} (${isPremium ? 'premium' : 'free'}) - ${chestTier} chest: ${rewardsSummary}`);

      return { chestTier, rewards, ...granted };
    });
  }

  async openChest(userId: string, tier: ChestTier): Promise<ChestOpenResult> {
    const chestTier = tier as unknown as BattlePassChestTier; // ChestTier ('gold'|'purple'|'crown') is a subset of BattlePassChestTier
    const cost = chestCostFor(tier);
    const { rewards, item } = await this.resolveChestRoll(userId, chestTier, 1);

    return await db.transaction(async (tx: any) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update'); // Lock row: balance check + spend must be atomic with the reward grant

      if (!user) throw new Error('User not found');
      if ((user.gems || 0) < cost) throw new Error('Not enough gems');

      const balanceUpdates: any = { gems: (user.gems || 0) - cost, updatedAt: new Date() };
      for (const reward of rewards) {
        if (reward.kind === 'coins') balanceUpdates.coins = (user.coins || 0) + reward.amount;
        if (reward.kind === 'gems') balanceUpdates.gems = balanceUpdates.gems + reward.amount;
        if (reward.kind === 'swapTokens') balanceUpdates.swapTokens = (user.swapTokens || 0) + reward.amount;
      }
      const granted = await this.applyChestItemGrant(tx, userId, user, balanceUpdates, item, 'shop');
      await tx.update(users).set(balanceUpdates).where(eq(users.id, userId));

      return { chestTier, rewards, ...granted };
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

  // Net coins won/lost per bucket for the Profile coin-history chart — a rolling window
  // counted back from now (not calendar-aligned days), bucketed by hour for 24h and by day
  // for 7d/30d. game_stats has no dedicated ledger, but createGameStats inserts one row per
  // resolved hand rather than upserting (see getUserStats above), so it already works as a
  // per-hand event log with a real createdAt — summing totalWinnings - totalLosses per row
  // gives the same net result a ledger table would.
  async getCoinsHistory(userId: string, range: "24h" | "7d" | "30d"): Promise<{ bucketStart: string; net: number }[]> {
    const bucketMs = range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const bucketCount = range === "24h" ? 24 : range === "7d" ? 7 : 30;
    const since = new Date(Date.now() - bucketCount * bucketMs);

    const rows = await db
      .select({
        createdAt: gameStats.createdAt,
        totalWinnings: gameStats.totalWinnings,
        totalLosses: gameStats.totalLosses,
      })
      .from(gameStats)
      .where(and(eq(gameStats.userId, userId), gte(gameStats.createdAt, since)));

    const buckets = new Array(bucketCount).fill(0);
    for (const row of rows) {
      const createdAtMs = row.createdAt ? new Date(row.createdAt).getTime() : Date.now();
      const index = Math.floor((createdAtMs - since.getTime()) / bucketMs);
      if (index >= 0 && index < bucketCount) {
        buckets[index] += (row.totalWinnings || 0) - (row.totalLosses || 0);
      }
    }

    return buckets.map((net, index) => ({
      bucketStart: new Date(since.getTime() + index * bucketMs).toISOString(),
      net,
    }));
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

  async getFreeSpinStatus(userId: string): Promise<{ canSpin: boolean; secondsUntilReset: number; spinsTowardBonus: number }> {
    const user = await this.getUser(userId);
    const spinsTowardBonus = user?.spinsTowardBonusFreeSpin ?? 0;
    // The bonus (every 5 ad/gem spins) makes a free spin available right away, independent of
    // the daily timer below -- checked first since it should short-circuit a "come back in Xh"
    // countdown that's otherwise still ticking.
    if (user?.bonusFreeSpinAvailable) {
      return { canSpin: true, secondsUntilReset: 0, spinsTowardBonus };
    }

    const lastSpinAt = await this.getLastFreeSpinAt(userId);
    if (!lastSpinAt) return { canSpin: true, secondsUntilReset: 0, spinsTowardBonus };

    const nextReset = getNextParisResetAt(lastSpinAt);
    const now = new Date();
    if (now >= nextReset) return { canSpin: true, secondsUntilReset: 0, spinsTowardBonus };

    return {
      canSpin: false,
      secondsUntilReset: Math.ceil((nextReset.getTime() - now.getTime()) / 1000),
      spinsTowardBonus,
    };
  }

  // Called after an ad-watch or premium (gem) spin completes -- NOT the free daily spin itself,
  // which shouldn't help earn another free spin back early. Every 5th call flips
  // bonusFreeSpinAvailable on and resets the counter; see the schema field's own comment.
  async incrementSpinsTowardBonusFreeSpin(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const next = (user.spinsTowardBonusFreeSpin ?? 0) + 1;
    if (next >= 5) {
      await this.updateUser(userId, { spinsTowardBonusFreeSpin: 0, bonusFreeSpinAvailable: true });
    } else {
      await this.updateUser(userId, { spinsTowardBonusFreeSpin: next });
    }
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

  // Card Back methods implementation
  async getAllCardBacks(): Promise<CardBack[]> {
    return await db
      .select()
      .from(cardBacks)
      .where(eq(cardBacks.isActive, true))
      .orderBy(cardBacks.name);
  }

  async getCardBack(id: string): Promise<CardBack | undefined> {
    const [cardBack] = await db
      .select()
      .from(cardBacks)
      .where(eq(cardBacks.id, id))
      .limit(1);
    return cardBack || undefined;
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

  // Grants a card back to a user (Gold chest reward). Swallows the unique-constraint
  // violation on a repeat roll — the user already paid the chest cost, so a duplicate
  // pull shouldn't fail the whole open, just report itself as a duplicate to the caller.
  async addCardBackToUser(userId: string, cardBackId: string): Promise<{ duplicate: boolean }> {
    try {
      await db.insert(userCardBacks).values({ userId, cardBackId, source: 'reward' });
      return { duplicate: false };
    } catch (error: any) {
      if (error.code === '23505') return { duplicate: true };
      throw error;
    }
  }

  async hasUserCardBack(userId: string, cardBackId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(userCardBacks)
      .where(and(eq(userCardBacks.userId, userId), eq(userCardBacks.cardBackId, cardBackId)))
      .limit(1);
    return !!existing;
  }

  // User Emote methods implementation — mirrors the card back methods above; the catalog
  // itself (id + name) lives in shared/emoteCatalog.ts, not a DB table.
  async getUserEmotes(userId: string): Promise<UserEmote[]> {
    return await db
      .select()
      .from(userEmotesTable)
      .where(eq(userEmotesTable.userId, userId));
  }

  async addEmoteToUser(userId: string, emoteId: string): Promise<{ duplicate: boolean }> {
    try {
      await db.insert(userEmotesTable).values({ userId, emoteId, source: 'reward' });
      return { duplicate: false };
    } catch (error: any) {
      if (error.code === '23505') return { duplicate: true };
      throw error;
    }
  }

  async hasUserEmote(userId: string, emoteId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(userEmotesTable)
      .where(and(eq(userEmotesTable.userId, userId), eq(userEmotesTable.emoteId, emoteId)))
      .limit(1);
    return !!existing;
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
      // placeTableBet's seat-count check below). Every hand after the first goes back through
      // "waiting" once it settles, and placeTableBet itself reopens "betting" from there.
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
  // while the table is "waiting". Any coins already staked on a confirmed bet are forfeited,
  // never refunded — leaving is a real exit, not a way to walk a bet back. The game keeps
  // moving for whoever's left (advancing the turn, or dealing/settling if your departure
  // happens to be what everyone else was waiting on) — the table itself was never meant to be
  // tied to whoever happened to create it. Only the very last seat leaving actually closes it.
  // If the host specifically leaves while others remain, the host role (needed for starting the
  // next hand) passes to one of the players still seated.
  async leaveTable(tableId: string, userId: string): Promise<{ tableClosed: boolean; settled: boolean }> {
    return await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, tableId)).for("update");
      if (!table) throw new Error("Table not found");

      const seats: TableSeat[] = await tx.select().from(tableSeats).where(eq(tableSeats.tableId, tableId));
      const mySeat = seats.find((s) => s.userId === userId);
      if (!mySeat) throw new Error("You're not seated at this table");

      // placeTableBet debits coins the instant a bet is confirmed, win/lose still unknown at
      // that point — waiting on the rest of the table to also bet, same as an already-dealt
      // hand, is money already out of your balance. Leaving forfeits it either way, same as
      // Classic solo's own /api/game/forfeit; there's nothing left here that would ever need
      // refunding.
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
        const turnOrder = (table.turnOrder as (typeof TABLE_SEAT_ORDER)[number][] | null) ?? TABLE_SEAT_ORDER;
        const orderedRemaining = turnOrder
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

  // Debits the caller's bet and marks them ready. Once every seated player has confirmed,
  // deals the whole table in the same transaction — a real-money debit and a deal must not be
  // split across separate transactions, or a crash between them could lose track of a bet.
  async placeTableBet(tableId: string, userId: string, amount: number): Promise<{ settled: boolean }> {
    return await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, tableId)).for("update");
      if (!table) throw new Error("Table not found");
      if (table.status !== "betting" && table.status !== "waiting") throw new Error("This table isn't taking bets right now");

      // A settled hand leaves the table sitting in "waiting" — there's no separate host-only
      // "start the next hand" step (that used to mean whichever player's dismiss reached the
      // server first would yank *everyone* into the next round, cutting off anyone still
      // reviewing their own result sheet). Whoever places the first bet after a hand settles is
      // what actually opens the new round, lazily, right here — clearing every seat's stale
      // bet/hand state from the previous hand first. The `for ("update")` lock on the table row
      // above means two players racing to bet first still serialize safely: whichever
      // transaction commits first does this reset, and the other sees status already "betting".
      if (table.status === "waiting") {
        await tx.update(tableSeats).set({ betAmount: null, betConfirmed: false, hand: null }).where(eq(tableSeats.tableId, tableId));
        await tx.update(gameTables).set({ status: "betting", updatedAt: new Date() }).where(eq(gameTables.id, tableId));
      }

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

  // Flips *only* my own seat's betConfirmed to false the moment I dismiss my result sheet —
  // table.status and my seat's `hand` are left completely alone (placeTableBet's lazy reopen
  // still clears those for everyone, on whoever bets first). betConfirmed is otherwise just
  // sitting stale at `true` from the round that already settled, so using it here as "have I
  // personally moved past my last result" lets the client tell that apart from everyone else's
  // without touching `hand` — which needs to stay put, still showing "Lost 1"/"Won"/etc. under
  // my own seat, for exactly as long as anyone else hasn't dismissed theirs yet.
  async acknowledgeTableResult(tableId: string, userId: string): Promise<void> {
    await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, tableId)).for("update");
      if (!table) throw new Error("Table not found");
      if (table.status !== "waiting") return; // nothing to acknowledge outside the post-hand review window

      const [mySeat] = await tx.select().from(tableSeats).where(and(eq(tableSeats.tableId, tableId), eq(tableSeats.userId, userId)));
      if (!mySeat) throw new Error("You're not seated at this table");
      if (!mySeat.betConfirmed) return; // already acknowledged

      await tx.update(tableSeats).set({ betConfirmed: false }).where(eq(tableSeats.id, mySeat.id));
    });
  }

  // Play with Friends' equivalent of the classic-solo "watch an ad to double your win" claim
  // (see /api/game/double-reward in routes.ts) — same trust model (client only calls this
  // after the rewarded ad actually played through) and the exact same daily counter on
  // `users`, so someone who's already spent an ad in Classic today has fewer left here too.
  async doubleTableSeatReward(
    tableId: string,
    userId: string
  ): Promise<
    | { status: 404 | 400 | 409; message: string }
    | { status: 429; message: string; watchedToday: number; limit: number; resetAt: string }
    | { status: 200; newNetResult: number; remainingCoins: number; watchedToday: number; limit: number }
  > {
    return await db.transaction(async (tx: any) => {
      const [seat] = await tx
        .select()
        .from(tableSeats)
        .where(and(eq(tableSeats.tableId, tableId), eq(tableSeats.userId, userId)))
        .for("update");

      if (!seat) return { status: 404, message: "Seat not found" };
      const hand = seat.hand as PlayerHand | null;
      if (!hand || !hand.result) return { status: 400, message: "Hand not resolved yet" };
      if (hand.rewardDoubled) return { status: 409, message: "Reward already doubled" };

      const netResult = (hand.payout || 0) - hand.bet;
      if (netResult <= 0) return { status: 400, message: "Nothing to double" };

      const [userRow] = await tx
        .select({ watched: users.doubleRewardAdsWatched, date: users.doubleRewardAdsDate })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      const todayKey = getParisDateKey(new Date());
      const watchedToday = userRow?.date === todayKey ? (userRow.watched ?? 0) : 0;

      if (watchedToday >= DOUBLE_REWARD_AD_DAILY_LIMIT) {
        return {
          status: 429,
          message: "Daily limit reached",
          watchedToday,
          limit: DOUBLE_REWARD_AD_DAILY_LIMIT,
          resetAt: getNextParisMidnight(new Date()).toISOString(),
        };
      }

      const [creditedUser] = await tx
        .update(users)
        .set({
          coins: sql`${users.coins} + ${netResult}`,
          doubleRewardAdsWatched: watchedToday + 1,
          doubleRewardAdsDate: todayKey,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      await tx.update(tableSeats).set({ hand: { ...hand, rewardDoubled: true } }).where(eq(tableSeats.id, seat.id));

      return {
        status: 200,
        newNetResult: netResult * 2,
        remainingCoins: creditedUser.coins,
        watchedToday: watchedToday + 1,
        limit: DOUBLE_REWARD_AD_DAILY_LIMIT,
      };
    });
  }

  // Shuffles and deals the whole table once every seated player has confirmed a bet — shared
  // by placeTableBet (the normal path) and leaveTable (a guest leaving mid-betting can
  // happen to be the last confirmation everyone else was waiting on).
  private async dealTableHand(tx: any, tableId: string, mode: string, seats: TableSeat[]): Promise<{ settled: boolean }> {
    const deck = ServerBlackjackEngine.createShuffledDeck();
    const deckSeed = randomBytes(16).toString("hex");
    const deckHash = createHash("sha256").update(JSON.stringify(deck)).digest("hex");

    const handTurnOrder = shuffleSeatOrder();
    const orderedSeats = handTurnOrder
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
        turnOrder: handTurnOrder,
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

      return this.advanceTurnOrSettle(tx, tableId, table, seats, mySeat, hand, deck);
    });
  }

  // Shared tail of applyTableAction and applyTableSwap: once the acting seat's hand is no
  // longer "active" (stood/busted/doubled-out/surrendered/swapped-into-blackjack), either hand
  // the turn to the next seat still with an active hand, or — if none are left — settle the
  // whole table against the dealer.
  private async advanceTurnOrSettle(
    tx: any,
    tableId: string,
    table: GameTable,
    seats: TableSeat[],
    mySeat: TableSeat,
    hand: PlayerHand,
    deck: Card[]
  ): Promise<{ settled: boolean }> {
    const turnOrder = (table.turnOrder as (typeof TABLE_SEAT_ORDER)[number][] | null) ?? TABLE_SEAT_ORDER;
    const orderedSeats = turnOrder
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
  }

  // SWAP — Play with Friends. Same rules as Classic solo's POST /api/game/swap (see routes.ts):
  // spends 1 Swap token (or, with viaAd, a rewarded ad watched in place of one) to discard my
  // seat's starting 2-card hand and deal 2 fresh cards from the table's shared, already-shuffled
  // deck. Only legal on my own turn, on the original un-acted-on hand, capped at one swap per
  // hand — same "first decision" window Double uses. A natural on the redeal doesn't settle
  // immediately the way solo's does (this seat still has to wait for the rest of the table and
  // the dealer — see settleHandsAgainstDealer's own comment), so it just marks the hand
  // "blackjack" and falls into the same turn-advance/settle path a stand or bust would.
  async applyTableSwap(
    tableId: string,
    userId: string,
    viaAd: boolean
  ): Promise<
    | { status: 404 | 400 | 409; message: string }
    | { status: 200; settled: boolean; swapTokens: number }
  > {
    return await db.transaction(async (tx: any) => {
      const [table] = await tx.select().from(gameTables).where(eq(gameTables.id, tableId)).for("update");
      if (!table) return { status: 404 as const, message: "Table not found" };
      if (table.status !== "in_progress") return { status: 400 as const, message: "No hand in progress" };
      if (table.currentTurnUserId !== userId) return { status: 400 as const, message: "It's not your turn" };

      const seats: TableSeat[] = await tx.select().from(tableSeats).where(eq(tableSeats.tableId, tableId));
      const mySeat = seats.find((s) => s.userId === userId);
      if (!mySeat || !mySeat.hand) return { status: 400 as const, message: "You don't have a hand to act on" };

      const hand = mySeat.hand as PlayerHand;
      if (hand.status !== "active" || hand.cards.length !== 2) {
        return { status: 400 as const, message: "Too late to swap" };
      }
      if (hand.swapped) {
        return { status: 409 as const, message: "Already swapped this hand" };
      }

      const [userRow] = await tx
        .select({ swapTokens: users.swapTokens })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      if (!viaAd && (!userRow || (userRow.swapTokens || 0) <= 0)) {
        return { status: 400 as const, message: "No swaps left" };
      }

      // An ad-earned swap spends nothing — the balance stays whatever it already was.
      const finalSwapTokens = viaAd
        ? userRow?.swapTokens || 0
        : (
            await tx
              .update(users)
              .set({ swapTokens: sql`${users.swapTokens} - 1`, updatedAt: new Date() })
              .where(eq(users.id, userId))
              .returning()
          )[0].swapTokens;

      const deck = table.deck as Card[];
      const newCards = [deck.pop()!, deck.pop()!];
      hand.cards = newCards;
      hand.swapped = true;
      if (ServerBlackjackEngine.isBlackjack(newCards)) {
        hand.status = "blackjack";
      }

      await tx.update(tableSeats).set({ hand }).where(eq(tableSeats.id, mySeat.id));
      await tx.update(gameTables).set({ deck, updatedAt: new Date() }).where(eq(gameTables.id, tableId));

      if (hand.status === "active") {
        // Not a natural — same seat keeps its turn, exactly like a hit that didn't bust.
        return { status: 200 as const, settled: false, swapTokens: finalSwapTokens };
      }

      const { settled } = await this.advanceTurnOrSettle(tx, tableId, table, seats, mySeat, hand, deck);
      return { status: 200 as const, settled, swapTokens: finalSwapTokens };
    });
  }

  // Shared by placeTableBet (everyone dealt a natural) and applyTableAction (last seat
  // done): plays the dealer out once against every seat's final hand, credits each seat's
  // own user with their own payout, and returns the table to the lobby. Deliberately leaves
  // each seat's `hand` (with its final result/payout) and the table's `dealerHand` in place
  // rather than clearing them — the lobby shows the last hand's outcome until someone bets
  // again, at which point placeTableBet clears it.
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
      // Hide blocked users from search in both directions: neither party should be able to
      // find the other, regardless of who blocked whom (see blockedUsers' own comment).
      conditions = and(conditions, sql`NOT EXISTS (
        SELECT 1 FROM ${blockedUsers}
        WHERE (${blockedUsers.blockerId} = ${excludeUserId} AND ${blockedUsers.blockedId} = ${users.id})
           OR (${blockedUsers.blockerId} = ${users.id} AND ${blockedUsers.blockedId} = ${excludeUserId})
      )`) || conditions;
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

    if (await this.isBlocked(requesterId, recipientId)) {
      throw new Error('Cannot send a friend request to this user');
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

  // Directional: true if either user has blocked the other. Used to gate friend requests and
  // to exclude blocked users from search/leaderboards (see searchUsersByUsername,
  // getWeeklyXpLeaderboard, getWeeklyClassicStreakLeaderboard).
  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const rows = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(
        sql`(${blockedUsers.blockerId} = ${userAId} AND ${blockedUsers.blockedId} = ${userBId}) OR
            (${blockedUsers.blockerId} = ${userBId} AND ${blockedUsers.blockedId} = ${userAId})`
      )
      .limit(1);
    return rows.length > 0;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) throw new Error('Cannot block yourself');

    // Blocking severs any existing friendship/pending request between them too — same delete
    // removeFriend uses, minus its 'accepted'-only filter so a still-pending request is also
    // cleared, not just an established friendship.
    await db
      .delete(friendships)
      .where(
        sql`(${friendships.requesterId} = ${blockerId} AND ${friendships.recipientId} = ${blockedId}) OR
            (${friendships.requesterId} = ${blockedId} AND ${friendships.recipientId} = ${blockerId})`
      );

    await db
      .insert(blockedUsers)
      .values({ blockerId, blockedId })
      .onConflictDoNothing();
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await db
      .delete(blockedUsers)
      .where(
        and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId))
      );
  }

  // No admin panel yet (see routes.ts) — a report is just an insert here, reviewed directly
  // in the DB for now.
  async reportUser(reporterId: string, reportedId: string, reason: string): Promise<UserReport> {
    if (reporterId === reportedId) throw new Error('Cannot report yourself');

    const [report] = await db
      .insert(userReports)
      .values({ reporterId, reportedId, reason })
      .returning();

    return report;
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
        // Season-scoped rank counter (see users.seasonHandsWon's own comment) — powers the
        // read-only RankBadge in the Friend Stats popup, distinct from totalWins below (the
        // lifetime gameStats sum).
        seasonHandsWon: users.seasonHandsWon,
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
      .groupBy(friendships.id, users.id, users.username, users.selectedAvatarId, users.level, users.coins, users.xp, users.membershipType, users.createdAt, users.lastActiveAt, users.seasonHandsWon)
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
    // (which reads level/currentLevelXP directly) shows everyone back at level 0,
    // with tier 1 locked again until they earn their first level.
    await db
      .update(users)
      .set({
        level: 0,
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
