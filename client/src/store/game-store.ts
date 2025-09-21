import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BlackjackEngine, Card } from '@/lib/blackjack/engine';
import { BasicStrategy, StrategyOptions } from '@/lib/blackjack/strategy';

export type GameMode = "classic" | "high-stakes" | "tournaments" | "challenges" | "all-in";

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
  "all-in":      { stakesMultiplier: 3,  xpMultiplier: 2.0, useChips: true, leaderboard: true, difficultyLevel: 3, notes: "Bet everything for triple rewards. Requires tickets." },
};

interface SplitHand {
  hand: Card[];
  total: number;
  result: 'win' | 'lose' | 'push' | null;
  isActive: boolean;
  isComplete: boolean;
}

interface GameState {
  // Game state
  gameState: 'betting' | 'playing' | 'dealerTurn' | 'gameOver';
  gameMode: 'practice' | 'cash' | 'all-in' | null;
  currentMode: GameMode;
  
  // Cards and hands
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  
  // Split functionality
  isSplit: boolean;
  splitHands: SplitHand[];
  currentSplitHand: number;
  
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
  startGame: (mode: 'practice' | 'cash' | 'all-in') => void;
  dealInitialCards: (betAmount: number) => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  split: () => void;
  surrender: () => void;
  resetGame: () => void;
  
  // Split functionality
  switchToNextHand: () => void;
  completeSplitGame: () => void;
  
  // Mode management
  setMode: (mode: GameMode) => void;
  getModeConfig: () => typeof modeConfig[GameMode];
  
  // Strategy
  getOptimalMove: () => string;
  recordDecision: (playerAction: string, optimalAction: string) => void;
  
  // Utilities  
  updateGameState: () => void;
  checkGameOver: () => void;
  
  // 🔒 SECURITY: Server state synchronization for All-in mode
  syncServerState: (serverState: {
    playerHand: Card[];
    dealerHand: Card[];
    gameState?: 'betting' | 'playing' | 'dealerTurn' | 'gameOver';
    bet?: number;
  }) => void;
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
      isSplit: false,
      splitHands: [],
      currentSplitHand: 0,
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
      engine: new BlackjackEngine(1), // Single deck to prevent duplicates

      // Actions
      startGame: (mode: 'practice' | 'cash' | 'all-in') => {
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
          engine: new BlackjackEngine(1), // Single deck to prevent duplicates
        });
      },

      dealInitialCards: (betAmount) => {
        const { engine } = get();
        
        // Start new round - reshuffle deck if needed between rounds
        engine.startNewRound();
        
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
          canDouble: get().gameMode === 'all-in' ? false : engine.canDouble(playerHand, betAmount, 10000),
          canSplit: get().gameMode === 'all-in' ? false : engine.canSplit(playerHand, betAmount, 10000),
          canSurrender: engine.canSurrender(playerHand),
        });

        // Check for blackjack
        if (engine.isBlackjack(playerHand)) {
          get().stand(); // Auto-stand on blackjack
        }
      },

      hit: () => {
        const { engine, playerHand, isSplit, splitHands, currentSplitHand } = get();
        const newCard = engine.dealCard();
        
        if (isSplit) {
          // Handle hit for split hand
          const newSplitHands = [...splitHands];
          const activeHand = newSplitHands[currentSplitHand];
          activeHand.hand = [...activeHand.hand, newCard];
          activeHand.total = engine.calculateTotal(activeHand.hand);
          
          // Update display hand to show current split hand
          set({
            splitHands: newSplitHands,
            playerHand: activeHand.hand,
            playerTotal: activeHand.total,
            canDouble: false, // Can't double after hitting
            canSplit: false,  // Can't split after hitting
            canSurrender: false, // Can't surrender after hitting
          });
          
          // Check for bust on current hand
          if (activeHand.total > 21) {
            activeHand.isComplete = true;
            activeHand.result = 'lose';
            get().switchToNextHand();
          }
        } else {
          // Normal hit logic
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
            
            // End round when player busts
            engine.endRound();
          }
        }
      },

      stand: () => {
        const { engine, dealerHand, playerHand, isSplit, splitHands, currentSplitHand } = get();
        
        if (isSplit) {
          // Handle stand for split hand
          const newSplitHands = [...splitHands];
          const activeHand = newSplitHands[currentSplitHand];
          activeHand.isComplete = true;
          
          set({
            splitHands: newSplitHands
          });
          
          get().switchToNextHand();
        } else {
          // Normal stand logic
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
          
          // End round - allow deck reshuffling for next round
          engine.endRound();
        }
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
        const { playerHand, bet, engine } = get();
        
        if (!engine.canSplit(playerHand, bet, 10000)) { // Assuming sufficient balance for now
          return;
        }
        
        // Create two hands from the pair
        const firstCard = playerHand[0];
        const secondCard = playerHand[1];
        
        const firstHand: SplitHand = {
          hand: [firstCard],
          total: engine.calculateTotal([firstCard]),
          result: null,
          isActive: true,
          isComplete: false
        };
        
        const secondHand: SplitHand = {
          hand: [secondCard],
          total: engine.calculateTotal([secondCard]),
          result: null,
          isActive: false,
          isComplete: false
        };
        
        set({
          isSplit: true,
          splitHands: [firstHand, secondHand],
          currentSplitHand: 0,
          playerHand: [firstCard], // Show only the active hand
          playerTotal: engine.calculateTotal([firstCard]),
          canDouble: true, // Can double on first card of split
          canSplit: false, // No re-splitting for simplicity
          bet: bet * 2 // Double the bet for split
        });
      },

      surrender: () => {
        const { engine } = get();
        
        set({
          gameState: 'gameOver',
          result: 'lose',
          handsPlayed: get().handsPlayed + 1,
          bet: Math.floor(get().bet / 2), // Lose half bet
        });
        
        // End round when player surrenders
        engine.endRound();
      },

      resetGame: () => {
        set({
          gameState: 'betting',
          playerHand: [],
          dealerHand: [],
          isSplit: false,
          splitHands: [],
          currentSplitHand: 0,
          playerTotal: 0,
          dealerTotal: 0,
          bet: 0,
          result: null,
          canDouble: false,
          canSplit: false,
          canSurrender: false,
        });
      },
      
      // Split functionality
      switchToNextHand: () => {
        const { splitHands, currentSplitHand, engine } = get();
        
        // Mark current hand as complete
        const newSplitHands = [...splitHands];
        newSplitHands[currentSplitHand].isComplete = true;
        newSplitHands[currentSplitHand].isActive = false;
        
        // Move to next hand
        const nextHandIndex = currentSplitHand + 1;
        
        if (nextHandIndex < splitHands.length) {
          // Activate next hand
          newSplitHands[nextHandIndex].isActive = true;
          
          set({
            splitHands: newSplitHands,
            currentSplitHand: nextHandIndex,
            playerHand: newSplitHands[nextHandIndex].hand,
            playerTotal: newSplitHands[nextHandIndex].total,
            canDouble: newSplitHands[nextHandIndex].hand.length === 1, // Can double on first card
            canSplit: false,
            canSurrender: false,
          });
        } else {
          // All hands complete, move to dealer turn
          set({
            splitHands: newSplitHands
          });
          get().completeSplitGame();
        }
      },
      
      completeSplitGame: () => {
        const { engine, dealerHand, splitHands } = get();
        let currentDealerHand = [...dealerHand];
        
        // Reveal dealer's hole card and calculate actual total
        let dealerTotal = engine.calculateTotal(currentDealerHand);
        
        set({ gameState: 'dealerTurn' });
        
        // Dealer draws cards
        const modeConfig = get().getModeConfig();
        const difficultyLevel = modeConfig.difficultyLevel || 2;
        
        while (engine.shouldDealerHit(currentDealerHand, difficultyLevel)) {
          const newCard = engine.dealCard();
          currentDealerHand.push(newCard);
          dealerTotal = engine.calculateTotal(currentDealerHand);
        }
        
        // Determine results for each split hand
        const updatedSplitHands = splitHands.map(hand => {
          const dealerBlackjack = engine.isBlackjack(currentDealerHand);
          const playerBlackjack = engine.isBlackjack(hand.hand);
          const playerBusted = hand.total > 21;
          const dealerBusted = dealerTotal > 21;
          
          const result = engine.determineWinner(
            hand.total,
            dealerTotal,
            playerBlackjack,
            dealerBlackjack,
            playerBusted,
            dealerBusted
          );
          
          return { ...hand, result };
        });
        
        // Calculate overall result (for display purposes)
        const wins = updatedSplitHands.filter(hand => hand.result === 'win').length;
        const losses = updatedSplitHands.filter(hand => hand.result === 'lose').length;
        const overallResult = wins > losses ? 'win' : losses > wins ? 'lose' : 'push';
        
        set({
          dealerHand: currentDealerHand,
          dealerTotal,
          gameState: 'gameOver',
          result: overallResult,
          splitHands: updatedSplitHands,
          handsPlayed: get().handsPlayed + 1,
          handsWon: wins > 0 ? get().handsWon + 1 : get().handsWon,
        });
        
        // End round
        engine.endRound();
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

      // 🔒 SECURITY: Secure server state synchronization for All-in mode
      syncServerState: (serverState) => {
        const { engine } = get();
        
        console.log("🔒 Synchronizing client state with authoritative server state");
        
        set({
          playerHand: serverState.playerHand,
          dealerHand: serverState.dealerHand,
          playerTotal: engine.calculateTotal(serverState.playerHand),
          dealerTotal: engine.calculateTotal(serverState.dealerHand),
          gameState: serverState.gameState || 'playing',
          bet: serverState.bet || get().bet,
        });
        
        console.log("✅ Client state synchronized with server authority");
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
