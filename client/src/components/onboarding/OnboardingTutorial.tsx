import { useState } from "react";
import { useTranslation } from "react-i18next";
import HandCards from "@/components/game/play/HandCards";
import ActionBar from "@/components/game/play/ActionBar";
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

// Three scripted, fully local rounds — deliberately not the real game store/BlackjackEngine
// (practice mode there is dead code, and cash mode is server-authoritative real-money logic).
// Reuses only the shared visual primitives (HandCards/ActionBar) so it looks identical to a
// real hand without touching any real game logic, stats, XP, or coins.
export default function OnboardingTutorial({ onFinish, onSkip }: OnboardingTutorialProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const round = TUTORIAL_ROUNDS[roundIndex];

  const handleRoundComplete = () => {
    trackTutorialRoundCompleted(round.id);
    if (roundIndex < TUTORIAL_ROUNDS.length - 1) {
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
    <TutorialRound key={round.id} round={round} onComplete={handleRoundComplete} onSkip={onSkip} />
  );
}

type Phase = "dealt" | "explaining";

function TutorialRound({
  round,
  onComplete,
  onSkip,
}: {
  round: TutorialRoundData;
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

  const handleAction = () => {
    if (actionTaken) return;
    setActionTaken(true);
    if (round.allowedAction === "hit" && round.hitCard) {
      setPlayerCards([...round.playerStartHand, round.hitCard]);
    }
    // Long enough for the hit card's own fall + flip (HandCards gives a card beyond the
    // starting two a 0.4s reveal delay, then PlayingCard's own flip tween) before the dealer's
    // hole card turns — same "my move settles, then the dealer's" pacing the real table uses.
    // A Stand has no card to wait on, just a short beat for pacing.
    window.setTimeout(() => setRevealedHole(true), round.allowedAction === "hit" ? 900 : 300);
  };

  const handleDealerSettled = () => {
    window.setTimeout(() => setPhase("explaining"), 400);
  };

  const handlePopupContinue = () => {
    setForceHidden(true);
    window.setTimeout(onComplete, 350);
  };

  return (
    <div className="relative h-full flex flex-col text-white">
      <div
        className="absolute right-6 z-10"
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <SkipLink onSkip={onSkip} />
      </div>

      <div className="flex-1 flex flex-col justify-between pt-20 pb-8 px-4 min-h-0">
        <HandCards
          cards={[round.dealerUpCard, round.dealerHoleCard]}
          faceDownIndices={revealedHole ? [] : [1]}
          variant="dealer"
          showPositionedTotal
          cardBackUrl={cardBackUrl}
          onDealerHandSettled={handleDealerSettled}
          forceHidden={forceHidden}
        />

        <div className="flex flex-col items-center gap-6">
          <HandCards cards={playerCards} variant="player" showPositionedTotal forceHidden={forceHidden} />

          {!actionTaken && (
            <p className="text-white/60 text-sm text-center">
              {t(round.allowedAction === "hit" ? "tutorial.instructionHit" : "tutorial.instructionStand")}
            </p>
          )}

          <ActionBar
            canHit={!actionTaken && round.allowedAction === "hit"}
            canStand={!actionTaken && round.allowedAction === "stand"}
            canDouble={false}
            canSplit={false}
            canSurrender={false}
            onHit={handleAction}
            onStand={handleAction}
          />
        </div>
      </div>

      <TutorialRoundPopup
        open={phase === "explaining"}
        title={t(`tutorial.round${round.id}.title`)}
        body={t(`tutorial.round${round.id}.body`)}
        ctaLabel={t(round.id === 3 ? "tutorial.round3.cta" : "common:continue")}
        onContinue={handlePopupContinue}
      />
    </div>
  );
}
