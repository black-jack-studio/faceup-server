import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BlackjackEngine, Card } from '@/lib/blackjack/engine';
import { BasicStrategy, StrategyOptions } from '@/lib/blackjack/strategy';
import { gameService, GameStateResponse } from '@/services/gameService';
import type { GameAction as ServerGameAction } from '@shared/blackjack-types';

export type GameMode = "classic" | "tournaments" | "challenges" | "all-in" | "friends";

export const modeConfig: Record<GameMode, {
  stakesMultiplier: number;   // multiplicateur des mises/gains
  xpMultiplier: number;       // multiplicateur d'XP
  useChips: boolean;          // tjs true (pas de mode gratuit)
  leaderboard: boolean;       // actif pour tous sauf si précisé
  difficultyLevel: number;    // niveau de difficulté (1=facile, 2=normal, 3=dur)
  notes?: string;
}> = {
  "classic":     { stakesMultiplier: 1.1,  xpMultiplier: 1.1, useChips: true, leaderboard: true, difficultyLevel: 1, notes: "Easier rules, better odds." },
  "tournaments": { stakesMultiplier: 1,  xpMultiplier: 1.2, useChips: true, leaderboard: true, difficultyLevel: 2, notes: "Multi-round." },
  "challenges":  { stakesMultiplier: 1,  xpMultiplier: 1.1, useChips: true, leaderboard: true, difficultyLevel: 2, notes: "Missions & streaks." },
  // Mode removed from gameplay — the card still shows on the home screen (disabled, not
  // clickable) so this entry stays only to satisfy the Record<GameMode, ...> type below.
  "all-in":      { stakesMultiplier: 3,  xpMultiplier: 2.0, useChips: true, leaderboard: true, difficultyLevel: 3, notes: "Disabled." },
  // Same economics as classic — only the table visuals differ (two extra seats). Runs on
  // the classic engine under the hood (see friends.tsx), this entry only exists so the
  // mode-card UI can treat "friends" as a GameMode like any other.
  "friends":     { stakesMultiplier: 1.1,  xpMultiplier: 1.1, useChips: true, leaderboard: true, difficultyLevel: 1, notes: "Classic rules, play alongside two friends." },
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
  gameMode: 'practice' | 'cash' | null;
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

  // 🔒 Server-authoritative state (cash only — Practice never touches these)
  gameId: string | null;
  legalActions: ServerGameAction[];
  lastPayout: number | null;
  lastNetResult: number | null;
  isProcessingAction: boolean;
  actionError: string | null;
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
  
  // 🔒 SECURITY: Server state synchronization for cash mode — the server owns the
  // deck/hands, this just projects its authoritative response onto the local display state.
  syncServerState: (serverState: GameStateResponse) => void;
  sendServerAction: (action: ServerGameAction) => Promise<void>;
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
      gameId: null,
      legalActions: [],
      lastPayout: null,
      lastNetResult: null,
      isProcessingAction: false,
      actionError: null,

      // Actions
      startGame: (mode: 'practice' | 'cash') => {
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
          gameId: null,
          legalActions: [],
          lastPayout: null,
          lastNetResult: null,
          isProcessingAction: false,
          actionError: null,
        });
      },

      dealInitialCards: (betAmount) => {
        const { engine, gameMode } = get();

        // Cash games are dealt server-side (see syncServerState) — this is Practice-only.
        if (gameMode !== 'practice') return;

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
          canDouble: engine.canDouble(playerHand, betAmount, 10000),
          canSplit: engine.canSplit(playerHand, betAmount, 10000),
          canSurrender: engine.canSurrender(playerHand),
        });

        // Check for blackjack
        if (engine.isBlackjack(playerHand)) {
          get().stand(); // Auto-stand on blackjack
        }
      },

      hit: () => {
        const { gameMode } = get();
        if (gameMode !== 'practice') {
          get().sendServerAction('hit');
          return;
        }

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
        const { gameMode } = get();
        if (gameMode !== 'practice') {
          get().sendServerAction('stand');
          return;
        }

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
        const { gameMode } = get();
        if (gameMode !== 'practice') {
          get().sendServerAction('double');
          return;
        }

        const { bet } = get();
        set({ bet: bet * 2 });
        get().hit();
        if (get().gameState === 'playing') {
          get().stand();
        }
      },

      split: () => {
        const { gameMode } = get();
        if (gameMode !== 'practice') {
          get().sendServerAction('split');
          return;
        }

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
        const { gameMode } = get();
        if (gameMode !== 'practice') {
          get().sendServerAction('surrender');
          return;
        }

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
          gameId: null,
          legalActions: [],
          lastPayout: null,
          lastNetResult: null,
          isProcessingAction: false,
          actionError: null,
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

      // 🔒 SECURITY: Server state synchronization for cash mode. The server owns the
      // deck/hands; this only ever projects its authoritative response onto local display state.
      // The dealer's hole card is redacted by the server while in_progress, so its total here
      // is computed from the visible up-card only — never from a client-side "real" value.
      syncServerState: (serverState) => {
        const { engine } = get();
        const playerHands = serverState.playerHands;
        const dealerCards = serverState.dealerHand as Card[];
        const isSplit = playerHands.length > 1;
        const gameOver = serverState.status === 'completed';
        const activeIdx = Math.min(serverState.activeHandIndex, playerHands.length - 1);
        const activeHand = playerHands[activeIdx];

        const splitHands: SplitHand[] = playerHands.map((h) => ({
          hand: h.cards as Card[],
          total: engine.calculateTotal(h.cards as Card[]),
          result: h.result === 'blackjack' ? 'win' : h.result,
          isActive: h.status === 'active',
          isComplete: h.status !== 'active',
        }));

        const dealerTotal = gameOver
          ? engine.calculateTotal(dealerCards)
          : engine.calculateTotal([dealerCards[0]]);

        let overallResult: 'win' | 'lose' | 'push' | null = null;
        if (gameOver) {
          const wins = playerHands.filter(h => h.result === 'win' || h.result === 'blackjack').length;
          const losses = playerHands.filter(h => h.result === 'lose').length;
          overallResult = wins > losses ? 'win' : losses > wins ? 'lose' : 'push';
        }

        set({
          gameId: serverState.gameId,
          gameState: gameOver ? 'gameOver' : 'playing',
          playerHand: activeHand ? (activeHand.cards as Card[]) : [],
          dealerHand: dealerCards,
          playerTotal: activeHand ? engine.calculateTotal(activeHand.cards as Card[]) : 0,
          dealerTotal,
          bet: serverState.betAmount,
          result: overallResult,
          isSplit,
          splitHands: isSplit ? splitHands : [],
          currentSplitHand: activeIdx,
          canDouble: serverState.legalActions.includes('double'),
          canSplit: serverState.legalActions.includes('split'),
          canSurrender: serverState.legalActions.includes('surrender'),
          legalActions: serverState.legalActions,
          lastPayout: serverState.result?.payout ?? null,
          lastNetResult: serverState.result?.netResult ?? null,
          handsPlayed: gameOver ? get().handsPlayed + 1 : get().handsPlayed,
          handsWon: gameOver && overallResult === 'win' ? get().handsWon + 1 : get().handsWon,
        });
      },

      sendServerAction: async (action) => {
        const { gameId, isProcessingAction } = get();
        if (!gameId || isProcessingAction) return;

        set({ isProcessingAction: true, actionError: null });
        try {
          const response = await gameService.sendAction(gameId, action);
          get().syncServerState(response);

          // Double/split debit extra coins mid-hand — reflect the server-confirmed balance
          // immediately rather than waiting until the game ends. A local-only update (no PATCH
          // back to the server) avoids racing the server's own authoritative balance.
          if (response.remainingCoins !== undefined) {
            import("@/store/user-store").then(({ useUserStore }) => {
              const current = useUserStore.getState().user;
              if (current) {
                useUserStore.setState({
                  user: {
                    ...current,
                    coins: response.remainingCoins!,
                    bolts: response.remainingBolts ?? current.bolts,
                  },
                });
              }
            });
          }
        } catch (error: any) {
          console.error(`Failed to send "${action}" to server:`, error);
          set({ actionError: error?.message || "Action failed" });
        } finally {
          set({ isProcessingAction: false });
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
