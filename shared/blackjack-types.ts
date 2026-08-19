export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  numericValue: number;
}

export type PlayerHandStatus = "active" | "standing" | "busted" | "blackjack" | "surrendered";
export type HandResult = "win" | "lose" | "push" | "blackjack";

export interface PlayerHand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  status: PlayerHandStatus;
  result: HandResult | null;
  payout: number | null;
}

export type GameAction = "hit" | "stand" | "double" | "split" | "surrender";
export type BlackjackMode = "classic";
