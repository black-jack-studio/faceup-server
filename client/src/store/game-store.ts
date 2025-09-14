import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BlackjackEngine, Card } from '@/lib/blackjack/engine';
import { BasicStrategy, StrategyOptions } from '@/lib/blackjack/strategy';

export type GameMode = "classic" | "high-stakes" | "tournaments" | "challenges";

export const modeConfig: Record<GameMode, {
  stakesMultiplier: number;   // multiplicateur des mises/gains
  xpMultiplier: number;       // multiplicateur d'XP
  useChips: boolean;          // tjs true (pas de mode gratuit)
  leaderboard: boolean;       // actif pour tous sauf si précisé
  difficultyLevel: number;    // niveau de difficulté (1=facile, 2=normal, 3=dur)
  notes?: string;
}> = {
  "classic":     { stakesMultiplier: 1.1,  xpMultiplier: 1.1, useChips: true, leaderboard: true, difficultyLevel: 1, notes: "Easier rules, better odds." },
  "high-stakes": { stakesMultiplier: 1,  xpMultiplier: 1.2, useChips: true, leaderboard: true, difficultyLevel: 2, notes: "Chain wins for massive multipliers. Premium only." },
  "tournaments": { stakesMultiplier: 1,  xpMultiplier: 1.2, useChips: true, leaderboard: true, difficultyLevel: 2, notes: "Multi-round." },
  "challenges":  { stakesMultiplier: 1,  xpMultiplier: 1.1, useChips: true, leaderboard: true, difficultyLevel: 2, notes: "Missions & streaks." },
};

interface GameState {
  // Game state
  gameState: 'betting' | 'playing' | 'dealerTurn' | 'gameOver';
  gameMode: 'practice' | 'cash' | null;
  currentMode: GameMode;
  
  // Cards and hands
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  
  // Game values
  playerTotal: number;
  dealerTotal: number;
  bet: number;
  result: 'win' | 'lose' | 'push' | null;
  
  // Game options
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
  
  // Statistics
  handsPlayed: number;
  handsWon: number;
  correctDecisions: number;
  totalDecisions: number;
  currentStreak: number;
  
  // Engine
  engine: BlackjackEngine;
}

interface GameActions {
  // Game flow
  startGame: (mode: 'practice' | 'cash') => void;
  dealInitialCards: (betAmount: number) => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  split: () => void;
  surrender: () => void;
  resetGame: () => void;
  
  // Mode management
  setMode: (mode: GameMode) => void;
  getModeConfig: () => typeof modeConfig[GameMode];
  
  // Strategy
  getOptimalMove: () => string;
  recordDecision: (playerAction: string, optimalAction: string) => void;
  
  // Utilities
  updateGameState: () => void;
  checkGameOver: () => void;
}

type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      gameState: 'betting',
      gameMode: null,
      currentMode: "classic",
      playerHand: [],
      dealerHand: [],
      deck: [],
      playerTotal: 0,
      dealerTotal: 0,
      bet: 0,
      result: null,
      canDouble: false,
      canSplit: false,
      canSurrender: false,
      handsPlayed: 0,
      handsWon: 0,
      correctDecisions: 0,
      totalDecisions: 0,
      currentStreak: 0,
      engine: new BlackjackEngine(),

      // Actions
      startGame: (mode) => {
        set({
          gameMode: mode,
          gameState: 'betting',
          playerHand: [],
          dealerHand: [],
          playerTotal: 0,
          dealerTotal: 0,
          bet: 0,
          result: null,
          canDouble: false,
          canSplit: false,
          canSurrender: false,
          engine: new BlackjackEngine(),
        });
      },

      dealInitialCards: (betAmount) => {
        const { engine } = get();
        
        const playerCard1 = engine.dealCard();
        const dealerCard1 = engine.dealCard();
        const playerCard2 = engine.dealCard();
        const dealerCard2 = engine.dealCard();
        
        const playerHand = [playerCard1, playerCard2];
        const dealerHand = [dealerCard1, dealerCard2];
        
        const playerTotal = engine.calculateTotal(playerHand);
        const dealerTotal = engine.calculateTotal([dealerCard1]); // Only show first card
        
        set({
          gameState: 'playing',
          playerHand,
          dealerHand,
          playerTotal,
          dealerTotal,
          bet: betAmount,
          canDouble: engine.canDouble(playerHand, betAmount, 10000), // Assume enough balance  
          canSplit: engine.canSplit(playerHand, betAmount, 10000),
          canSurrender: engine.canSurrender(playerHand),
        });

        // Check for blackjack
        if (engine.isBlackjack(playerHand)) {
          get().stand(); // Auto-stand on blackjack
        }
      },

      hit: () => {
        const { engine, playerHand } = get();
        const newCard = engine.dealCard();
        const newPlayerHand = [...playerHand, newCard];
        const newPlayerTotal = engine.calculateTotal(newPlayerHand);
        
        set({
          playerHand: newPlayerHand,
          playerTotal: newPlayerTotal,
          canDouble: false, // Can't double after hitting
          canSplit: false,  // Can't split after hitting
          canSurrender: false, // Can't surrender after hitting
        });

        // Check if busted
        if (newPlayerTotal > 21) {
          set({
            gameState: 'gameOver',
            result: 'lose',
            handsPlayed: get().handsPlayed + 1,
          });
        }
      },

      stand: () => {
        const { engine, dealerHand, playerHand } = get();
        let currentDealerHand = [...dealerHand];
        
        // Reveal dealer's hole card and calculate actual total
        let dealerTotal = engine.calculateTotal(currentDealerHand);
        
        set({ gameState: 'dealerTurn' });
        
        // Dealer draws cards - with difficulty adjustment
        const modeConfig = get().getModeConfig();
        const difficultyLevel = modeConfig.difficultyLevel || 2;
        
        while (engine.shouldDealerHit(currentDealerHand, difficultyLevel)) {
          const newCard = engine.dealCard();
          currentDealerHand.push(newCard);
          dealerTotal = engine.calculateTotal(currentDealerHand);
        }
        
        const playerTotal = engine.calculateTotal(playerHand);
        const playerBlackjack = engine.isBlackjack(playerHand);
        const dealerBlackjack = engine.isBlackjack(currentDealerHand);
        const playerBusted = playerTotal > 21;
        const dealerBusted = dealerTotal > 21;
        
        const result = engine.determineWinner(
          playerTotal,
          dealerTotal,
          playerBlackjack,
          dealerBlackjack,
          playerBusted,
          dealerBusted
        );
        
        set({
          dealerHand: currentDealerHand,
          dealerTotal,
          gameState: 'gameOver',
          result,
          handsPlayed: get().handsPlayed + 1,
          handsWon: result === 'win' ? get().handsWon + 1 : get().handsWon,
        });
      },

      double: () => {
        const { bet } = get();
        set({ bet: bet * 2 });
        get().hit();
        if (get().gameState === 'playing') {
          get().stand();
        }
      },

      split: () => {
        // Simplified split implementation - would need more complex logic for full implementation
        get().hit(); // For now, just hit instead of implementing full split
      },

      surrender: () => {
        set({
          gameState: 'gameOver',
          result: 'lose',
          handsPlayed: get().handsPlayed + 1,
          bet: Math.floor(get().bet / 2), // Lose half bet
        });
      },

      resetGame: () => {
        set({
          gameState: 'betting',
          playerHand: [],
          dealerHand: [],
          playerTotal: 0,
          dealerTotal: 0,
          bet: 0,
          result: null,
          canDouble: false,
          canSplit: false,
          canSurrender: false,
        });
      },

      // Mode management
      setMode: (mode: GameMode) => {
        set({ currentMode: mode });
      },

      getModeConfig: () => {
        const mode = get().currentMode;
        return modeConfig[mode];
      },

      getOptimalMove: () => {
        const { 
          playerHand, 
          dealerHand, 
          playerTotal, 
          engine,
          canDouble,
          canSplit,
          canSurrender 
        } = get();
        
        if (dealerHand.length === 0) return 'hit';
        
        const dealerUpcard = engine.getDealerUpCard(dealerHand);
        const isSoft = engine.isSoft(playerHand);
        const isPair = engine.isPair(playerHand);
        const pairValue = isPair ? playerHand[0].value : undefined;
        
        const options: StrategyOptions = {
          dealerUpcard: dealerUpcard.value === 'A' ? 11 : dealerUpcard.numericValue,
          playerTotal,
          isSoft,
          isPair,
          pairValue,
          canDouble,
          canSplit,
          canSurrender,
          deckCount: 6,
        };
        
        return BasicStrategy.getOptimalAction(options);
      },

      recordDecision: (playerAction, optimalAction) => {
        const isCorrect = playerAction === optimalAction;
        const newStreak = isCorrect ? get().currentStreak + 1 : 0;
        
        set({
          totalDecisions: get().totalDecisions + 1,
          correctDecisions: isCorrect ? get().correctDecisions + 1 : get().correctDecisions,
          currentStreak: newStreak,
        });
      },

      updateGameState: () => {
        // Update any derived state if needed
      },

      checkGameOver: () => {
        const { playerTotal, gameState } = get();
        if (playerTotal > 21 && gameState === 'playing') {
          set({
            gameState: 'gameOver',
            result: 'lose',
          });
        }
      },
    }),
    {
      name: 'blackjack-game-store',
      partialize: (state) => ({
        handsPlayed: state.handsPlayed,
        handsWon: state.handsWon,
        correctDecisions: state.correctDecisions,
        totalDecisions: state.totalDecisions,
      }),
    }
  )
);
