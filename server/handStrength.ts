// Monte Carlo win-probability estimate for a just-dealt 2-card hand, used to decide whether
// Swap lights up (see POST /api/game/start and /api/game/swap in routes.ts). Runs against the
// REAL remaining deck for this hand — the same shuffled array the game itself deals from —
// rather than an infinite-deck approximation, since we already know exactly which cards are
// left in this specific shoe.
import type { Card } from "./BlackjackEngine";

// Hit/stand basic strategy only (S17 — dealer stands on all 17s, matching
// ServerBlackjackEngine.shouldDealerHit). Double and split aren't modeled: this is asking "is
// the ORIGINAL 2-card hand strong or weak," not computing full optimal EV, and folding in
// double/split would mean simulating bet changes and multi-hand splits for a fairly small
// accuracy gain on that question. Where standard strategy charts call for a double, this uses
// the standard fallback action for when doubling isn't available (almost always "hit", with
// soft 18 vs 3–6 being the one well-known "double else stand" exception).
function handInfo(hand: Card[]): { total: number; soft: boolean } {
  let totalHigh = 0;
  let aceCount = 0;
  for (const c of hand) {
    if (c.value === "A") aceCount++;
    totalHigh += c.numericValue;
  }
  if (aceCount > 0 && totalHigh <= 21) {
    return { total: totalHigh, soft: true };
  }
  let total = totalHigh;
  let aces = aceCount;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: false };
}

function shouldHit(hand: Card[], dealerUpValue: number): boolean {
  const { total, soft } = handInfo(hand);
  if (total >= 21) return false;

  if (soft) {
    if (total <= 17) return true; // soft 13–17: always hit
    if (total === 18) return dealerUpValue >= 9; // stand vs 2–8, hit vs 9/10/A
    return false; // soft 19–21: stand
  }

  if (total <= 11) return true; // can't bust, always hit
  if (total === 12) return !(dealerUpValue >= 4 && dealerUpValue <= 6); // stand vs 4–6 only
  if (total <= 16) return !(dealerUpValue >= 2 && dealerUpValue <= 6); // stand vs 2–6
  return false; // 17–20: stand
}

// Fisher-Yates-on-demand: rather than shuffling the whole remaining deck up front (wasted work
// when a trial only ever draws a handful of cards), each draw() picks a random card from the
// still-untouched tail and swaps it to the front — equivalent distribution, way less work
// across thousands of trials.
function makeDrawer(remainingDeck: Card[]) {
  const deck = remainingDeck.slice();
  let cursor = 0;
  return (): Card => {
    const j = cursor + Math.floor(Math.random() * (deck.length - cursor));
    [deck[cursor], deck[j]] = [deck[j], deck[cursor]];
    return deck[cursor++];
  };
}

// Player win probability (push and loss both count against it — "chances de gagner", not
// "chances de ne pas perdre") for playerCards vs a dealer showing dealerUpCard, simulated
// `trials` times against random continuations of remainingDeck.
export function simulateWinProbability(
  playerCards: Card[],
  dealerUpCard: Card,
  remainingDeck: Card[],
  trials = 3000
): number {
  const dealerUpValue = dealerUpCard.numericValue;
  let wins = 0;

  for (let t = 0; t < trials; t++) {
    const draw = makeDrawer(remainingDeck);

    const dealerHand = [dealerUpCard, draw()];
    const playerHand = [...playerCards];

    while (shouldHit(playerHand, dealerUpValue)) {
      playerHand.push(draw());
      if (handInfo(playerHand).total > 21) break;
    }
    const playerTotal = handInfo(playerHand).total;
    if (playerTotal > 21) continue; // player bust — no win

    while (handInfo(dealerHand).total < 17) {
      dealerHand.push(draw());
    }
    const dealerTotal = handInfo(dealerHand).total;

    if (dealerTotal > 21 || playerTotal > dealerTotal) wins++;
  }

  return wins / trials;
}
