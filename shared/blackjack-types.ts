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
  // Classic solo only — set once the Swap button has redealt this hand's starting 2 cards
  // (see POST /api/game/swap), so a second swap on the same hand is rejected even though the
  // 1-per-hand cap is already enforced client-side by the button going disabled.
  swapped?: boolean;
  // Play with Friends only — this seat's own currentStreakFriends value immediately after this
  // hand settled (0 after a loss, unchanged after a push, incremented — or reset to 0 once it
  // completes a cycle — after a win). Set on every settled hand, not just wins, so the client
  // always has a fresh value to show even on a push. Independent of Classic solo's own streak
  // (see currentStreakFriends' own comment in schema.ts) — settleTableAndCredit (storage.ts) is
  // the only writer.
  streakAfter?: number;
  // Set to the bonus coins awarded the one hand that completes a 3-win cycle (already folded
  // into this hand's own `payout`), null every other hand. Mirrors Classic solo's
  // applyClassicStreakBonus return value — see its own comment for the formula.
  streakBonus?: number | null;
}

export type GameAction = "hit" | "stand" | "double" | "split" | "surrender";
export type BlackjackMode = "classic";
