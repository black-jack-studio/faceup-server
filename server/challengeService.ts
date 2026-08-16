import { storage } from "./storage";
import type { Challenge, InsertChallenge } from "@shared/schema";

// Flat XP awarded per completed daily challenge, on top of its coin reward — gives the
// Battle Pass level a reliable daily-engagement source instead of depending only on wins.
export const CHALLENGE_XP_REWARD = 5;

type ChallengeTypeKey = 'hands' | 'wins' | 'blackjacks' | 'coins_won';
type Difficulty = 'easy' | 'medium' | 'hard';

interface ChallengeRange {
  targetMin: number;
  targetMax: number;
  rewardMin: number;
  rewardMax: number;
}

export class ChallengeService {
  // Target/reward ranges per type x difficulty. Coin rewards are calibrated against the
  // real economy (starting balance 1000, bet chips up to 500, coin packs up to 12000 coins)
  // so a completed challenge feels meaningful without rivaling a coin-pack purchase.
  // The 650-coin ceiling is intentionally reserved for the single hardest possible roll
  // (coins_won, hard, top of range) — every other slot stays well below it.
  private static readonly CHALLENGE_RANGES: Record<Difficulty, Record<ChallengeTypeKey, ChallengeRange>> = {
    easy: {
      hands: { targetMin: 3, targetMax: 6, rewardMin: 40, rewardMax: 70 },
      wins: { targetMin: 1, targetMax: 2, rewardMin: 50, rewardMax: 90 },
      blackjacks: { targetMin: 1, targetMax: 1, rewardMin: 80, rewardMax: 100 },
      coins_won: { targetMin: 100, targetMax: 200, rewardMin: 60, rewardMax: 100 },
    },
    medium: {
      hands: { targetMin: 8, targetMax: 12, rewardMin: 100, rewardMax: 160 },
      wins: { targetMin: 4, targetMax: 6, rewardMin: 150, rewardMax: 220 },
      blackjacks: { targetMin: 2, targetMax: 3, rewardMin: 180, rewardMax: 250 },
      coins_won: { targetMin: 300, targetMax: 600, rewardMin: 180, rewardMax: 300 },
    },
    hard: {
      hands: { targetMin: 20, targetMax: 30, rewardMin: 250, rewardMax: 350 },
      wins: { targetMin: 14, targetMax: 20, rewardMin: 380, rewardMax: 480 },
      blackjacks: { targetMin: 4, targetMax: 5, rewardMin: 380, rewardMax: 470 },
      coins_won: { targetMin: 2000, targetMax: 3500, rewardMin: 450, rewardMax: 650 },
    },
  };

  private static readonly CHALLENGE_COPY: Record<ChallengeTypeKey, { title: (n: number) => string; description: (n: number) => string }> = {
    hands: {
      title: (n) => `Play ${n} Games`,
      description: (n) => `Play ${n} blackjack game${n > 1 ? 's' : ''}`,
    },
    wins: {
      title: (n) => (n === 1 ? 'First Victory' : `Win ${n} Games`),
      description: (n) => `Win ${n} game${n > 1 ? 's' : ''}`,
    },
    blackjacks: {
      title: (n) => (n === 1 ? 'Blackjack!' : `Get ${n} Blackjacks`),
      description: (n) => `Get ${n} blackjack${n > 1 ? 's' : ''}`,
    },
    coins_won: {
      title: (n) => `Win ${n} Coins`,
      description: (n) => `Win ${n} coins`,
    },
  };

  // Generate a deterministic seed from date string for consistent but changing challenge selection
  private static getDateSeed(dateString: string): number {
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Deterministic PRNG (mulberry32) seeded from the date hash, so the same day always
  // produces the same 6 challenges for every user, but the sequence differs day to day.
  private static createRng(seed: number): () => number {
    let state = seed;
    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Create daily challenges
  static async createDailyChallenges(): Promise<Challenge[]> {
    // Calculate expiration at next midnight in French time
    const now = new Date();
    const nextFrenchMidnight = new Date(now);
    
    // If it's already after 22h UTC today, move to next day
    if (now.getUTCHours() >= 22) {
      nextFrenchMidnight.setUTCDate(nextFrenchMidnight.getUTCDate() + 1);
    }
    nextFrenchMidnight.setUTCHours(22, 0, 0, 0); // 22h UTC = 00h France summer (UTC+2)

    const challenges: Challenge[] = [];

    // Use date as seed for deterministic but changing selection
    const today = new Date();
    // Use French date (adjust for timezone)
    const frenchToday = new Date(today);
    if (today.getUTCHours() >= 22) {
      frenchToday.setUTCDate(frenchToday.getUTCDate() + 1);
    }
    const dateString = frenchToday.toISOString().split('T')[0]; // YYYY-MM-DD
    const dateSeed = this.getDateSeed(dateString);
    const rand = this.createRng(dateSeed);

    const allTypes: ChallengeTypeKey[] = ['hands', 'wins', 'blackjacks', 'coins_won'];
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

    for (const difficulty of difficulties) {
      // Deterministic shuffle of the 4 types, then take the first 2 — guarantees today's
      // two challenges at this difficulty are never the same type.
      const shuffledTypes = [...allTypes];
      for (let i = shuffledTypes.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffledTypes[i], shuffledTypes[j]] = [shuffledTypes[j], shuffledTypes[i]];
      }

      for (const challengeType of shuffledTypes.slice(0, 2)) {
        const range = this.CHALLENGE_RANGES[difficulty][challengeType];
        const target = Math.round(range.targetMin + rand() * (range.targetMax - range.targetMin));
        const span = range.targetMax - range.targetMin;
        const progress = span === 0 ? 0 : (target - range.targetMin) / span;
        const reward = Math.round((range.rewardMin + progress * (range.rewardMax - range.rewardMin)) / 5) * 5;
        const copy = this.CHALLENGE_COPY[challengeType];

        try {
          const challenge = await storage.createChallenge({
            challengeType,
            title: copy.title(target),
            description: copy.description(target),
            targetValue: target,
            reward,
            difficulty,
            expiresAt: nextFrenchMidnight,
          });
          challenges.push(challenge);
          console.log(`✅ Created ${difficulty} challenge: ${challenge.title} (reward: ${reward})`);
        } catch (error) {
          console.error(`Error creating ${difficulty} challenge:`, error);
        }
      }
    }

    return challenges;
  }

  // Add today's new challenges to user (keeps incomplete challenges from previous days)
  static async refreshUserChallenges(userId: string, todaysChallenges: Challenge[]): Promise<void> {
    try {
      // Get user's current challenges
      const userChallenges = await storage.getUserChallenges(userId);
      
      // Only remove challenges that are completed AND claimed
      for (const userChallenge of userChallenges) {
        if (userChallenge.isCompleted && userChallenge.rewardClaimed && userChallenge.challengeId) {
          await storage.removeUserChallenge(userId, userChallenge.challengeId);
          console.log(`🧹 Cleaned up completed challenge ${userChallenge.challengeId} for user ${userId}`);
        }
      }
      
      // Assign today's challenges if not already assigned
      for (const challenge of todaysChallenges) {
        const hasChallenge = userChallenges.some(uc => uc.challengeId === challenge.id);
        
        if (!hasChallenge) {
          await storage.assignChallengeToUser(userId, challenge.id);
          console.log(`✨ Assigned new challenge ${challenge.title} to user ${userId}`);
        }
      }
    } catch (error) {
      console.error(`Error refreshing challenges for user ${userId}:`, error);
    }
  }

  // Assign challenges to all active users (legacy, kept for compatibility)
  static async assignChallengesToUser(userId: string, challenges: Challenge[]): Promise<void> {
    try {
      for (const challenge of challenges) {
        // Check if user already has this challenge
        const existingChallenges = await storage.getUserChallenges(userId);
        const hasChallenge = existingChallenges.some(uc => uc.challengeId === challenge.id);
        
        if (!hasChallenge) {
          await storage.assignChallengeToUser(userId, challenge.id);
        }
      }
    } catch (error) {
      console.error(`Error assigning challenges to user ${userId}:`, error);
    }
  }

  // Update progress automatically after a game
  static async updateChallengeProgress(
    userId: string,
    gameResult: {
      handsPlayed: number;
      handsWon: number;
      blackjacks: number;
      coinsWon: number;
    }
  ): Promise<{challengeId: string, reward: number}[]> {
    const completedChallenges: {challengeId: string, reward: number}[] = [];

    try {
      const userChallenges = await storage.getUserChallenges(userId);
      
      for (const userChallenge of userChallenges) {
        if (userChallenge.isCompleted) continue;

        const challenge = userChallenge.challenge;
        let newProgress = userChallenge.currentProgress || 0;

        // Calculate new progress based on challenge type
        switch (challenge.challengeType) {
          case 'hands':
            newProgress += gameResult.handsPlayed || 0;
            break;
          case 'wins':
            newProgress += gameResult.handsWon || 0;
            break;
          case 'blackjacks':
            newProgress += gameResult.blackjacks || 0;
            break;
          case 'coins_won':
            newProgress += Math.max(0, gameResult.coinsWon || 0); // Only count positive gains
            break;
        }

        // Update progress
        if (newProgress !== (userChallenge.currentProgress || 0)) {
          await storage.updateChallengeProgress(userId, challenge.id, newProgress);

          // Check if challenge is completed
          if (newProgress >= challenge.targetValue) {
            await storage.completeChallengeForUser(userId, challenge.id);
            
            // Award reward automatically
            const user = await storage.getUser(userId);
            if (user) {
              await storage.updateUserCoins(userId, (user.coins || 0) + challenge.reward);
              await storage.markChallengeRewardAsClaimed(userId, userChallenge.id);
              console.log(`✅ AUTO-REWARD: User ${userId} earned ${challenge.reward} coins for completing challenge ${challenge.id}`);
            }
            
            completedChallenges.push({
              challengeId: challenge.id,
              reward: challenge.reward
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error updating challenges for ${userId}:`, error);
    }

    return completedChallenges;
  }

  static async claimChallengeReward(userId: string, userChallengeId: string): Promise<{success: boolean, reward?: number, error?: string}> {
    try {
      const userChallenges = await storage.getUserChallenges(userId);
      const userChallenge = userChallenges.find(uc => uc.id === userChallengeId);
      
      if (!userChallenge) {
        return { success: false, error: "Challenge not found" };
      }
      
      if (!userChallenge.isCompleted) {
        return { success: false, error: "Challenge not completed yet" };
      }
      
      if (userChallenge.rewardClaimed) {
        return { success: false, error: "Rewards already claimed for this challenge" };
      }
      
      // Award the reward and mark as claimed in database atomically
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }
      
      // Update coins and mark reward as claimed
      await storage.updateUserCoins(userId, (user.coins || 0) + userChallenge.challenge.reward);
      await storage.markChallengeRewardAsClaimed(userId, userChallengeId);
      await storage.addXPToUser(userId, CHALLENGE_XP_REWARD);

      console.log(`✅ REWARD CLAIMED: User ${userId} claimed ${userChallenge.challenge.reward} coins + ${CHALLENGE_XP_REWARD} XP for challenge ${userChallengeId}`);
      
      return { success: true, reward: userChallenge.challenge.reward };
    } catch (error) {
      console.error(`Error claiming challenge reward for user ${userId}, challenge ${userChallengeId}:`, error);
      return { success: false, error: "Internal server error" };
    }
  }

  // Get or create today's challenges
  static async getTodaysChallenges(): Promise<Challenge[]> {
    // First clean up old expired challenges
    await this.cleanupExpiredChallenges();
    
    const challenges = await storage.getChallenges();
    
    // Get current French date
    const now = new Date();
    const currentFrenchDay = new Date(now);
    
    // Adjust for French timezone (simple approximation)
    if (now.getUTCHours() >= 22) {
      currentFrenchDay.setUTCDate(currentFrenchDay.getUTCDate() + 1);
    }
    currentFrenchDay.setUTCHours(0, 0, 0, 0);
    
    // Check if there are already active challenges for today (French day)
    const todaysChallenges = challenges.filter(challenge => {
      const createdAt = new Date(challenge.createdAt || Date.now());
      const createdFrenchDay = new Date(createdAt);
      
      // Same logic for creation date
      if (createdAt.getUTCHours() >= 22) {
        createdFrenchDay.setUTCDate(createdFrenchDay.getUTCDate() + 1);
      }
      createdFrenchDay.setUTCHours(0, 0, 0, 0);
      
      return createdFrenchDay.getTime() === currentFrenchDay.getTime();
    });

    // If no challenges today, create new ones
    if (todaysChallenges.length === 0) {
      console.log('No challenges found for today, creating new challenges...');
      return await this.createDailyChallenges();
    }

    return todaysChallenges;
  }

  // New function to clean up expired challenges
  static async cleanupExpiredChallenges(): Promise<void> {
    try {
      await storage.cleanupExpiredChallenges();
    } catch (error) {
      console.error('Error during expired challenges cleanup:', error);
    }
  }

  // Function to get time remaining until next challenge reset (midnight French time)
  static getTimeUntilNextReset(): { hours: number; minutes: number; seconds: number } {
    try {
      const now = new Date();
      
      // Calculate next midnight at 22h UTC (= midnight UTC+2, French summer time)
      const nextReset = new Date(now);
      nextReset.setUTCHours(22, 0, 0, 0);
      
      // If it's already after 22h UTC today, move to next day
      if (now.getUTCHours() >= 22) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);
      }
      
      const timeDiff = nextReset.getTime() - now.getTime();
      
      // Assurer que nous avons un temps positif
      if (timeDiff <= 0) {
        // Fallback: calculer pour demain
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(22, 0, 0, 0);
        const fallbackDiff = tomorrow.getTime() - now.getTime();
        
        const hours = Math.max(0, Math.floor(fallbackDiff / (1000 * 60 * 60)));
        const minutes = Math.max(0, Math.floor((fallbackDiff % (1000 * 60 * 60)) / (1000 * 60)));
        const seconds = Math.max(0, Math.floor((fallbackDiff % (1000 * 60)) / 1000));
        
        return { hours, minutes, seconds };
      }
      
      const hours = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60)));
      const minutes = Math.max(0, Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)));
      const seconds = Math.max(0, Math.floor((timeDiff % (1000 * 60)) / 1000));
      
      return { hours, minutes, seconds };
    } catch (error) {
      console.error('Error in getTimeUntilNextReset:', error);
      return { hours: 24, minutes: 0, seconds: 0 };
    }
  }
}