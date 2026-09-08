import type { Card } from "@/lib/blackjack/engine";

const card = (suit: Card["suit"], value: string, numericValue: number): Card => ({
  suit,
  value,
  numericValue,
});

export type TutorialMechanic = "hit" | "stand" | "double" | "swap";

export interface TutorialRound {
  id: 1 | 2 | 3 | 4 | 5;
  mechanic: TutorialMechanic;
  playerStartHand: [Card, Card];
  dealerUpCard: Card;
  // Dealer hands are always dealt already totaling the round's target score — nothing here
  // ever needs a live "dealer hits" step, so HandCards' existing reveal machinery
  // (faceDownIndices going [1] -> []) is all that's needed to resolve a round.
  dealerHoleCard: Card;
  // hit/double rounds: the single card OnboardingTutorial deals when the player taps
  // Hit/Double. Unused for stand/swap.
  hitCard?: Card;
  // swap round only: the fresh 2-card hand OnboardingTutorial swaps playerStartHand for when
  // the player taps Swap — mirrors the real Swap redeal (see table-test.tsx's handleSwap),
  // landing a natural blackjack here so the round pays off the mechanic it's teaching.
  swapHand?: [Card, Card];
  outcome: "win" | "bust";
}

// Five fully deterministic hands, back to back, each isolating exactly one mechanic: Hit,
// Stand, Double, Swap, then busting — going over 21 is an automatic loss regardless of how the
// hand was played, so it's saved for last as the one cautionary note among four wins. Swap
// sits right before it (not earlier) since Swap only ever shows up on a bad hand — leading
// with a losing-looking deal right into the round that explains why it's about to lose.
export const TUTORIAL_ROUNDS: TutorialRound[] = [
  {
    id: 1,
    mechanic: "hit",
    playerStartHand: [card("hearts", "6", 6), card("clubs", "4", 4)], // 10
    dealerUpCard: card("spades", "10", 10),
    dealerHoleCard: card("diamonds", "8", 8), // 18
    hitCard: card("spades", "A", 11), // 10 + A -> 21
    outcome: "win",
  },
  {
    id: 2,
    mechanic: "stand",
    playerStartHand: [card("hearts", "10", 10), card("clubs", "9", 9)], // 19
    dealerUpCard: card("spades", "10", 10),
    dealerHoleCard: card("hearts", "7", 7), // 17
    outcome: "win",
  },
  {
    id: 3,
    mechanic: "double",
    playerStartHand: [card("hearts", "6", 6), card("clubs", "5", 5)], // 11 — textbook double
    dealerUpCard: card("spades", "9", 9),
    dealerHoleCard: card("diamonds", "8", 8), // 17
    hitCard: card("hearts", "K", 10), // 11 + 10 -> 21
    outcome: "win",
  },
  {
    id: 4,
    mechanic: "swap",
    // A genuinely bad hand against a strong dealer up-card — same shape as swapEligible's
    // real "under 50% win probability" gate in table-test.tsx — so Swap actually makes sense
    // here instead of appearing on a hand that already looked fine.
    playerStartHand: [card("clubs", "9", 9), card("diamonds", "7", 7)], // 16 vs dealer 10
    dealerUpCard: card("spades", "10", 10),
    dealerHoleCard: card("hearts", "6", 6), // 16
    swapHand: [card("spades", "A", 11), card("hearts", "K", 10)], // fresh deal -> blackjack
    outcome: "win",
  },
  {
    id: 5,
    mechanic: "hit",
    playerStartHand: [card("clubs", "9", 9), card("diamonds", "6", 6)], // 15
    dealerUpCard: card("hearts", "9", 9),
    dealerHoleCard: card("spades", "7", 7), // irrelevant — the bust ends the round first
    hitCard: card("clubs", "10", 10), // 15 + 10 -> 25, bust
    outcome: "bust",
  },
];
