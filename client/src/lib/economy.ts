export interface RewardConfig {
  coins: { min: number; max: number };
  gems: { min: number; max: number };
  xp: { min: number; max: number };
  items: string[];
}

export interface EconomyReward {
  type: 'coins' | 'gems' | 'xp' | 'item' | 'tickets';
  amount?: number;
  itemId?: string;
  itemName?: string;
}

export class EconomyManager {
  private static readonly DAILY_SPIN_REWARDS: RewardConfig = {
    coins: { min: 50, max: 500 },
    gems: { min: 5, max: 50 },
    xp: { min: 100, max: 300 },
    items: ['royal_blue_back', 'golden_crown_back', 'midnight_black_back', 'ruby_red_back'],
  };

  private static readonly XP_REWARDS = {
    correctDecision: 10,
    handWin: 25,
    blackjack: 50,
    perfectGame: 100,
    streakBonus: 5, // per consecutive correct decision
    countingAccuracy: 2, // per percent accuracy above 90%
  };

  private static readonly COIN_REWARDS = {
    handWin: 10,
    blackjack: 25,
    dailyLogin: 100,
    achievementUnlock: 500,
    levelUp: 1000,
  };

  static calculateXPGain(
    action: 'correctDecision' | 'handWin' | 'blackjack' | 'perfectGame',
    streak: number = 0,
    countingAccuracy: number = 0
  ): number {
    let xp = this.XP_REWARDS[action] || 0;
    
    // Add streak bonus for correct decisions
    if (action === 'correctDecision' && streak > 1) {
      xp += Math.min(streak - 1, 10) * this.XP_REWARDS.streakBonus;
    }
    
    // Add counting accuracy bonus
    if (countingAccuracy > 90) {
      xp += Math.floor(countingAccuracy - 90) * this.XP_REWARDS.countingAccuracy;
    }
    
    return xp;
  }

  static calculateCoinGain(
    action: 'handWin' | 'blackjack' | 'dailyLogin' | 'achievementUnlock' | 'levelUp'
  ): number {
    return this.COIN_REWARDS[action] || 0;
  }

  static calculateLevel(xp: number): number {
    // Level formula: level = floor(xp / 500) + 1
    return Math.floor(xp / 500) + 1;
  }

  static calculateXPForNextLevel(xp: number): number {
    const currentLevel = this.calculateLevel(xp);
    const nextLevelXP = (currentLevel) * 500;
    return nextLevelXP - xp;
  }

  static generateDailySpinReward(): EconomyReward {
    const rewards: EconomyReward[] = [
      // 40% chance for coins
      ...Array(4).fill({ type: 'coins' as const }),
      // 25% chance for gems  
      ...Array(2).fill({ type: 'gems' as const }),
      // 25% chance for XP
      ...Array(2).fill({ type: 'xp' as const }),
      // 10% chance for item
      { type: 'item' as const },
    ];

    const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
    
    switch (randomReward.type) {
      case 'coins':
        return {
          type: 'coins',
          amount: this.randomBetween(
            this.DAILY_SPIN_REWARDS.coins.min,
            this.DAILY_SPIN_REWARDS.coins.max
          ),
        };
      case 'gems':
        return {
          type: 'gems',
          amount: this.randomBetween(
            this.DAILY_SPIN_REWARDS.gems.min,
            this.DAILY_SPIN_REWARDS.gems.max
          ),
        };
      case 'xp':
        return {
          type: 'xp',
          amount: this.randomBetween(
            this.DAILY_SPIN_REWARDS.xp.min,
            this.DAILY_SPIN_REWARDS.xp.max
          ),
        };
      case 'item':
        const itemId = this.DAILY_SPIN_REWARDS.items[
          Math.floor(Math.random() * this.DAILY_SPIN_REWARDS.items.length)
        ];
        return {
          type: 'item',
          itemId,
          itemName: this.getItemName(itemId),
        };
      default:
        return { type: 'coins', amount: 100 };
    }
  }

  static generateWheelOfFortuneReward(): EconomyReward {
    // Rewards matching the frontend display exactly to fix spin reward matching
    const weightedSegments = [
      // Coins (3 segments)
      { type: "coins", amount: 150, weight: 1 }, 
      { type: "coins", amount: 250, weight: 1 }, 
      { type: "coins", amount: 500, weight: 1 }, 
      
      // Gems (3 segments)
      { type: "gems", amount: 8, weight: 1 },   
      { type: "gems", amount: 20, weight: 1 },    
      { type: "gems", amount: 25, weight: 1 },    
      
      // Tickets (3 segments)
      { type: "tickets", amount: 1, weight: 1 }, 
      { type: "tickets", amount: 3, weight: 1 }, 
      { type: "tickets", amount: 5, weight: 1 }, 
    ];
    
    // Calculate total weight
    const totalWeight = weightedSegments.reduce((sum, segment) => sum + segment.weight, 0);
    
    // Generate random number based on total weight
    const randomWeight = Math.random() * totalWeight;
    
    // Find the selected segment based on cumulative weights
    let cumulativeWeight = 0;
    for (const segment of weightedSegments) {
      cumulativeWeight += segment.weight;
      if (randomWeight <= cumulativeWeight) {
        return {
          type: segment.type as 'coins' | 'gems' | 'tickets',
          amount: segment.amount,
        };
      }
    }
    
    // Fallback (should never reach here)
    return { type: 'coins', amount: 100 };
  }

  /**
   * Expected value calculation for Wheel of Fortune:
   * 
   * Coins expected value: (150*1 + 250*1 + 500*1) / 9 = 900/9 = 100 coins
   * Gems expected value: (8*1 + 20*1 + 25*1) / 9 = 53/9 = 5.9 gems
   * Tickets expected value: (1*1 + 3*1 + 5*1) / 9 = 9/9 = 1 ticket
   * 
   * Average ticket value (assuming 1 ticket = ~100 coins equivalent):
   * 1 ticket * 100 = 100 coin equivalent
   * 
   * Total expected value per spin: ~100 coins + 5.9 gems + 100 ticket-coins = ~205.9 total value
   * 
   * Reward probabilities (balanced wheel - 9 segments):
   * - Coins: 33.3% (3/9 segments: 150, 250, 500 coins)
   * - Gems: 33.3% (3/9 segments: 8, 20, 25 gems)
   * - Tickets: 33.3% (3/9 segments: 1, 3, 5 tickets)
   * Each individual reward: 11.1% chance
   */

  private static randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static getItemName(itemId: string): string {
    const itemNames: Record<string, string> = {
      'royal_blue_back': 'Royal Blue Card Back',
      'golden_crown_back': 'Golden Crown Card Back',
      'midnight_black_back': 'Midnight Black Card Back',
      'ruby_red_back': 'Ruby Red Card Back',
    };
    return itemNames[itemId] || 'Unknown Item';
  }

  static canAfford(userCoins: number, userGems: number, price: number, currency: 'coins' | 'gems'): boolean {
    return currency === 'coins' ? userCoins >= price : userGems >= price;
  }

  static canSpinWheelToday(lastSpinDate: Date | null): boolean {
    if (!lastSpinDate) return true;
    
    const now = new Date();
    const lastSpin = new Date(lastSpinDate);
    
    // Calculate French midnight (23:00 UTC in winter, 22:00 UTC in summer)
    // For simplicity, using 23:00 UTC (French winter time)
    const todayFrenchMidnight = new Date(now);
    todayFrenchMidnight.setUTCHours(23, 0, 0, 0);
    
    // If current time is before 23:00 UTC, use yesterday's midnight
    if (now.getUTCHours() < 23) {
      todayFrenchMidnight.setUTCDate(todayFrenchMidnight.getUTCDate() - 1);
    }
    
    const lastSpinFrenchMidnight = new Date(lastSpin);
    lastSpinFrenchMidnight.setUTCHours(23, 0, 0, 0);
    
    if (lastSpin.getUTCHours() < 23) {
      lastSpinFrenchMidnight.setUTCDate(lastSpinFrenchMidnight.getUTCDate() - 1);
    }
    
    return todayFrenchMidnight.getTime() !== lastSpinFrenchMidnight.getTime();
  }

  static calculateBetPayout(bet: number, result: 'win' | 'lose' | 'push', isBlackjack: boolean = false): number {
    if (result === 'lose') return -bet;
    if (result === 'push') return 0;
    if (isBlackjack) return Math.floor(bet * 1.5); // 3:2 payout
    return bet; // 1:1 payout
  }

  static getShopItems() {
    return {
      coinPacks: [
        { id: 1, coins: 1000, priceUSD: 4.99, popular: false },
        { id: 2, coins: 2500, priceUSD: 9.99, popular: true },
        { id: 3, coins: 5000, priceUSD: 19.99, popular: false },
        { id: 4, coins: 12000, priceUSD: 39.99, popular: false },
      ],
      gemPacks: [
        { id: 1, gems: 50, priceUSD: 0.99, popular: false },
        { id: 2, gems: 300, priceUSD: 2.99, popular: true },
        { id: 3, gems: 1000, priceUSD: 7.99, popular: false },
        { id: 4, gems: 3000, priceUSD: 14.99, popular: false },
      ],
      cardBacks: [
        { id: 'royal_blue_back', name: 'Royal Blue', priceGems: 150 },
        { id: 'golden_crown_back', name: 'Golden Crown', priceGems: 200 },
        { id: 'midnight_black_back', name: 'Midnight Black', priceGems: 100 },
        { id: 'ruby_red_back', name: 'Ruby Red', priceGems: 300 },
      ],
      themes: [
        { id: 'neon_nights', name: 'Neon Nights', priceGems: 250 },
        { id: 'classic_wood', name: 'Classic Wood', priceGems: 200 },
        { id: 'space_void', name: 'Space Void', priceGems: 300 },
      ],
    };
  }

  static getAchievements() {
    return [
      {
        id: 'first_win',
        name: 'First Victory',
        description: 'Win your first hand',
        coinReward: 100,
        xpReward: 50,
        condition: { type: 'handsWon', target: 1 },
      },
      {
        id: 'hot_streak',
        name: 'Hot Streak',
        description: 'Win 5 hands in a row',
        coinReward: 500,
        xpReward: 200,
        condition: { type: 'winStreak', target: 5 },
      },
      {
        id: 'blackjack_master',
        name: 'Blackjack Master',
        description: 'Get 10 natural blackjacks',
        coinReward: 1000,
        xpReward: 500,
        condition: { type: 'blackjacks', target: 10 },
      },
      {
        id: 'perfect_counter',
        name: 'Perfect Counter',
        description: 'Maintain 95% counting accuracy for 100 cards',
        coinReward: 2000,
        xpReward: 1000,
        condition: { type: 'countingAccuracy', target: 95, cards: 100 },
      },
      {
        id: 'strategy_expert',
        name: 'Strategy Expert',
        description: 'Make 100 optimal decisions in a row',
        coinReward: 1500,
        xpReward: 750,
        condition: { type: 'correctDecisions', target: 100 },
      },
      {
        id: 'high_roller',
        name: 'High Roller',
        description: 'Win 50,000 coins in cash games',
        coinReward: 5000,
        xpReward: 2000,
        condition: { type: 'totalWinnings', target: 50000 },
      },
    ];
  }
}
