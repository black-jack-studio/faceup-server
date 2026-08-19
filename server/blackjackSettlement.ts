import { ServerBlackjackEngine, type Card } from "./BlackjackEngine";
import type { PlayerHand, GameAction } from "@shared/blackjack-types";

// Stateless blackjack rules shared by both the single-player engine (server/routes.ts'
// /api/game/* routes, one active_games row per user) and the Play with Friends multiplayer
// table (server/storage.ts' startTableHand/placeTableBet/applyTableAction, one shared
// gameTables row per table). None of this touches persistence — callers own reading/writing
// whatever row(s) the hand(s) live on.

export function computeHandPayout(mode: string, result: "win" | "lose" | "push", isNaturalBlackjack: boolean, bet: number): number {
  if (result === "win") return isNaturalBlackjack ? Math.floor(bet * 2.5) : bet * 2;
  if (result === "push") return bet;
  return 0;
}

// The dealer's hole card must never be sent to the client while a hand is still in progress —
// otherwise a look at devtools' network tab would reveal it before the reveal animation.
export function redactDealerHand(dealerHand: Card[]): Card[] {
  return dealerHand.map((card, i) => (i === 0 ? card : { suit: "spades", value: "?", numericValue: 0 }));
}

export function computeLegalActions(hand: PlayerHand | undefined, mode: string, allHands: PlayerHand[]): GameAction[] {
  if (!hand || hand.status !== "active") return [];
  const actions: GameAction[] = ["hit", "stand"];
  // Split hands start with a single card (the 2nd is dealt on the first hit/double, exactly
  // like a real table); non-split hands start with two. Either way this is "first decision".
  const isFirstDecision = hand.cards.length === (allHands.length > 1 ? 1 : 2);
  if (isFirstDecision) {
    actions.push("double");
    if (allHands.length === 1 && hand.cards[0].value === hand.cards[1].value) {
      actions.push("split"); // no re-splitting
    }
    if (allHands.length === 1) {
      actions.push("surrender");
    }
  }
  return actions;
}

// Settles every finished hand against the dealer, mutating hand.status/result/payout in place.
// Only hands still "standing" need the dealer to actually play — a busted/surrendered hand
// already lost regardless of what the dealer draws. A hand already marked "blackjack" (a
// natural, two-card 21) never triggers a dealer draw on its own either — real-table rule:
// the dealer doesn't play out further just because someone has a natural, only the reveal and
// straight comparison happen — and gets the 2.5x payout via isNaturalBlackjack below.
//
// Single-player (server/routes.ts' /api/game/action) never reaches here with a "blackjack"-
// status hand — naturals settle immediately in /api/game/start, before an active_games row
// even exists. Multiplayer (server/storage.ts) can't settle a seat early like that (it still
// has to wait for every other seat and the dealer), so a natural blackjack has to ride along
// until here.
export function settleHandsAgainstDealer(mode: string, deck: Card[], dealerHand: Card[], playerHands: PlayerHand[]): void {
  const anyStanding = playerHands.some(h => h.status === "standing");
  if (anyStanding) {
    ServerBlackjackEngine.dealDealerTurn(deck, dealerHand);
  }
  const dealerTotal = ServerBlackjackEngine.calculateTotal(dealerHand);
  for (const hand of playerHands) {
    if (hand.status === "busted") {
      hand.result = "lose";
      hand.payout = computeHandPayout(mode, "lose", false, hand.bet);
    } else if (hand.status === "surrendered") {
      hand.result = "lose";
      hand.payout = Math.floor(hand.bet * 0.5);
    } else {
      const playerTotal = ServerBlackjackEngine.calculateTotal(hand.cards);
      let result: "win" | "lose" | "push";
      if (dealerTotal > 21 || playerTotal > dealerTotal) result = "win";
      else if (playerTotal < dealerTotal) result = "lose";
      else result = "push";
      hand.result = result === "push" ? "push" : (hand.status === "blackjack" ? "blackjack" : result);
      hand.payout = computeHandPayout(mode, result, hand.status === "blackjack", hand.bet);
    }
  }
}
