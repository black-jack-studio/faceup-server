import { Card } from './engine';
import { create } from 'zustand';

export interface CountingState {
  runningCount: number;
  trueCount: number;
  cardsDealt: number;
  decksRemaining: number;
  accuracy: number;
  speed: number;
  userCounts: number[];
  actualCounts: number[];
  startTime: number | null;
  isActive: boolean;
  deck: Card[];
}

export interface CountingActions {
  nextCard: () => Card | null;
  recordCount: (userCount: number) => void;
  resetDrill: () => void;
  calculateTrueCount: () => number;
  getAccuracy: () => number;
  getSpeed: () => number;
}

export type CountingStore = CountingState & CountingActions;

// Hi-Lo Card Counting System
export class HiLoCounter {
  static getCardValue(card: Card): number {
    const value = card.value;
    
    // Low cards (2-6): +1
    if (['2', '3', '4', '5', '6'].includes(value)) {
      return 1;
    }
    
    // Neutral cards (7-9): 0
    if (['7', '8', '9'].includes(value)) {
      return 0;
    }
    
    // High cards (10, J, Q, K, A): -1
    if (['10', 'J', 'Q', 'K', 'A'].includes(value)) {
      return -1;
    }
    
    return 0;
  }

  static calculateRunningCount(cards: Card[]): number {
    return cards.reduce((count, card) => count + this.getCardValue(card), 0);
  }

  static calculateTrueCount(runningCount: number, decksRemaining: number): number {
    if (decksRemaining <= 0) return runningCount;
    return Math.round((runningCount / decksRemaining) * 10) / 10;
  }

  static getCountAdvantage(trueCount: number): number {
    // Approximate player advantage based on true count
    // Each +1 true count gives approximately 0.5% advantage
    return trueCount * 0.005;
  }

  static getBettingUnit(trueCount: number, baseUnit: number = 1): number {
    // Kelly betting: bet true count - 1 units when advantage exists
    if (trueCount <= 1) return baseUnit;
    return Math.min(baseUnit * (trueCount - 1), baseUnit * 8); // Cap at 8 units
  }

  static shouldTakeInsurance(trueCount: number): boolean {
    return trueCount >= 3; // Insurance becomes profitable at +3 true count
  }
}

const createDeck = (): Card[] => {
  const suits: Card["suit"][] = ["hearts", "diamonds", "clubs", "spades"];
  const values = [
    { value: "A", numeric: 11 },
    { value: "2", numeric: 2 },
    { value: "3", numeric: 3 },
    { value: "4", numeric: 4 },
    { value: "5", numeric: 5 },
    { value: "6", numeric: 6 },
    { value: "7", numeric: 7 },
    { value: "8", numeric: 8 },
    { value: "9", numeric: 9 },
    { value: "10", numeric: 10 },
    { value: "J", numeric: 10 },
    { value: "Q", numeric: 10 },
    { value: "K", numeric: 10 },
  ];

  const deck: Card[] = [];
  
  // Create 6 decks
  for (let i = 0; i < 6; i++) {
    for (const suit of suits) {
      for (const val of values) {
        deck.push({
          suit,
          value: val.value,
          numericValue: val.numeric,
        });
      }
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export const useCountingStore = create<CountingStore>((set, get) => ({
  // State
  runningCount: 0,
  trueCount: 0,
  cardsDealt: 0,
  decksRemaining: 6,
  accuracy: 100,
  speed: 0,
  userCounts: [],
  actualCounts: [],
  startTime: null,
  isActive: false,
  deck: createDeck(),

  // Actions
  nextCard: () => {
    const state = get();
    if (state.deck.length === 0) return null;

    const card = state.deck[0];
    const newDeck = state.deck.slice(1);
    const cardValue = HiLoCounter.getCardValue(card);
    const newRunningCount = state.runningCount + cardValue;
    const newCardsDealt = state.cardsDealt + 1;
    const newDecksRemaining = Math.max(0.5, 6 - (newCardsDealt / 52));
    const newTrueCount = HiLoCounter.calculateTrueCount(newRunningCount, newDecksRemaining);

    set({
      deck: newDeck,
      runningCount: newRunningCount,
      cardsDealt: newCardsDealt,
      decksRemaining: newDecksRemaining,
      trueCount: newTrueCount,
      actualCounts: [...state.actualCounts, newRunningCount],
      startTime: state.startTime || Date.now(),
      isActive: true,
    });

    return card;
  },

  recordCount: (userCount: number) => {
    const state = get();
    const newUserCounts = [...state.userCounts, userCount];
    
    // Calculate accuracy
    const correctCount = state.runningCount;
    const isCorrect = userCount === correctCount;
    const totalCorrect = newUserCounts.reduce((acc, count, index) => {
      return acc + (count === state.actualCounts[index] ? 1 : 0);
    }, 0);
    const accuracy = newUserCounts.length > 0 ? (totalCorrect / newUserCounts.length) * 100 : 100;

    // Calculate speed (cards per second)
    const elapsedTime = state.startTime ? (Date.now() - state.startTime) / 1000 : 1;
    const speed = state.cardsDealt / elapsedTime;

    set({
      userCounts: newUserCounts,
      accuracy,
      speed,
    });
  },

  resetDrill: () => {
    set({
      runningCount: 0,
      trueCount: 0,
      cardsDealt: 0,
      decksRemaining: 6,
      accuracy: 100,
      speed: 0,
      userCounts: [],
      actualCounts: [],
      startTime: null,
      isActive: false,
      deck: createDeck(),
    });
  },

  calculateTrueCount: () => {
    const state = get();
    return HiLoCounter.calculateTrueCount(state.runningCount, state.decksRemaining);
  },

  getAccuracy: () => {
    const state = get();
    return state.accuracy;
  },

  getSpeed: () => {
    const state = get();
    return state.speed;
  },
}));

// Common counting deviations for advanced players
export const CountingDeviations = {
  // Stand deviations
  '16v10': { action: 'stand', trueCount: 0, basic: 'hit' },
  '16v9': { action: 'stand', trueCount: 4, basic: 'hit' },
  '15v10': { action: 'stand', trueCount: 4, basic: 'hit' },
  '12v3': { action: 'stand', trueCount: 2, basic: 'hit' },
  '12v2': { action: 'stand', trueCount: 3, basic: 'hit' },
  '13v2': { action: 'stand', trueCount: -1, basic: 'hit' },
  
  // Hit deviations  
  '12v4': { action: 'hit', trueCount: -2, basic: 'stand' },
  '12v5': { action: 'hit', trueCount: -2, basic: 'stand' },
  '12v6': { action: 'hit', trueCount: -1, basic: 'stand' },
  '13v3': { action: 'hit', trueCount: -2, basic: 'stand' },
  
  // Double deviations
  '10vT': { action: 'double', trueCount: 4, basic: 'hit' },
  '9v2': { action: 'double', trueCount: 1, basic: 'hit' },
  '9v7': { action: 'double', trueCount: 3, basic: 'hit' },
  '11vA': { action: 'double', trueCount: 1, basic: 'hit' },
  
  // Split deviations
  'TTv5': { action: 'split', trueCount: 5, basic: 'stand' },
  'TTv6': { action: 'split', trueCount: 4, basic: 'stand' },
};

export const getCountingDeviation = (
  playerTotal: number,
  dealerUpcard: number,
  trueCount: number
): string | null => {
  const key = `${playerTotal}v${dealerUpcard}`;
  const deviation = CountingDeviations[key as keyof typeof CountingDeviations];
  
  if (deviation && trueCount >= deviation.trueCount) {
    return deviation.action;
  }
  
  return null;
};
