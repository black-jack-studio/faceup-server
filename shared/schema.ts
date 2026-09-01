import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, timestamp, boolean, jsonb, pgEnum, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { meetsPasswordRequirements } from "./passwordStrength";

// Enums
export const cardBackRarity = pgEnum('card_back_rarity', ['COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"), // null for Apple-only accounts (no password to check)
  appleId: text("apple_id").unique(), // Apple's stable per-user 'sub' claim
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: varchar("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  passwordResetCode: varchar("password_reset_code"), // 6-digit code emailed for password reset
  passwordResetCodeExpiresAt: timestamp("password_reset_code_expires_at"),
  pushToken: text("push_token"), // device push token from @capacitor/push-notifications — one device per user for now
  pushPlatform: text("push_platform"), // 'ios' | 'android', whatever registered the token above
  lastActiveAt: timestamp("last_active_at"), // touched (throttled) by requireAuth on any authenticated request — drives the online/offline dot on the friends list, not a precise presence system
  xp: integer("xp").default(0), // XP total pour statistiques
  currentLevelXP: integer("current_level_xp").default(0), // XP dans le niveau actuel (0-499)
  level: integer("level").default(0),
  seasonXp: integer("season_xp").default(0), // XP pour la saison courante du battlepass
  seasonHandsWon: integer("season_hands_won").default(0), // Mains gagnées dans la saison courante (pilote le rang animal, reset avec le battlepass — distinct de gameStats.handsWon, la stat à vie affichée sur le profil)
  coins: bigint("coins", { mode: "number" }).default(1000),
  gems: bigint("gems", { mode: "number" }).default(0),
  // New currency, Classic solo only — spent to discard a just-dealt starting hand and redeal
  // 2 fresh cards from the same shoe. No earn source yet (added later, e.g. chests/battle
  // pass); the 5 default is a v1 stopgap so there's something to test with.
  swapTokens: integer("swap_tokens").notNull().default(5),
  selectedAvatarId: text("selected_avatar_id").default("face-with-tears-of-joy"),
  ownedAvatars: jsonb("owned_avatars").default([]), // Array of owned avatar IDs
  selectedCardBackId: text("selected_card_back_id"),
  privacySettings: jsonb("privacy_settings").default({
    profileVisibility: "public",
    showStats: true,
    showLevel: true,
    allowMessages: true,
    dataCollection: true
  }),
  membershipType: text("membership_type").default("normal"), // 'normal', 'premium'
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  subscriptionStartedAt: timestamp("subscription_started_at"), // set once on first /subscribe, cleared on downgrade to normal -- drives the billing history recap on Manage Subscription
  subscriptionPlan: text("subscription_plan"), // 'monthly', 'annual' — which Premium plan is active
  subscriptionCancelAtPeriodEnd: boolean("subscription_cancel_at_period_end").default(false), // true once the user cancels; access stays until subscriptionExpiresAt, then status route downgrades to normal
  subscriptionCancelReason: text("subscription_cancel_reason"), // reason picked on the cancel screen, kept for reference until the next resubscribe
  subscriptionDiscounted: boolean("subscription_discounted").default(false), // accepted the -50% retention offer instead of cancelling
  bonusCoins: bigint("bonus_coins", { mode: "number" }).default(0), // Non-withdrawable rebate coins from losses
  allInLoseStreak: integer("all_in_lose_streak").default(0), // Track consecutive All-in losses
  currentStreakClassic: integer("current_streak_classic").default(0), // Current consecutive wins in solo Classic mode
  currentDayStreak: integer("current_day_streak").default(0), // Consecutive calendar days (Paris time) with at least one Classic solo win
  longestDayStreak: integer("longest_day_streak").default(0), // Best currentDayStreak ever reached
  lastStreakWinDate: text("last_streak_win_date"), // Paris date ("YYYY-MM-DD") of the last day that counted toward currentDayStreak
  streakRewardClaimed: boolean("streak_reward_claimed").default(true), // False right after a win advances currentDayStreak, until the player claims that day's reward via the streak popup
  referralCode: text("referral_code").unique(), // Unique 6-character referral code
  referredBy: varchar("referred_by"), // ID of user who referred this user
  referralCount: integer("referral_count").default(0), // Number of users referred
  referralRewardClaimed: boolean("referral_reward_claimed").default(false), // Whether reward for being referred has been claimed
  doubleRewardAdsWatched: integer("double_reward_ads_watched").default(0), // Count of "watch ad to 2X" claims on doubleRewardAdsDate (Paris calendar day), capped at DOUBLE_REWARD_AD_DAILY_LIMIT
  doubleRewardAdsDate: text("double_reward_ads_date"), // Paris date ("YYYY-MM-DD") doubleRewardAdsWatched is counting for — a stale date means today's count is actually 0
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gameStats = pgTable("game_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  gameType: text("game_type").notNull(), // 'practice', 'cash', 'counting'
  handsPlayed: integer("hands_played").default(0),
  handsWon: integer("hands_won").default(0),
  handsLost: integer("hands_lost").default(0),
  handsPushed: integer("hands_pushed").default(0),
  totalWinnings: bigint("total_winnings", { mode: "number" }).default(0),
  totalLosses: bigint("total_losses", { mode: "number" }).default(0),
  blackjacks: integer("blackjacks").default(0),
  busts: integer("busts").default(0),
  correctDecisions: integer("correct_decisions").default(0),
  totalDecisions: integer("total_decisions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  itemType: text("item_type").notNull(), // 'card_back', 'theme', 'avatar'
  itemId: text("item_id").notNull(),
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

export const dailySpins = pgTable("daily_spins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  lastSpinAt: timestamp("last_spin_at").defaultNow(),
  reward: jsonb("reward"),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeType: text("challenge_type").notNull(), // 'wins', 'hands', 'blackjacks', 'streak', 'coins_won'
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetValue: integer("target_value").notNull(),
  reward: bigint("reward", { mode: "number" }).notNull(), // coins reward
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const userChallenges = pgTable("user_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id"), // Changed to uuid to match existing database
  challengeId: varchar("challenge_id").references(() => challenges.id),
  currentProgress: integer("current_progress").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").default(false),
  startedAt: timestamp("started_at").defaultNow(),
});

// Battlepass Seasons Table
export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`), // Keep UUID for existing data
  seasonIdentifier: varchar("season_identifier"), // YYYY-MM format for season comparison (nullable for migration)
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  maxXp: integer("max_xp").default(500),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Battle Pass Rewards Claims Table
export const battlePassRewards = pgTable("battle_pass_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  seasonId: varchar("season_id").references(() => seasons.id),
  tier: integer("tier").notNull(),
  isPremium: boolean("is_premium").default(false),
  rewardType: text("reward_type").notNull(), // 'coins', 'gems'
  rewardAmount: bigint("reward_amount", { mode: "number" }).notNull(),
  claimedAt: timestamp("claimed_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
}).extend({
  // password is nullable on the users table (Apple-only accounts have none), but the
  // normal register flow must still require one — createInsertSchema would otherwise
  // infer it as optional/nullable from the column and silently allow a passwordless
  // registration. The register screen's own checklist (8+ chars, a digit, a special
  // character — see passwordStrength.ts) already blocks submitting anything short of that;
  // this mirrors the same rule server-side, so it can't be skipped by calling the API directly.
  password: z.string().refine((password) => meetsPasswordRequirements(password), {
    message: "Password must be at least 8 characters and include a number and a special character",
  }),
});

export const insertGameStatsSchema = createInsertSchema(gameStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  acquiredAt: true,
});

export const insertDailySpinSchema = createInsertSchema(dailySpins).omit({
  id: true,
  lastSpinAt: true,
});

export const insertBattlePassRewardSchema = createInsertSchema(battlePassRewards).omit({
  id: true,
  claimedAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGameStats = z.infer<typeof insertGameStatsSchema>;
export type GameStats = typeof gameStats.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertDailySpin = z.infer<typeof insertDailySpinSchema>;
export type DailySpin = typeof dailySpins.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
});

export const insertUserChallengeSchema = createInsertSchema(userChallenges).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
});

// Gem Transactions Table
export const gemTransactions = pgTable("gem_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  transactionType: text("transaction_type").notNull(), // 'purchase', 'reward', 'spend', 'refund'
  amount: bigint("amount", { mode: "number" }).notNull(), // positive for gaining gems, negative for spending
  description: text("description").notNull(),
  relatedId: varchar("related_id"), // reference to purchase, challenge, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Gem Purchases Table (for things you can buy with gems)
export const gemPurchases = pgTable("gem_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  itemType: text("item_type").notNull(), // 'avatar', 'theme', 'card_back', 'coins', 'boost'
  itemId: text("item_id").notNull(),
  gemCost: bigint("gem_cost", { mode: "number" }).notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const insertGemTransactionSchema = createInsertSchema(gemTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertGemPurchaseSchema = createInsertSchema(gemPurchases).omit({
  id: true,
  purchasedAt: true,
});

export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasons.$inferSelect;
export type InsertGemTransaction = z.infer<typeof insertGemTransactionSchema>;
export type GemTransaction = typeof gemTransactions.$inferSelect;
export type InsertGemPurchase = z.infer<typeof insertGemPurchaseSchema>;
export type GemPurchase = typeof gemPurchases.$inferSelect;

// Card back selection schema for PATCH /api/user/selected-card-back - unified with corrected schema above
export type SelectCardBack = z.infer<typeof selectCardBackSchema>;
export type InsertBattlePassReward = z.infer<typeof insertBattlePassRewardSchema>;
export type BattlePassReward = typeof battlePassRewards.$inferSelect;

// Classic Mode Weekly Win-Streak Leaderboard — open to every player (Classic has no premium
// gate). One row per user per week, holding the best consecutive-win streak reached that
// week; a new week is simply a new weekStartDate row, so no reset job is needed.
export const classicStreakLeaderboard = pgTable("classic_streak_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  weekStartDate: timestamp("week_start_date").notNull(), // Début de la semaine (lundi)
  bestStreak: integer("best_streak").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClassicStreakLeaderboardSchema = createInsertSchema(classicStreakLeaderboard).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClassicStreakLeaderboard = z.infer<typeof insertClassicStreakLeaderboardSchema>;
export type ClassicStreakLeaderboard = typeof classicStreakLeaderboard.$inferSelect;

// Weekly XP Leaderboard — every XP gain (any mode) accumulates into the current week's row via
// addXPToUser, so ranking has fine-grained resolution instead of the small-integer clustering a
// win-streak-based leaderboard produces at scale. One row per user per week; a new week is simply
// a new weekStartDate row, same pattern as classicStreakLeaderboard above.
export const weeklyXpLeaderboard = pgTable("weekly_xp_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  weekStartDate: timestamp("week_start_date").notNull(), // Début de la semaine (lundi)
  weeklyXp: integer("weekly_xp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWeeklyXpLeaderboardSchema = createInsertSchema(weeklyXpLeaderboard).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWeeklyXpLeaderboard = z.infer<typeof insertWeeklyXpLeaderboardSchema>;
export type WeeklyXpLeaderboard = typeof weeklyXpLeaderboard.$inferSelect;

// Top-3 weekly XP leaderboard reward claims — one row per user per finished week, so a player
// can claim their gem reward exactly once per week even though the leaderboard row itself keeps
// accumulating (a new week just means a new weekStartDate to check).
export const weeklyXpRewardsClaimed = pgTable("weekly_xp_rewards_claimed", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  rank: integer("rank").notNull(),
  gemsAwarded: integer("gems_awarded").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow(),
}, (table) => ({
  uniqueUserWeek: sql`UNIQUE(${table.userId}, ${table.weekStartDate})`,
}));

export const insertWeeklyXpRewardClaimedSchema = createInsertSchema(weeklyXpRewardsClaimed).omit({
  id: true,
  claimedAt: true,
});

export type InsertWeeklyXpRewardClaimed = z.infer<typeof insertWeeklyXpRewardClaimedSchema>;
export type WeeklyXpRewardClaimed = typeof weeklyXpRewardsClaimed.$inferSelect;

// Card Backs Table
export const cardBacks = pgTable("card_backs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  rarity: cardBackRarity("rarity").notNull(),
  priceGems: bigint("price_gems", { mode: "number" }).notNull(),
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Card Backs - Collection for each user
export const userCardBacks = pgTable("user_card_backs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  cardBackId: varchar("card_back_id").references(() => cardBacks.id),
  source: text("source").notNull(), // 'purchase', 'reward', 'battlepass', 'achievement'
  acquiredAt: timestamp("acquired_at").defaultNow(),
}, (table) => ({
  uniqueUserCardBack: sql`UNIQUE(${table.userId}, ${table.cardBackId})`,
}));

export const insertCardBackSchema = createInsertSchema(cardBacks).omit({
  id: true,
  createdAt: true,
});

export const insertUserCardBackSchema = createInsertSchema(userCardBacks).omit({
  id: true,
  acquiredAt: true,
});

export const selectCardBackSchema = z.object({
  cardBackId: z.string().min(1, "Card back ID is required"),
});

export type InsertCardBack = z.infer<typeof insertCardBackSchema>;
export type CardBack = typeof cardBacks.$inferSelect;
export type InsertUserCardBack = z.infer<typeof insertUserCardBackSchema>;
export type UserCardBack = typeof userCardBacks.$inferSelect;

// Bet Drafts Table for server-side bet validation
export const betDrafts = pgTable("bet_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  betId: varchar("bet_id").notNull().unique(), // Client-generated ID for tracking
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  mode: text("mode"), // 'classic'
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertBetDraftSchema = createInsertSchema(betDrafts).omit({
  id: true,
  createdAt: true,
});

export type InsertBetDraft = z.infer<typeof insertBetDraftSchema>;
export type BetDraft = typeof betDrafts.$inferSelect;

// Bet API validation schemas
export const betPrepareSchema = z.object({
  betId: z.string().min(1, "Bet ID is required"),
  amount: z.number().positive("Bet amount must be positive"),
  mode: z.string().optional()
});

export const betCommitSchema = z.object({
  betId: z.string().min(1, "Bet ID is required")
});

export type BetPrepareRequest = z.infer<typeof betPrepareSchema>;
export type BetCommitRequest = z.infer<typeof betCommitSchema>;

export const claimBattlePassTierSchema = z.object({
  tier: z.number().int().min(1).max(50),
  isPremium: z.boolean().optional().default(false),
});

export type ClaimBattlePassTierRequest = z.infer<typeof claimBattlePassTierSchema>;

// Config Table - Server configuration values
export const config = pgTable("config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // Configuration key
  value: text("value").notNull(), // JSON stringified value
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConfigSchema = createInsertSchema(config).omit({
  id: true,
  updatedAt: true,
});

// Friends Table - Many-to-many relationship for friendships
export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").references(() => users.id).notNull(), // User who sent the friend request
  recipientId: varchar("recipient_id").references(() => users.id).notNull(), // User who received the friend request
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected', 'blocked'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Prevent duplicate friendship requests
  uniqueFriendship: sql`UNIQUE(${table.requesterId}, ${table.recipientId})`,
  // Prevent users from adding themselves as friends
  checkNotSelf: sql`CHECK(${table.requesterId} != ${table.recipientId})`,
}));

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Blocked Users Table - one row per (blocker, blocked) pair. Directional: A blocking B does
// not block B from A's perspective — both the leaderboard and friend search filter on either
// side of the pair (see storage.ts) so blocked users disappear from each other regardless of
// who blocked whom, matching Apple's UGC moderation requirement (Guideline 1.2).
export const blockedUsers = pgTable("blocked_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").references(() => users.id).notNull(),
  blockedId: varchar("blocked_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueBlock: sql`UNIQUE(${table.blockerId}, ${table.blockedId})`,
  checkNotSelf: sql`CHECK(${table.blockerId} != ${table.blockedId})`,
}));

export const insertBlockedUserSchema = createInsertSchema(blockedUsers).omit({
  id: true,
  createdAt: true,
});

// User Reports Table - flagged players for manual review. No admin panel yet (see routes.ts) —
// a report is just an insert here for now, reviewed directly in the DB.
export const userReports = pgTable("user_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").references(() => users.id).notNull(),
  reportedId: varchar("reported_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  checkNotSelf: sql`CHECK(${table.reporterId} != ${table.reportedId})`,
}));

export const insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  createdAt: true,
});

// Rank Rewards Claimed Table - Track which rank rewards users have claimed
export const rankRewardsClaimed = pgTable("rank_rewards_claimed", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  rankKey: text("rank_key").notNull(), // 'cow', 'fish', 'fox', etc.
  gemsAwarded: integer("gems_awarded").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow(),
}, (table) => ({
  // Prevent claiming the same rank reward twice
  uniqueUserRank: sql`UNIQUE(${table.userId}, ${table.rankKey})`,
}));

// Active Games Table - server-authoritative in-progress blackjack state (deck, hands, dealer
// hole card). Deliberately separate from gameStats (which is a lifetime-aggregate table summed
// by getUserStats/getUserFriends) rather than overloading it with mutable per-hand JSON.
export const activeGames = pgTable("active_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  mode: text("mode").notNull(), // 'classic'
  status: text("status").notNull().default("in_progress"), // 'in_progress' | 'completed'
  betAmount: bigint("bet_amount", { mode: "number" }).notNull(),
  deck: jsonb("deck").notNull(), // Card[] remaining, last element = next card to deal
  deckSeed: text("deck_seed").notNull(), // random seed captured at shuffle time (audit)
  deckHash: text("deck_hash").notNull(), // sha256 of the initial post-shuffle deck order (audit)
  playerHands: jsonb("player_hands").notNull(), // PlayerHand[] — see shared/blackjack-types.ts
  dealerHand: jsonb("dealer_hand").notNull(), // full hand incl. hole card — server-only, never sent raw to client while in_progress
  activeHandIndex: integer("active_hand_index").notNull().default(0), // which playerHands[] entry is being played (relevant after split)
  // Classic solo's "watch an ad to double your win" offer (POST /api/game/double-reward) —
  // flips true the first time it's claimed so the same completed hand can't be doubled twice.
  rewardDoubled: boolean("reward_doubled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertActiveGameSchema = createInsertSchema(activeGames).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export type InsertActiveGame = z.infer<typeof insertActiveGameSchema>;
export type ActiveGame = typeof activeGames.$inferSelect;

// Play with Friends — Phase 1 (lobby only, no shared hand yet — see server/routes.ts
// /api/tables routes and shared/blackjack-types.ts). A table has one host seat ('bottom')
// plus up to two friend seats ('left'/'right'), filled via invites drawn from `friendships`.
export const gameTables = pgTable("game_tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostUserId: varchar("host_user_id").references(() => users.id).notNull(),
  mode: text("mode").notNull().default("classic"),
  status: text("status").notNull().default("waiting"), // 'waiting' | 'betting' | 'in_progress' | 'closed'
  // 6-char shareable join code (generateUniqueTableCode in storage.ts), same style as
  // generateUniqueReferralCode — lets a friend join without going through the friends-list
  // invite flow. Nullable rather than a DB-level NOT NULL: application code always sets one
  // on creation, but a hard constraint would require backfilling any pre-existing rows.
  code: text("code").unique(),
  // Shared hand state — set once a hand is dealt (placeTableBet/applyTableAction in
  // storage.ts), cleared back to null once settled. Mirrors activeGames' shape, just shared
  // across every seat instead of belonging to one user.
  deck: jsonb("deck"), // Card[] remaining, last element = next card to deal
  deckSeed: text("deck_seed"),
  deckHash: text("deck_hash"),
  dealerHand: jsonb("dealer_hand"), // full hand incl. hole card — redacted before ever leaving the server while in_progress
  currentTurnUserId: varchar("current_turn_user_id").references(() => users.id), // whose turn it is to act, null outside 'in_progress'
  turnOrder: jsonb("turn_order"), // seat positions ["bottom"|"left"|"right"], shuffled fresh per hand so the host isn't always first
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGameTableSchema = createInsertSchema(gameTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGameTable = z.infer<typeof insertGameTableSchema>;
export type GameTable = typeof gameTables.$inferSelect;

export const tableSeats = pgTable("table_seats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: varchar("table_id").references(() => gameTables.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  // 'bottom' | 'left' | 'right' — whoever creates the table starts at 'bottom', but this is
  // just a seat slot: it doesn't track who the host is (see gameTables.hostUserId), which can
  // move to a different seat entirely if the original host later leaves.
  position: text("position").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  // Per-hand state, cleared back to null once a hand settles — see placeTableBet/
  // applyTableAction in storage.ts.
  betAmount: bigint("bet_amount", { mode: "number" }),
  betConfirmed: boolean("bet_confirmed").notNull().default(false),
  hand: jsonb("hand"), // a single PlayerHand (shared/blackjack-types.ts) — no split support in multiplayer
}, (table) => ({
  // One occupant per seat, and a user can't hold two seats at the same table.
  uniqueSeat: sql`UNIQUE(${table.tableId}, ${table.position})`,
  uniqueUserPerTable: sql`UNIQUE(${table.tableId}, ${table.userId})`,
}));

export const insertTableSeatSchema = createInsertSchema(tableSeats).omit({
  id: true,
  joinedAt: true,
});

export type InsertTableSeat = z.infer<typeof insertTableSeatSchema>;
export type TableSeat = typeof tableSeats.$inferSelect;

export const tableInvites = pgTable("table_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: varchar("table_id").references(() => gameTables.id).notNull(),
  inviterUserId: varchar("inviter_user_id").references(() => users.id).notNull(),
  inviteeUserId: varchar("invitee_user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined' | 'expired'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Only one pending invite per (table, invitee) at a time.
  uniquePendingInvite: sql`UNIQUE(${table.tableId}, ${table.inviteeUserId})`,
}));

export const insertTableInviteSchema = createInsertSchema(tableInvites).omit({
  id: true,
  createdAt: true,
});

export type InsertTableInvite = z.infer<typeof insertTableInviteSchema>;
export type TableInvite = typeof tableInvites.$inferSelect;

export const insertRankRewardClaimedSchema = createInsertSchema(rankRewardsClaimed).omit({
  id: true,
  claimedAt: true,
});

export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type Config = typeof config.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;
export type BlockedUser = typeof blockedUsers.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;
export type UserReport = typeof userReports.$inferSelect;
export type InsertRankRewardClaimed = z.infer<typeof insertRankRewardClaimedSchema>;
export type RankRewardClaimed = typeof rankRewardsClaimed.$inferSelect;

// Referral schemas
export const submitReferralCodeSchema = z.object({
  code: z.string().min(6).max(6).regex(/^[A-Z0-9]+$/, "Code must contain only uppercase letters and numbers"),
});
