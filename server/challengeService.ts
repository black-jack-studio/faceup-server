import { storage } from "./storage";
import type { Challenge, InsertChallenge } from "@shared/schema";

export class ChallengeService {
  // Types de challenges disponibles avec leurs configurations
  private static CHALLENGE_TEMPLATES = {
    easy: [
      {
        challengeType: 'hands',
        title: 'Première main',
        description: 'Jouez 3 parties de blackjack',
        targetValue: 3,
        reward: 50,
        difficulty: 'easy'
      },
      {
        challengeType: 'wins',
        title: 'Gagnant du jour',
        description: 'Gagnez 2 parties',
        targetValue: 2,
        reward: 75,
        difficulty: 'easy'
      },
      {
        challengeType: 'blackjacks',
        title: 'Blackjack!',
        description: 'Obtenez 1 blackjack',
        targetValue: 1,
        reward: 100,
        difficulty: 'easy'
      }
    ],
    medium: [
      {
        challengeType: 'hands',
        title: 'Marathonien',
        description: 'Jouez 10 parties de blackjack',
        targetValue: 10,
        reward: 150,
        difficulty: 'medium'
      },
      {
        challengeType: 'wins',
        title: 'Série victorieuse',
        description: 'Gagnez 5 parties',
        targetValue: 5,
        reward: 200,
        difficulty: 'medium'
      },
      {
        challengeType: 'coins_won',
        title: 'Collectionneur',
        description: 'Gagnez 500 pièces',
        targetValue: 500,
        reward: 250,
        difficulty: 'medium'
      }
    ],
    hard: [
      {
        challengeType: 'hands',
        title: 'Maître du blackjack',
        description: 'Jouez 25 parties',
        targetValue: 25,
        reward: 400,
        difficulty: 'hard'
      },
      {
        challengeType: 'wins',
        title: 'Champion',
        description: 'Gagnez 15 parties',
        targetValue: 15,
        reward: 500,
        difficulty: 'hard'
      },
      {
        challengeType: 'coins_won',
        title: 'Roi du casino',
        description: 'Gagnez 2000 pièces',
        targetValue: 2000,
        reward: 750,
        difficulty: 'hard'
      }
    ]
  };

  // Create daily challenges
  static async createDailyChallenges(): Promise<Challenge[]> {
    // Calculate expiration at next midnight in French time
    const now = new Date();
    const nextFrenchMidnight = new Date(now);
    
    // If it's already after 23h UTC today, move to next day
    if (now.getUTCHours() >= 23) {
      nextFrenchMidnight.setUTCDate(nextFrenchMidnight.getUTCDate() + 1);
    }
    nextFrenchMidnight.setUTCHours(23, 0, 0, 0); // 23h UTC = 00h France winter

    const challenges: Challenge[] = [];
    const usedChallengeTypes = new Set<string>(); // To avoid duplicates

    // Create one challenge of each difficulty
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const templates = this.CHALLENGE_TEMPLATES[difficulty];
      
      // Filter to exclude already used types
      const availableTemplates = templates.filter(template => 
        !usedChallengeTypes.has(template.challengeType)
      );
      
      // If all types are used, use all templates
      const templatesToUse = availableTemplates.length > 0 ? availableTemplates : templates;
      
      const randomTemplate = templatesToUse[Math.floor(Math.random() * templatesToUse.length)];
      usedChallengeTypes.add(randomTemplate.challengeType);
      
      try {
        const challenge = await storage.createChallenge({
          ...randomTemplate,
          expiresAt: nextFrenchMidnight
        });
        challenges.push(challenge);
      } catch (error) {
        console.error(`Error creating ${difficulty} challenge:`, error);
      }
    }

    return challenges;
  }

  // Assign challenges to all active users
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
            
            // Reward the user
            const user = await storage.getUser(userId);
            if (user) {
              await storage.updateUserCoins(userId, (user.coins || 0) + challenge.reward);
              completedChallenges.push({
                challengeId: challenge.id,
                reward: challenge.reward
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error updating challenges for ${userId}:`, error);
    }

    return completedChallenges;
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
    if (now.getUTCHours() >= 23) {
      currentFrenchDay.setUTCDate(currentFrenchDay.getUTCDate() + 1);
    }
    currentFrenchDay.setUTCHours(0, 0, 0, 0);
    
    // Check if there are already active challenges for today (French day)
    const todaysChallenges = challenges.filter(challenge => {
      const createdAt = new Date(challenge.createdAt || Date.now());
      const createdFrenchDay = new Date(createdAt);
      
      // Same logic for creation date
      if (createdAt.getUTCHours() >= 23) {
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