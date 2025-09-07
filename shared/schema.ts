import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  coins: integer("coins").default(1000),
  gems: integer("gems").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
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

export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;
export type UserChallenge = typeof userChallenges.$inferSelect;
