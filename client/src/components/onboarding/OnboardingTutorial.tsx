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

// Five scripted, fully local rounds — deliberately not the real game store/BlackjackEngine
// (practice mode there is dead code, and cash mode is server-authoritative real-money logic).
// Reuses only the shared visual primitives (HandCards/ActionBar) so it looks identical to a
// real hand without touching any real game logic, stats, XP, or coins.
export default function OnboardingTutorial({ onFinish, onSkip }: OnboardingTutorialProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const round = TUTORIAL_ROUNDS[roundIndex];
  const isLastRound = roundIndex === TUTORIAL_ROUNDS.length - 1;

  const handleRoundComplete = () => {
    trackTutorialRoundCompleted(round.id);
    if (!isLastRound) {
      setRoundIndex((i) => i + 1);
    } else {
      trackOnboardingCompleted();
      onFinish();
    }
  };

  return (
    // Keying on round.id forces a full remount per round: HandCards keys its cards by
    // position (not identity), so swapping one round's data into an already-mounted instance
    // would silently relabel the old cards in place instead of playing a fresh deal animation.
    // A clean remount is what gets the real "cards fall in and flip" entrance every round.
    <TutorialRound
      key={round.id}
      round={round}
      isLastRound={isLastRound}
      onComplete={handleRoundComplete}
      onSkip={onSkip}
    />
  );
}

type Phase = "dealt" | "explaining";

// Maps each mechanic to the hint shown above the ActionBar before the player has acted.
const INSTRUCTION_KEY: Record<TutorialRoundData["mechanic"], string> = {
  hit: "tutorial.instructionHit",
  stand: "tutorial.instructionStand",
  double: "tutorial.instructionDouble",
  swap: "tutorial.instructionSwap",
};

function TutorialRound({
  round,
  isLastRound,
  onComplete,
  onSkip,
}: {
  round: TutorialRoundData;
  isLastRound: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation("onboarding");
  const { cardBackUrl } = useSelectedCardBack();
  const [phase, setPhase] = useState<Phase>("dealt");
  const [playerCards, setPlayerCards] = useState<Card[]>(round.playerStartHand);
  const [actionTaken, setActionTaken] = useState(false);
  const [revealedHole, setRevealedHole] = useState(false);
  const [forceHidden, setForceHidden] = useState(false);
  // Player-only, mid-swap card hide — separate from forceHidden above, which is the whole
  // round's own hide-out-on-completion transition and also covers the dealer's hand. Swapping
  // must only ever flip the player's two cards face-down and back, never the dealer's.
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
    // Same 550ms as the real Swap (table-test.tsx's handleSwap): long enough for both starting
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
    setForceHidden(true);
    window.setTimeout(onComplete, 350);
  };

  return (
    // Same two-block structure as the real Classic-solo table (table-test.tsx): the dealer
    // lives in normal top flow, the player's cards + ActionBar are pinned to the true bottom
    // edge in their own absolute block, entirely decoupled from the dealer's own height above.
    // The previous version put both in one `justify-between` column, so the instruction hint
    // paragraph disappearing the instant a button was tapped shrank that column's bottom child
    // just as its own hit card was falling in — reflowing (and visibly shifting) the whole
    // player block at the exact same moment, read as "the cards move when I hit".
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
            cards={[round.dealerUpCard, round.dealerHoleCard]}
            faceDownIndices={revealedHole ? [] : [1]}
            variant="dealer"
            showPositionedTotal
            cardBackUrl={cardBackUrl}
            onDealerHandSettled={handleDealerSettled}
            forceHidden={forceHidden}
          />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 max-w-md mx-auto px-5 flex flex-col items-center gap-4"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        <div className="w-full flex justify-center">
          <HandCards
            cards={playerCards}
            variant="player"
            showPositionedTotal
            forceHidden={forceHidden || swapFlipping}
          />
        </div>

        {/* Fixed height (same 172px as table-test.tsx's own action box), not min-height — the
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
            // Swap is now always in the row (grayed out except on its own round), same as
            // Double — a real Classic-solo table never shows Double alone in the bottom row,
            // so neither should this. canSwap stays permanently true (table-test.tsx does the
            // same) so the slot doesn't unmount the instant it's tapped; swapDisabled is what
            // grays it out everywhere but its own round.
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
