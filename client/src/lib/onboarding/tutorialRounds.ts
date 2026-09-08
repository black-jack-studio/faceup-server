import type { Card } from "@/lib/blackjack/engine";

const card = (suit: Card["suit"], value: string, numericValue: number): Card => ({
  suit,
  value,
  numericValue,
});

export interface TutorialRound {
  id: 1 | 2 | 3;
  allowedAction: "hit" | "stand";
  playerStartHand: [Card, Card];
  dealerUpCard: Card;
  // Dealer hands are always dealt already totaling the round's target score (18, then 17) —
  // nothing here ever needs a live "dealer hits" step, so HandCards' existing reveal machinery
  // (faceDownIndices going [1] -> []) is all that's needed to resolve a round.
  dealerHoleCard: Card;
  // Only set for a "hit" round — the single card OnboardingTutorial deals when the player taps
  // Hit.
  hitCard?: Card;
  outcome: "win" | "bust";
}

// Three fully deterministic hands, back to back, each isolating exactly one mechanic:
// Hit (round 1), Stand (round 2), then busting — going over 21 is an automatic loss regardless
// of how the hand was played (round 3). Round 3 deliberately doesn't reuse Stand again: that
// would contradict round 2's "a strong hand + Stand wins" lesson instead of teaching something
// new.
export const TUTORIAL_ROUNDS: TutorialRound[] = [
  {
    id: 1,
    allowedAction: "hit",
    playerStartHand: [card("hearts", "6", 6), card("clubs", "4", 4)], // 10
    dealerUpCard: card("spades", "10", 10),
    dealerHoleCard: card("diamonds", "8", 8), // 18
    hitCard: card("spades", "A", 11), // 10 + A -> 21
    outcome: "win",
  },
  {
    id: 2,
    allowedAction: "stand",
    playerStartHand: [card("hearts", "10", 10), card("clubs", "9", 9)], // 19
    dealerUpCard: card("spades", "10", 10),
    dealerHoleCard: card("hearts", "7", 7), // 17
    outcome: "win",
  },
  {
    id: 3,
    allowedAction: "hit",
    playerStartHand: [card("clubs", "9", 9), card("diamonds", "6", 6)], // 15
    dealerUpCard: card("hearts", "9", 9),
    dealerHoleCard: card("spades", "7", 7), // irrelevant — the bust ends the round first
    hitCard: card("clubs", "10", 10), // 15 + 10 -> 25, bust
    outcome: "bust",
  },
];
