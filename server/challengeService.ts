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

  // Créer les challenges quotidiens
  static async createDailyChallenges(): Promise<Challenge[]> {
    // Calculer l'expiration à minuit suivant en heure française
    const now = new Date();
    const frenchTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
    const tomorrowFrench = new Date(frenchTime);
    tomorrowFrench.setDate(tomorrowFrench.getDate() + 1);
    tomorrowFrench.setHours(0, 0, 0, 0);
    
    // Convertir l'heure française en UTC pour la base de données
    const utcTomorrow = new Date(tomorrowFrench.getTime() - (frenchTime.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);

    const challenges: Challenge[] = [];
    const usedChallengeTypes = new Set<string>(); // Pour éviter les doublons

    // Créer un challenge de chaque difficulté
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const templates = this.CHALLENGE_TEMPLATES[difficulty];
      
      // Filtrer pour exclure les types déjà utilisés
      const availableTemplates = templates.filter(template => 
        !usedChallengeTypes.has(template.challengeType)
      );
      
      // Si tous les types sont utilisés, utiliser tous les templates
      const templatesToUse = availableTemplates.length > 0 ? availableTemplates : templates;
      
      const randomTemplate = templatesToUse[Math.floor(Math.random() * templatesToUse.length)];
      usedChallengeTypes.add(randomTemplate.challengeType);
      
      try {
        const challenge = await storage.createChallenge({
          ...randomTemplate,
          expiresAt: utcTomorrow
        });
        challenges.push(challenge);
      } catch (error) {
        console.error(`Erreur lors de la création du challenge ${difficulty}:`, error);
      }
    }

    return challenges;
  }

  // Assigner les challenges à tous les utilisateurs actifs
  static async assignChallengesToUser(userId: string, challenges: Challenge[]): Promise<void> {
    try {
      for (const challenge of challenges) {
        // Vérifier si l'utilisateur a déjà ce challenge
        const existingChallenges = await storage.getUserChallenges(userId);
        const hasChallenge = existingChallenges.some(uc => uc.challengeId === challenge.id);
        
        if (!hasChallenge) {
          await storage.assignChallengeToUser(userId, challenge.id);
        }
      }
    } catch (error) {
      console.error(`Erreur lors de l'assignation des challenges à l'utilisateur ${userId}:`, error);
    }
  }

  // Mettre à jour la progression automatiquement après une partie
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

        // Calculer la nouvelle progression selon le type de challenge
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
            newProgress += Math.max(0, gameResult.coinsWon || 0); // Ne compter que les gains positifs
            break;
        }

        // Mettre à jour la progression
        if (newProgress !== (userChallenge.currentProgress || 0)) {
          await storage.updateChallengeProgress(userId, challenge.id, newProgress);

          // Vérifier si le challenge est terminé
          if (newProgress >= challenge.targetValue) {
            await storage.completeChallengeForUser(userId, challenge.id);
            
            // Récompenser l'utilisateur
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
      console.error(`Erreur lors de la mise à jour des challenges pour ${userId}:`, error);
    }

    return completedChallenges;
  }

  // Récupérer ou créer les challenges du jour
  static async getTodaysChallenges(): Promise<Challenge[]> {
    // Obtenir la date du jour en heure française
    const now = new Date();
    const frenchTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
    const todayFrench = new Date(frenchTime);
    todayFrench.setHours(0, 0, 0, 0);
    
    // Nettoyer d'abord les anciens défis expirés
    await this.cleanupExpiredChallenges();
    
    const challenges = await storage.getChallenges();
    
    // Vérifier s'il y a déjà des challenges actifs pour aujourd'hui (heure française)
    const todaysChallenges = challenges.filter(challenge => {
      const createdAt = new Date(challenge.createdAt || Date.now());
      const createdAtFrench = new Date(createdAt.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
      createdAtFrench.setHours(0, 0, 0, 0);
      return createdAtFrench.getTime() === todayFrench.getTime();
    });

    // Si aucun challenge aujourd'hui, en créer de nouveaux
    if (todaysChallenges.length === 0) {
      return await this.createDailyChallenges();
    }

    return todaysChallenges;
  }

  // Nouvelle fonction pour nettoyer les défis expirés
  static async cleanupExpiredChallenges(): Promise<void> {
    try {
      await storage.cleanupExpiredChallenges();
    } catch (error) {
      console.error('Erreur lors du nettoyage des défis expirés:', error);
    }
  }

  // Fonction pour obtenir le temps restant jusqu'au prochain reset des défis (minuit heure française)
  static getTimeUntilNextReset(): { hours: number; minutes: number; seconds: number } {
    // Obtenir l'heure actuelle en France (Europe/Paris)
    const now = new Date();
    const frenchTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
    
    // Calculer minuit suivant en heure française
    const tomorrowFrench = new Date(frenchTime);
    tomorrowFrench.setDate(tomorrowFrench.getDate() + 1);
    tomorrowFrench.setHours(0, 0, 0, 0);
    
    const timeDiff = tomorrowFrench.getTime() - frenchTime.getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  }
}