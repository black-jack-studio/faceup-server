import { Card } from './engine';

export interface StrategyDecision {
  action: 'hit' | 'stand' | 'double' | 'split' | 'surrender';
  ev: number; // Expected value
}

export interface StrategyOptions {
  dealerUpcard: number;
  playerTotal: number;
  isSoft: boolean;
  isPair: boolean;
  pairValue?: string;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
  deckCount: number;
}

// Basic Strategy Tables for 6-deck, S17, DAS, Late Surrender
const HARD_STRATEGY: Record<string, Record<number, string>> = {
  '5': { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '6': { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '7': { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '8': { 2: 'H', 3: 'H', 4: 'H', 5: 'H', 6: 'H', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '9': { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '10': { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 11: 'H' },
  '11': { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'D', 11: 'D' },
  '12': { 2: 'H', 3: 'H', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '13': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '14': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '15': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', 10: 'R', 11: 'H' },
  '16': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'R', 10: 'R', 11: 'R' },
  '17': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  '18': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  '19': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  '20': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  '21': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
};

const SOFT_STRATEGY: Record<string, Record<number, string>> = {
  '13': { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '14': { 2: 'H', 3: 'H', 4: 'H', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '15': { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '16': { 2: 'H', 3: 'H', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '17': { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '18': { 2: 'S', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'S', 8: 'S', 9: 'H', 10: 'H', 11: 'H' },
  '19': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  '20': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  '21': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
};

const PAIR_STRATEGY: Record<string, Record<number, string>> = {
  'A': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P', 10: 'P', 11: 'P' },
  '10': { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'S', 8: 'S', 9: 'S', 10: 'S', 11: 'S' },
  '9': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'S', 8: 'P', 9: 'P', 10: 'S', 11: 'S' },
  '8': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'P', 9: 'P', 10: 'P', 11: 'P' },
  '7': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '6': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '5': { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', 10: 'H', 11: 'H' },
  '4': { 2: 'H', 3: 'H', 4: 'H', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '3': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
  '2': { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', 10: 'H', 11: 'H' },
};

export class BasicStrategy {
  private static getDealerValue(dealerCard: Card): number {
    return dealerCard.value === 'A' ? 11 : dealerCard.numericValue;
  }

  static getOptimalAction(options: StrategyOptions): string {
    const { dealerUpcard, playerTotal, isSoft, isPair, pairValue, canDouble, canSplit, canSurrender } = options;

    // Handle pairs first
    if (isPair && canSplit && pairValue) {
      const pairAction = PAIR_STRATEGY[pairValue]?.[dealerUpcard];
      if (pairAction === 'P') return 'split';
      if (pairAction === 'D' && canDouble) return 'double';
      if (pairAction === 'H') return 'hit';
      if (pairAction === 'S') return 'stand';
    }

    // Handle soft totals
    if (isSoft) {
      const softAction = SOFT_STRATEGY[playerTotal.toString()]?.[dealerUpcard];
      if (softAction === 'D' && canDouble) return 'double';
      if (softAction === 'H') return 'hit';
      if (softAction === 'S') return 'stand';
    }

    // Handle hard totals
    const hardAction = HARD_STRATEGY[playerTotal.toString()]?.[dealerUpcard];
    if (hardAction === 'R' && canSurrender) return 'surrender';
    if (hardAction === 'D' && canDouble) return 'double';
    if (hardAction === 'H') return 'hit';
    if (hardAction === 'S') return 'stand';

    // Default to hit if no strategy found
    return 'hit';
  }

  static calculateExpectedValue(
    playerTotal: number,
    dealerUpcard: number,
    action: string,
    isSoft: boolean = false
  ): number {
    // Simplified EV calculation - in a real implementation, this would be much more complex
    // and based on extensive simulation or mathematical computation
    
    const baseEV: Record<string, number> = {
      'hit': -0.1,
      'stand': -0.05,
      'double': -0.08,
      'split': -0.03,
      'surrender': -0.5,
    };

    let ev = baseEV[action] || 0;

    // Adjust based on player total and dealer upcard
    if (action === 'stand') {
      if (playerTotal >= 17) ev += 0.15;
      if (playerTotal <= 11) ev -= 0.3;
      if (dealerUpcard >= 7 && playerTotal < 17) ev -= 0.2;
      if (dealerUpcard <= 6 && playerTotal >= 12) ev += 0.1;
    }

    if (action === 'hit') {
      if (playerTotal <= 11) ev += 0.2;
      if (playerTotal >= 17) ev -= 0.4;
      if (isSoft && playerTotal <= 17) ev += 0.1;
    }

    if (action === 'double') {
      if (playerTotal === 11) ev += 0.15;
      if (playerTotal === 10 && dealerUpcard <= 9) ev += 0.1;
      if (isSoft && playerTotal >= 15 && playerTotal <= 17 && dealerUpcard <= 6) ev += 0.05;
    }

    return Math.round(ev * 100) / 100; // Round to 2 decimal places
  }

  static getAllActionEVs(options: StrategyOptions): Record<string, number> {
    const { dealerUpcard, playerTotal, isSoft, canDouble, canSplit, canSurrender } = options;
    const evs: Record<string, number> = {};

    // Always available actions
    evs.hit = this.calculateExpectedValue(playerTotal, dealerUpcard, 'hit', isSoft);
    evs.stand = this.calculateExpectedValue(playerTotal, dealerUpcard, 'stand', isSoft);

    // Conditional actions
    if (canDouble) {
      evs.double = this.calculateExpectedValue(playerTotal, dealerUpcard, 'double', isSoft);
    }

    if (canSplit) {
      evs.split = this.calculateExpectedValue(playerTotal, dealerUpcard, 'split', isSoft);
    }

    if (canSurrender) {
      evs.surrender = this.calculateExpectedValue(playerTotal, dealerUpcard, 'surrender', isSoft);
    }

    return evs;
  }

  static isOptimalDecision(playerAction: string, optimalAction: string): boolean {
    return playerAction === optimalAction;
  }

  static getAdvancedStrategy(runningCount: number, trueCount: number): Record<string, any> {
    // Basic indices for Hi-Lo system
    const indices: Record<string, Record<number, number>> = {
      '16v10': { 'stand': 0 }, // Stand on 16 vs 10 when true count >= 0
      '16v9': { 'stand': 4 },  // Stand on 16 vs 9 when true count >= 4
      '15v10': { 'stand': 4 }, // Stand on 15 vs 10 when true count >= 4
      '12v3': { 'stand': 2 },  // Stand on 12 vs 3 when true count >= 2
      '12v2': { 'stand': 3 },  // Stand on 12 vs 2 when true count >= 3
      '13v2': { 'stand': -1 }, // Stand on 13 vs 2 when true count >= -1
      '10vT': { 'double': 4 }, // Double 10 vs T when true count >= 4
      '9v2': { 'double': 1 },  // Double 9 vs 2 when true count >= 1
      '9v7': { 'double': 3 },  // Double 9 vs 7 when true count >= 3
    };

    return {
      indices,
      shouldDeviate: (situation: string, action: string) => {
        const index = indices[situation]?.[action];
        return index !== undefined && trueCount >= index;
      }
    };
  }
}
