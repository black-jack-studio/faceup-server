import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  xp: integer("xp").default(0), // XP total pour statistiques
  currentLevelXP: integer("current_level_xp").default(0), // XP dans le niveau actuel (0-499)
  level: integer("level").default(1),
  seasonXp: integer("season_xp").default(0), // XP pour la saison courante du battlepass
  coins: integer("coins").default(1000),
  gems: integer("gems").default(0),
  selectedAvatarId: text("selected_avatar_id").default("face-with-tears-of-joy"),
  selectedCardBackId: text("selected_card_back_id").default("classic"),
  privacySettings: jsonb("privacy_settings").default({
    profileVisibility: "public",
    showStats: true,
    showLevel: true,
    allowMessages: true,
    dataCollection: true
  }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  membershipType: text("membership_type").default("normal"), // 'normal', 'premium'
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  maxStreak21: integer("max_streak_21").default(0), // Max streak atteint en mode 21 Streak
  currentStreak21: integer("current_streak_21").default(0), // Streak actuel en mode 21 Streak
  totalStreakWins: integer("total_streak_wins").default(0), // Total des victoires en mode streak
  totalStreakEarnings: integer("total_streak_earnings").default(0), // Total des gains en mode streak
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
  totalWinnings: integer("total_winnings").default(0),
  totalLosses: integer("total_losses").default(0),
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
  reward: integer("reward").notNull(), // coins reward
  difficulty: text("difficulty").notNull(), // 'easy', 'medium', 'hard'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const userChallenges = pgTable("user_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  challengeId: varchar("challenge_id").references(() => challenges.id),
  currentProgress: integer("current_progress").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  startedAt: timestamp("started_at").defaultNow(),
});

// Battlepass Seasons Table
export const seasons = pgTable("seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  rewardAmount: integer("reward_amount").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
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
  amount: integer("amount").notNull(), // positive for gaining gems, negative for spending
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
  gemCost: integer("gem_cost").notNull(),
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
export type InsertBattlePassReward = z.infer<typeof insertBattlePassRewardSchema>;
export type BattlePassReward = typeof battlePassRewards.$inferSelect;

// 21 Streak Weekly Leaderboard Table
export const streakLeaderboard = pgTable("streak_leaderboard", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  weekStartDate: timestamp("week_start_date").notNull(), // Début de la semaine (lundi)
  bestStreak: integer("best_streak").notNull(), // Meilleur streak de la semaine
  totalStreakGames: integer("total_streak_games").default(0), // Nombre de parties en mode streak
  totalStreakEarnings: integer("total_streak_earnings").default(0), // Gains de la semaine
  rank: integer("rank"), // Position dans le classement
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStreakLeaderboardSchema = createInsertSchema(streakLeaderboard).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStreakLeaderboard = z.infer<typeof insertStreakLeaderboardSchema>;
export type StreakLeaderboard = typeof streakLeaderboard.$inferSelect;

// Validation schemas for APIs
export const claimBattlePassTierSchema = z.object({
  tier: z.number().int().min(1).max(20),
  isPremium: z.boolean().optional().default(false),
});

export type ClaimBattlePassTierRequest = z.infer<typeof claimBattlePassTierSchema>;
