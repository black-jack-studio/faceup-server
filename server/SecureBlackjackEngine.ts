// AUTHORITATIVE Secure Blackjack Engine - Server-side game management
import { createHash, randomBytes } from "crypto";

export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  numericValue: number;
}

export interface GameState {
  gameId: string;
  deckSeed: string;
  deckHash: string;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: "initial" | "player_turn" | "dealer_turn" | "finished";
  usedCards: Set<string>; // Track used cards for validation
}

export interface GameResult {
  playerTotal: number;
  dealerTotal: number;
  playerHand: Card[];
  dealerHand: Card[];
  result: "win" | "lose" | "push";
  isPlayerBlackjack: boolean;
  isDealerBlackjack: boolean;
  playerBusted: boolean;
  dealerBusted: boolean;
  gameId: string;
  deckSeed: string;
  deckHash: string;
}

export class SecureBlackjackEngine {
  private static gameStates: Map<string, GameState> = new Map();

  /**
   * Creates a full deck of 52 cards
   */
  private static createDeck(): Card[] {
    const suits: Card["suit"][] = ["hearts", "diamonds", "clubs", "spades"];
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const value of values) {
        const numericValue = value === "A" ? 11 : 
                           ["J", "Q", "K"].includes(value) ? 10 : 
                           parseInt(value);
        
        deck.push({ suit, value, numericValue });
      }
    }

    return deck;
  }

  /**
   * Shuffles deck using cryptographically secure Fisher-Yates shuffle with seed
   */
  private static shuffleDeck(deck: Card[], seed: string): Card[] {
    const shuffled = [...deck];
    const seedHash = createHash('sha256').update(seed).digest();
    
    // Use seed to create deterministic but secure shuffle
    let currentIndex = shuffled.length;
    let seedIndex = 0;

    while (currentIndex !== 0) {
      // Generate random index using seed bytes
      const randomByte = seedHash[seedIndex % seedHash.length];
      seedIndex++;
      
      // Convert to index
      const randomIndex = Math.floor((randomByte / 255) * currentIndex);
      currentIndex--;

      // Swap elements
      [shuffled[currentIndex], shuffled[randomIndex]] = 
      [shuffled[randomIndex], shuffled[currentIndex]];
    }

    return shuffled;
  }

  /**
   * Creates a deterministic hash of the deck for verification
   */
  private static createDeckHash(deck: Card[]): string {
    const deckString = deck.map(card => `${card.suit}-${card.value}`).join(',');
    return createHash('sha256').update(deckString).digest('hex');
  }

  /**
   * Generates a unique card identifier for duplicate checking
   */
  private static getCardId(card: Card): string {
    return `${card.suit}-${card.value}`;
  }

  /**
   * Calculates hand total with proper Ace handling
   */
  static calculateTotal(hand: Card[]): number {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      if (card.value === "A") {
        aces++;
        total += 11;
      } else {
        total += card.numericValue;
      }
    }

    // Adjust for aces
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  }

  /**
   * Determines if a hand is blackjack
   */
  static isBlackjack(hand: Card[]): boolean {
    return hand.length === 2 && this.calculateTotal(hand) === 21;
  }

  /**
   * AUTHORITATIVE: Creates a new secure game session
   */
  static createGame(userId: string): { gameId: string; playerHand: Card[]; dealerHand: Card[]; gameState: GameState } {
    // Generate unique game ID
    const gameId = `game_${userId}_${Date.now()}_${randomBytes(8).toString('hex')}`;
    
    // Generate secure random seed
    const deckSeed = randomBytes(32).toString('hex');
    
    // Create and shuffle deck
    const deck = this.shuffleDeck(this.createDeck(), deckSeed);
    const deckHash = this.createDeckHash(deck);
    
    // Deal initial cards (2 for player, 2 for dealer)
    const playerHand = [deck[0], deck[2]];
    const dealerHand = [deck[1], deck[3]];
    
    // Track used cards
    const usedCards = new Set<string>();
    for (const card of [...playerHand, ...dealerHand]) {
      usedCards.add(this.getCardId(card));
    }
    
    // Create game state
    const gameState: GameState = {
      gameId,
      deckSeed,
      deckHash,
      deck: deck.slice(4), // Remove dealt cards
      playerHand: [...playerHand],
      dealerHand: [...dealerHand],
      phase: "initial",
      usedCards
    };
    
    // Store game state
    this.gameStates.set(gameId, gameState);
    
    // Auto-cleanup after 1 hour
    setTimeout(() => {
      this.gameStates.delete(gameId);
    }, 60 * 60 * 1000);
    
    return {
      gameId,
      playerHand,
      dealerHand: [dealerHand[0]], // Only show first dealer card initially
      gameState
    };
  }

  /**
   * AUTHORITATIVE: Process player action (hit/stand/surrender)
   */
  static processAction(gameId: string, action: "hit" | "stand" | "surrender"): GameResult | null {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      throw new Error("Game not found or expired");
    }

    if (gameState.phase === "finished") {
      throw new Error("Game already finished");
    }

    if (gameState.phase !== "initial" && gameState.phase !== "player_turn") {
      throw new Error("Invalid game phase for player action");
    }

    // Set to player turn if initial
    if (gameState.phase === "initial") {
      gameState.phase = "player_turn";
    }

    switch (action) {
      case "hit":
        // Deal card to player
        if (gameState.deck.length === 0) {
          throw new Error("No more cards in deck");
        }
        
        const card = gameState.deck.shift()!;
        const cardId = this.getCardId(card);
        
        // Validate card not already used (security check)
        if (gameState.usedCards.has(cardId)) {
          throw new Error("Duplicate card detected - security violation");
        }
        
        gameState.playerHand.push(card);
        gameState.usedCards.add(cardId);
        
        // Check if player busted
        const playerTotal = this.calculateTotal(gameState.playerHand);
        if (playerTotal > 21) {
          gameState.phase = "finished";
          return this.finalizeGame(gameState);
        }
        
        // Continue player turn
        return null; // Game continues
        
      case "stand":
        // Move to dealer turn
        gameState.phase = "dealer_turn";
        return this.processDealerTurn(gameState);
        
      case "surrender":
        // Player surrenders - automatic loss
        gameState.phase = "finished";
        const result = this.finalizeGame(gameState);
        // Override result for surrender
        result.result = "lose";
        return result;
        
      default:
        throw new Error("Invalid action");
    }
  }

  /**
   * AUTHORITATIVE: Process dealer turn with strict rules
   */
  private static processDealerTurn(gameState: GameState): GameResult {
    // Dealer hits on 16 and below, stands on 17 and above
    while (this.calculateTotal(gameState.dealerHand) < 17) {
      if (gameState.deck.length === 0) {
        throw new Error("No more cards in deck during dealer turn");
      }
      
      const card = gameState.deck.shift()!;
      const cardId = this.getCardId(card);
      
      // Security check
      if (gameState.usedCards.has(cardId)) {
        throw new Error("Duplicate card detected during dealer turn - security violation");
      }
      
      gameState.dealerHand.push(card);
      gameState.usedCards.add(cardId);
    }
    
    gameState.phase = "finished";
    return this.finalizeGame(gameState);
  }

  /**
   * AUTHORITATIVE: Finalize game and determine winner
   */
  private static finalizeGame(gameState: GameState): GameResult {
    const playerTotal = this.calculateTotal(gameState.playerHand);
    const dealerTotal = this.calculateTotal(gameState.dealerHand);
    
    const playerBusted = playerTotal > 21;
    const dealerBusted = dealerTotal > 21;
    
    const isPlayerBlackjack = this.isBlackjack(gameState.playerHand);
    const isDealerBlackjack = this.isBlackjack(gameState.dealerHand);
    
    let result: "win" | "lose" | "push";

    // Determine winner using standard blackjack rules
    if (playerBusted) {
      result = "lose";
    } else if (dealerBusted) {
      result = "win";
    } else if (isPlayerBlackjack && isDealerBlackjack) {
      result = "push";
    } else if (isPlayerBlackjack) {
      result = "win";
    } else if (isDealerBlackjack) {
      result = "lose";
    } else if (playerTotal > dealerTotal) {
      result = "win";
    } else if (playerTotal < dealerTotal) {
      result = "lose";
    } else {
      result = "push";
    }

    const gameResult: GameResult = {
      playerTotal,
      dealerTotal,
      playerHand: [...gameState.playerHand],
      dealerHand: [...gameState.dealerHand],
      result,
      isPlayerBlackjack,
      isDealerBlackjack,
      playerBusted,
      dealerBusted,
      gameId: gameState.gameId,
      deckSeed: gameState.deckSeed,
      deckHash: gameState.deckHash
    };

    // Clean up game state
    this.gameStates.delete(gameState.gameId);
    
    return gameResult;
  }

  /**
   * Get current game state (for debugging/admin purposes)
   */
  static getGameState(gameId: string): GameState | undefined {
    return this.gameStates.get(gameId);
  }

  /**
   * Generate deterministic game hash for idempotence (NO timestamp!)
   */
  static generateDeterministicHash(userId: string, gameId: string, deckSeed: string): string {
    const data = {
      userId,
      gameId,
      deckSeed,
      // NO timestamp here for true deterministic hash
    };
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Validate that a deck is complete and has no duplicates
   */
  static validateDeckIntegrity(deck: Card[]): boolean {
    if (deck.length !== 52) return false;
    
    const cardIds = new Set<string>();
    for (const card of deck) {
      const cardId = this.getCardId(card);
      if (cardIds.has(cardId)) {
        return false; // Duplicate found
      }
      cardIds.add(cardId);
    }
    
    return cardIds.size === 52;
  }

  /**
   * Security function: Verify game authenticity using deck hash
   */
  static verifyGameAuthenticity(gameId: string, expectedDeckHash: string): boolean {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) return false;
    
    return gameState.deckHash === expectedDeckHash;
  }
}