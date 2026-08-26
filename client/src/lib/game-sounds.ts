import { useGameStore } from "@/store/game-store";
import { playSound } from "@/lib/sound";

// Reacts to the shared game store (Practice + Classic/Cash, which both flow through
// syncServerState — see game-store.ts) so a single subscription covers every action path
// (hit/stand/double/split/surrender, and the server-authoritative cash equivalents) without
// having to sprinkle playSound() calls through each one individually.
//
// Win/lose/push has no equivalent subscription here — GameResultOverlay (shown for every
// mode, Play with Friends included) already owns that moment, see its own effect.
export function initGameSounds() {
  let prevCardCount = -1;

  useGameStore.subscribe((state) => {
    const cardCount =
      state.playerHand.length +
      state.dealerHand.length +
      state.splitHands.reduce((n, h) => n + h.hand.length, 0);

    if (state.gameState === "betting") {
      prevCardCount = 0;
    } else if (prevCardCount >= 0 && cardCount > prevCardCount) {
      playSound("cardDeal");
    }
    prevCardCount = cardCount;
  });
}
