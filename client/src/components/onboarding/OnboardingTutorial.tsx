import { useState } from "react";
import { useTranslation } from "react-i18next";
import HandCards from "@/components/game/play/HandCards";
import ActionBar from "@/components/game/play/ActionBar";
import { cn } from "@/lib/utils";
import { useSelectedCardBack } from "@/hooks/use-selected-card-back";
import type { Card } from "@/lib/blackjack/engine";
import { TUTORIAL_ROUNDS, type TutorialRound as TutorialRoundData } from "@/lib/onboarding/tutorialRounds";
import SkipLink from "./SkipLink";
import TutorialRoundPopup from "./TutorialRoundPopup";
import { trackOnboardingCompleted, trackTutorialRoundCompleted } from "@/lib/analytics";

interface OnboardingTutorialProps {
  onFinish: () => void;
  onSkip: () => void;
}

type Phase = "dealt" | "explaining";

// Maps each mechanic to the hint shown above the ActionBar before the player has acted.
const INSTRUCTION_KEY: Record<TutorialRoundData["mechanic"], string> = {
  hit: "tutorial.instructionHit",
  stand: "tutorial.instructionStand",
  double: "tutorial.instructionDouble",
  swap: "tutorial.instructionSwap",
};

// Same 500ms flip + buffer classic.tsx's own handleDismissResult waits on before it's safe
// to swap in the next hand's data (by then both cards are fully showing their backs).
const FLIP_DOWN_MS = 650;
// A second, much shorter beat with `cards` genuinely empty for one commit — see why below.
const CLEAR_GAP_MS = 50;

// A single persistent instance for the whole tutorial — never remounted per round (the
// previous version keyed <TutorialRound key={round.id}> and threw the whole subtree away each
// time, which is what read as a fade/jump between rounds). Round transitions now go through
// the exact same choreography classic.tsx's real hand-to-hand transition uses: cards trim
// to 2 and flip face-down in place (isRoundEnding), then `cards` genuinely goes empty for one
// render — not just skipped straight to the next hand's data — because HandCards' own internal
// gating (revealedCount, dealerMountedCount, the dealer-settled ref) only resets when it
// observes cards.length actually hit 0; skipping that step would leave the next round's total
// showing before its cards visibly finish flipping. Only once that's happened does the next
// round's data land, with forceHidden already back to false, so it flips face-up on its own.
// Nothing here ever fades or falls in again after the very first round's entrance.
export default function OnboardingTutorial({ onFinish, onSkip }: OnboardingTutorialProps) {
  const { t } = useTranslation("onboarding");
  const { cardBackUrl } = useSelectedCardBack();

  const [roundIndex, setRoundIndex] = useState(0);
  const round = TUTORIAL_ROUNDS[roundIndex];
  const isLastRound = roundIndex === TUTORIAL_ROUNDS.length - 1;

  const [phase, setPhase] = useState<Phase>("dealt");
  const [playerCards, setPlayerCards] = useState<Card[]>(round.playerStartHand);
  const [dealerCards, setDealerCards] = useState<Card[]>([round.dealerUpCard, round.dealerHoleCard]);
  const [actionTaken, setActionTaken] = useState(false);
  const [revealedHole, setRevealedHole] = useState(false);
  // Mirrors classic.tsx's own isRoundEnding: true for the whole beat between tapping
  // Continue and the next round's cards landing — trims the player's hand back to 2 and flips
  // both hands face-down in place, exactly like a real hand ending.
  const [isRoundEnding, setIsRoundEnding] = useState(false);
  // Player-only, mid-swap card hide — separate from isRoundEnding, which also covers the
  // dealer's hand. Swapping must only ever flip the player's two cards, never the dealer's.
  const [swapFlipping, setSwapFlipping] = useState(false);

  const handleAction = () => {
    if (actionTaken) return;
    setActionTaken(true);
    if ((round.mechanic === "hit" || round.mechanic === "double") && round.hitCard) {
      setPlayerCards([...round.playerStartHand, round.hitCard]);
    }
    // Long enough for the hit/double card's own fall + flip (HandCards gives a card beyond the
    // starting two a 0.4s reveal delay, then PlayingCard's own flip tween) before the dealer's
    // hole card turns — same "my move settles, then the dealer's" pacing the real table uses.
    // A Stand has no card to wait on, just a short beat for pacing.
    window.setTimeout(() => setRevealedHole(true), round.mechanic === "stand" ? 300 : 900);
  };

  const handleSwap = () => {
    if (actionTaken || !round.swapHand) return;
    setActionTaken(true);
    setSwapFlipping(true);
    // Same 550ms as the real Swap (classic.tsx's handleSwap): long enough for both starting
    // cards to actually finish turning face-down before the new hand lands underneath, so the
    // swap never shows the new faces mid-flip.
    window.setTimeout(() => {
      setPlayerCards(round.swapHand!);
      setSwapFlipping(false);
      window.setTimeout(() => setRevealedHole(true), 300);
    }, 550);
  };

  const handleDealerSettled = () => {
    window.setTimeout(() => setPhase("explaining"), 400);
  };

  const handlePopupContinue = () => {
    trackTutorialRoundCompleted(round.id);
    // Closes the popup immediately — its own slide-down exit plays on its own clock, in
    // parallel with (not blocked on) the cards flipping face-down right below it.
    setPhase("dealt");
    setIsRoundEnding(true);
    window.setTimeout(() => {
      if (isLastRound) {
        trackOnboardingCompleted();
        onFinish();
        return;
      }
      setPlayerCards([]);
      setDealerCards([]);
      window.setTimeout(() => {
        const next = TUTORIAL_ROUNDS[roundIndex + 1];
        setRoundIndex((i) => i + 1);
        setPlayerCards(next.playerStartHand);
        setDealerCards([next.dealerUpCard, next.dealerHoleCard]);
        setActionTaken(false);
        setRevealedHole(false);
        setIsRoundEnding(false);
      }, CLEAR_GAP_MS);
    }, FLIP_DOWN_MS);
  };

  return (
    // Same two-block structure as the real Classic-solo table (classic.tsx): the dealer
    // lives in normal top flow, the player's cards + ActionBar are pinned to the true bottom
    // edge in their own absolute block, entirely decoupled from the dealer's own height above.
    <div className="relative h-full w-full text-white overflow-hidden">
      <div
        className="absolute right-6 z-10"
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <SkipLink onSkip={onSkip} />
      </div>

      <div className="max-w-md mx-auto h-full flex flex-col px-5 pt-20">
        <div className="flex justify-center">
          <HandCards
            cards={dealerCards}
            faceDownIndices={revealedHole ? [] : [1]}
            variant="dealer"
            showPositionedTotal
            cardBackUrl={cardBackUrl}
            onDealerHandSettled={handleDealerSettled}
            forceHidden={isRoundEnding}
            skipInitialFall={roundIndex > 0}
            placeholderCount={2}
          />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 max-w-md mx-auto px-5 flex flex-col items-center gap-4"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        <div className="w-full flex justify-center">
          <HandCards
            cards={isRoundEnding ? playerCards.slice(0, 2) : playerCards}
            variant="player"
            showPositionedTotal
            forceHidden={isRoundEnding || swapFlipping}
            skipInitialFall={roundIndex > 0}
            placeholderCount={2}
          />
        </div>

        {/* Fixed height (same 172px as classic.tsx's own action box), not min-height — the
            hint paragraph below is always mounted (opacity-only fade, own height reserved) so
            neither it nor the ActionBar underneath it ever changes this box's size. Nothing
            above the box (the player's cards) has any reason left to move, whatever the
            player does in here. */}
        <div className="w-full h-[172px] flex flex-col justify-center gap-3 relative">
          <p
            className={cn(
              "text-white/60 text-sm text-center transition-opacity duration-150",
              actionTaken ? "opacity-0" : "opacity-100"
            )}
          >
            {t(INSTRUCTION_KEY[round.mechanic])}
          </p>

          <ActionBar
            canHit={!actionTaken && round.mechanic === "hit"}
            canStand={!actionTaken && round.mechanic === "stand"}
            canDouble={!actionTaken && round.mechanic === "double"}
            canSplit={false}
            canSurrender={false}
            onHit={handleAction}
            onStand={handleAction}
            onDouble={handleAction}
            // Swap is always in the row (grayed out except on its own round), same as Double —
            // a real Classic-solo table never shows Double alone in the bottom row, so neither
            // should this. canSwap stays permanently true (classic.tsx does the same) so the
            // slot doesn't unmount the instant it's tapped; swapDisabled is what grays it out
            // everywhere but its own round.
            canSwap
            onSwap={handleSwap}
            swapDisabled={round.mechanic !== "swap" || actionTaken}
          />
        </div>
      </div>

      <TutorialRoundPopup
        open={phase === "explaining"}
        title={t(`tutorial.round${round.id}.title`)}
        body={t(`tutorial.round${round.id}.body`)}
        ctaLabel={t(isLastRound ? `tutorial.round${round.id}.cta` : "common:continue")}
        onContinue={handlePopupContinue}
      />
    </div>
  );
}
