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
  // Play with Friends only — set once this hand's "watch an ad to double" offer has been
  // claimed (see storage.doubleTableSeatReward), so a second claim on the same hand is
  // rejected. Classic solo tracks the same thing on activeGames.rewardDoubled instead, since
  // its hand isn't cleared back to null between rounds the way a table seat's is.
  rewardDoubled?: boolean;
}

export type GameAction = "hit" | "stand" | "double" | "split" | "surrender";
export type BlackjackMode = "classic";
