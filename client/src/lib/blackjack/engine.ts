export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  numericValue: number;
}

export interface GameState {
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  playerTotal: number;
  dealerTotal: number;
  gameState: "betting" | "playing" | "dealerTurn" | "gameOver";
  bet: number;
  result: "win" | "lose" | "push" | null;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

export class BlackjackEngine {
  private deck: Card[] = [];
  
  constructor() {
    this.createDeck();
    this.shuffle();
  }

  private createDeck() {
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

    this.deck = [];
    
    // Create 6 decks
    for (let i = 0; i < 6; i++) {
      for (const suit of suits) {
        for (const val of values) {
          this.deck.push({
            suit,
            value: val.value,
            numericValue: val.numeric,
          });
        }
      }
    }
  }

  private shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealCard(): Card {
    if (this.deck.length < 10) {
      this.createDeck();
      this.shuffle();
    }
    return this.deck.pop()!;
  }

  calculateTotal(hand: Card[]): number {
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

  isSoft(hand: Card[]): boolean {
    let hasUsableAce = false;
    let total = 0;

    for (const card of hand) {
      if (card.value === "A") {
        total += 11;
        hasUsableAce = true;
      } else {
        total += card.numericValue;
      }
    }

    return hasUsableAce && total <= 21;
  }

  isPair(hand: Card[]): boolean {
    return hand.length === 2 && hand[0].value === hand[1].value;
  }

  isBlackjack(hand: Card[]): boolean {
    return hand.length === 2 && this.calculateTotal(hand) === 21;
  }

  canDouble(hand: Card[], bet: number, balance: number): boolean {
    return hand.length === 2 && balance >= bet;
  }

  canSplit(hand: Card[], bet: number, balance: number): boolean {
    return this.isPair(hand) && balance >= bet;
  }

  canSurrender(hand: Card[]): boolean {
    return hand.length === 2;
  }

  getDealerUpCard(dealerHand: Card[]): Card {
    return dealerHand[0];
  }

  shouldDealerHit(dealerHand: Card[], difficultyLevel: number = 2): boolean {
    const total = this.calculateTotal(dealerHand);
    const isSoft = this.isSoft(dealerHand);
    
    // Mode Classic (difficultyLevel 1) - Plus facile pour le joueur
    if (difficultyLevel === 1) {
      // Dealer plus conservateur : ne hit pas sur soft 17, s'arrête plus tôt
      return total < 17;
    }
    
    // Mode High-Stakes (difficultyLevel 3) - Plus dur pour le joueur  
    if (difficultyLevel === 3) {
      // Dealer plus agressif : hit sur soft 17 et même parfois sur 17 dur
      if (total < 17) return true;
      if (total === 17 && isSoft) return true;
      // 20% de chance de hit sur 17 dur pour être plus agressif
      if (total === 17 && !isSoft && Math.random() < 0.2) return true;
      return false;
    }
    
    // Mode normal (difficultyLevel 2) - Règles standard
    return total < 17 || (total === 17 && isSoft);
  }

  determineWinner(
    playerTotal: number,
    dealerTotal: number,
    playerBlackjack: boolean,
    dealerBlackjack: boolean,
    playerBusted: boolean,
    dealerBusted: boolean
  ): "win" | "lose" | "push" {
    if (playerBusted) return "lose";
    if (dealerBusted) return "win";
    if (playerBlackjack && dealerBlackjack) return "push";
    if (playerBlackjack) return "win";
    if (dealerBlackjack) return "lose";
    if (playerTotal > dealerTotal) return "win";
    if (playerTotal < dealerTotal) return "lose";
    return "push";
  }

  calculatePayout(bet: number, result: "win" | "lose" | "push", isBlackjack: boolean, difficultyLevel: number = 2): number {
    if (result === "lose") return -bet;
    if (result === "push") return 0;
    
    // Mode Classic (difficultyLevel 1) - Payouts légèrement meilleurs
    if (difficultyLevel === 1) {
      if (isBlackjack) return Math.floor(bet * 1.6); // 8:5 payout au lieu de 3:2
      return Math.floor(bet * 1.1); // 1.1:1 payout au lieu de 1:1
    }
    
    // Mode High-Stakes (difficultyLevel 3) - Payouts réduits
    if (difficultyLevel === 3) {
      if (isBlackjack) return Math.floor(bet * 1.3); // 1.3:1 payout au lieu de 3:2  
      return Math.floor(bet * 0.9); // 0.9:1 payout au lieu de 1:1
    }
    
    // Mode normal (difficultyLevel 2) - Payouts standard
    if (isBlackjack) return Math.floor(bet * 1.5); // 3:2 payout
    return bet; // 1:1 payout
  }
}
