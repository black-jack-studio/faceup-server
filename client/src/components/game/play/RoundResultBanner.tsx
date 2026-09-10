import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { gameService, type HandRewardsSnapshot } from "@/services/gameService";
import { formatFullNumber } from "@/lib/formatUtils";
import { playSound } from "@/lib/sound";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";
import ConfettiBurst from "./ConfettiBurst";
import type { GameResultType } from "../GameResultOverlay";
import { getWinIntensity } from "@/lib/winIntensity";

// Same double-chevron-pointing-up glyph used everywhere else this app represents "XP gained"
// on this screen — deliberately not the lightning bolt GameResultOverlay's bottom sheet uses,
// this result banner has its own, smaller visual language (see classic.tsx's brief).
function XpUpIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 16L12 8L20 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 22L12 14L20 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RankArrowIcon({ up }: { up: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <path
        d={up ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M5 12l7 7 7-7"}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const LABEL_KEY: Record<Exclude<GameResultType, null>, string> = {
  blackjack: "resultOverlay.blackjack",
  win: "resultOverlay.won",
  tie: "resultOverlay.push",
  loss: "resultOverlay.lost",
};

interface RoundResultBannerProps {
  show: boolean;
  resultType: GameResultType;
  // This hand's own net coin change (already includes any streak bonus — see
  // applyClassicStreakBonus server-side), 0 on a push.
  netResultAmount: number;
  // Bonus coins folded into netResultAmount that came specifically from the win streak, if
  // any — drives the small "streak bonus" tag. 0/undefined when no bonus applied.
  streakBonus?: number;
  // This table's own max bet, used to scale the win celebration (confetti count, sound) to how
  // big netResultAmount is relative to THIS table's range — see getWinIntensity. Undefined/0
  // falls back to the smallest tier rather than throwing.
  maxBet?: number;
  // Set once the bottom Watch-to-2X button (classic.tsx, replacing Hit/Stand/Double/Swap
  // for this same stretch) actually lands a double — this banner just needs it to swap its own
  // displayed amount over, not the claiming flow itself, which classic.tsx owns now.
  doubledTo: number | null;
  // True for the span of that same button's in-flight ad/claim — the tap-anywhere-to-dismiss
  // layer below still needs to hold off during it (dismissing mid-flight would tear the result
  // down before an in-flight claim has anywhere left to show its own confirmation).
  isDoubling: boolean;
  // Fires when the player taps anywhere on screen while the result is showing (see the
  // full-screen dim layer below — this deliberately never fires on its own anymore). classic.tsx
  // uses this as the single cue to start flipping the cards back and reopening the bet wheel
  // (see handleDismissResult).
  onDismiss: () => void;
}

// Replaces the old bottom-sheet GameResultOverlay for Classic solo (classic.tsx only —
// Play with Friends/Practice still use GameResultOverlay unchanged): a single line at the
// vertical center of the table, self-dismissing, with a quick confetti burst on a win instead
// of a popup the player has to tap away.
export default function RoundResultBanner({
  show,
  resultType,
  netResultAmount,
  doubledTo,
  isDoubling,
  streakBonus,
  maxBet,
  onDismiss,
}: RoundResultBannerProps) {
  const { t } = useTranslation("gameplay");

  const [rewardsSummary, setRewardsSummary] = useState<{
    xpGained: number;
    challengesCompleted: number;
    rank: number | null;
    rankDelta: number;
  } | null>(null);
  // Which of the two challenge/rank slides is showing in the shared single-line slot below the
  // result (see the AnimatePresence block near the bottom) — 0 is challenge-complete, 1 is rank.
  // Only ever advances past 0 when both are actually present; see the effect below.
  const [summarySlide, setSummarySlide] = useState<0 | 1>(0);
  const baselineRef = useRef<HandRewardsSnapshot | null>(null);

  useEffect(() => {
    gameService.getHandRewardsSnapshot().then((snapshot) => {
      if (!baselineRef.current) baselineRef.current = snapshot;
    });
  }, []);

  useEffect(() => {
    if (show) {
      setRewardsSummary(null);
      setSummarySlide(0);
    }
  }, [show]);

  useEffect(() => {
    if (!show || !resultType) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      gameService.getHandRewardsSnapshot().then((after) => {
        if (cancelled) return;
        const baseline = baselineRef.current;
        const xpGained = baseline ? Math.max(0, after.xp - baseline.xp) : 0;
        const challengesCompleted = baseline
          ? after.completedChallengeIds.filter((id) => !baseline.completedChallengeIds.includes(id)).length
          : 0;
        const rankDelta = baseline?.rank != null && after.rank != null ? baseline.rank - after.rank : 0;
        setRewardsSummary({ xpGained, challengesCompleted, rank: after.rank, rankDelta });
        baselineRef.current = after;
      });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [show, resultType]);

  // Only when both a challenge and a rank change are actually present does this line have
  // anything to rotate through — hold on the challenge slide for a beat, then hand off to rank.
  // Single-item cases render immediately below and never touch summarySlide at all.
  useEffect(() => {
    if (!rewardsSummary?.challengesCompleted) return;
    if (rewardsSummary.rank == null || rewardsSummary.rankDelta === 0) return;
    const timer = setTimeout(() => setSummarySlide(1), 1400);
    return () => clearTimeout(timer);
  }, [rewardsSummary]);

  // Only meaningful on an actual win — a loss/push has no amount to scale a celebration to, so
  // this stays at the smallest tier for them (its confetti/sound go unused there anyway, see
  // isWin below).
  const intensity = getWinIntensity(netResultAmount, maxBet ?? 0);

  useEffect(() => {
    if (!show || !resultType) return;
    if (resultType === "win" || resultType === "blackjack") {
      playSound("win", { playbackRate: intensity.soundPlaybackRate, volumeBoost: intensity.soundVolumeBoost });
    }
    else if (resultType === "loss") playSound("lose");
    else if (resultType === "tie") playSound("push");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, resultType]);

  const xpGained = rewardsSummary?.xpGained ?? 0;
  const hasRewardsRowContent = xpGained > 0;

  if (!resultType) return null;
  const displayedAmount = doubledTo ?? netResultAmount;
  const amountText = `${displayedAmount > 0 ? "+" : ""}${formatFullNumber(displayedAmount)}`;

  return (
    <>
      {/* The "tap anywhere to continue" hit target — invisible, not this component's job to
          darken the table (see ResultDimOverlay, a root-level sibling in classic.tsx: this
          column has no stacking context of its own, so a z-index set on a deeply-nested child
          here doesn't reliably out-rank root-level siblings like the player's cards block, which
          is exactly what left them undimmed the first time this shipped). isDoubling comes in
          as a prop now (classic.tsx owns the Watch-to-2X button itself, rendered at the
          bottom in ActionBar's own spot) — dismissing mid-flight would tear the result down
          before an in-flight double-reward claim has anywhere left to show its own confirmation,
          and a stray tap during that (normally brief, ad-UI-covered) window should just be
          swallowed rather than closing the result. Plain conditional, no exit animation: there's
          nothing to visually animate, and once `show` flips false the dismissal has already
          happened, so there's no more reason for taps here to do anything. */}
      {show && (
        <div
          className="absolute inset-0 z-[25]"
          onClick={() => {
            if (!isDoubling) onDismiss();
          }}
          data-testid="button-dismiss-result"
        />
      )}
      <AnimatePresence>
        {show && (
          <motion.div
          key="round-result"
          // In normal flow (relative, not absolute/fixed) — the caller mounts this right after
          // the dealer's own total, in the one stretch of that column that's otherwise always
          // empty (see classic.tsx's own comment there). Used to be centered over the whole
          // screen instead, which landed it squarely on top of the player's cards — illegible,
          // and worse the bigger those cards got. relative (not static) only so ConfettiBurst's
          // own absolute inset-0 anchors to this box instead of the page. z-30 keeps this whole
          // block above both the tap hit target right above (z-25) and ResultDimOverlay's own
          // visual dim in classic.tsx (z-26) — the bottom Watch-to-2X button matches this
          // same z-30 itself now, for the same reason (see classic.tsx's own comment there).
          className="relative z-30 w-full flex flex-col items-center pt-2 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
        >
          <ConfettiBurst
            active={resultType === "win" || resultType === "blackjack"}
            // Blackjack keeps its own extra flourish on top of the amount-scaled tier, same as
            // before this scaled by amount at all.
            count={resultType === "blackjack" ? intensity.confettiCount + 8 : intensity.confettiCount}
          />

          <motion.div
            className="relative w-full flex flex-col items-center pointer-events-auto"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 24 } }}
          >
          {/* This row alone is what classic.tsx's own wrapper vertically centers (it's the
              only thing left in this whole tree's normal flow — everything else below is
              `absolute`, see the next div, a SIBLING of this one rather than nested inside it so
              it gets this wrapper's own full width to center/wrap its own row in, not just
              however wide the label+amount happen to be) — so it holds still the instant it
              mounts and never again. Before this, the rewards row/rank line sat right underneath
              it in normal flow too, each one popping in at its own later moment (both wait on the
              same async fetch) — that was a height change on the block classic.tsx centers, so
              the label+amount visibly hopped upward once they appeared. */}
          <div className="flex items-center justify-center gap-2.5">
            <span className="text-xl font-bold text-white" data-testid="text-result-label">
              {t(LABEL_KEY[resultType])}
            </span>
            <span className="text-white text-xl font-light tabular-nums" data-testid="text-result-amount">
              {amountText}
            </span>

            {!!streakBonus && (
              <span
                className="text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap"
                style={{ backgroundColor: "rgba(255,212,82,0.16)", color: "#FFD452" }}
              >
                🔥 +{formatFullNumber(streakBonus)}
              </span>
            )}
          </div>

          <div className="absolute top-full left-0 right-0 pt-1.5 flex flex-col items-center gap-2 pointer-events-auto">
          {!!rewardsSummary && hasRewardsRowContent && (
          <motion.div
            key="rewards-row"
            className="flex items-center justify-center gap-2.5 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25 } }}
            exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
          >
            {xpGained > 0 && (
              <span className="flex items-center gap-1 text-white" data-testid="text-xp-gained">
                <XpUpIcon />
                <span className="text-xl font-light tabular-nums">+{xpGained}</span>
              </span>
            )}
          </motion.div>
          )}

          {(() => {
            const hasChallenge = !!rewardsSummary?.challengesCompleted;
            // Only when the rank actually moved this hand — a rank sitting still isn't worth a
            // line on the result banner, only a climb or a drop is.
            const hasRankChange = rewardsSummary?.rank != null && rewardsSummary.rankDelta !== 0;
            if (!hasChallenge && !hasRankChange) return null;

            // A rank change only waits for its turn on summarySlide when there's a challenge
            // slide ahead of it to wait behind — with no challenge this hand, it shows straight
            // away instead of sitting on an empty slot until a timer that'll never matter fires.
            const showChallenge = hasChallenge && summarySlide === 0;
            const showRank = hasRankChange && (summarySlide === 1 || !hasChallenge);

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.35 } }}
                // Fixed-height, overflow-hidden single slot: challenge and rank share this one
                // line and take turns in it (see summarySlide) rather than sitting side by side,
                // so the banner's footprint stays just as narrow whether one or both are present.
                className="relative h-4 flex items-center justify-center overflow-hidden pointer-events-none"
              >
                <AnimatePresence mode="popLayout">
                  {showChallenge && (
                    <motion.div
                      key="challenge"
                      className="absolute flex items-center gap-1.5"
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      data-testid="text-challenge-complete"
                    >
                      <span className="text-emerald-400">
                        <CheckIcon />
                      </span>
                      <span className="text-white/70 text-xs font-semibold whitespace-nowrap">
                        {t("resultOverlay.challengeComplete", { count: rewardsSummary!.challengesCompleted })}
                      </span>
                    </motion.div>
                  )}
                  {showRank && (
                    <motion.div
                      key="rank"
                      className="absolute flex items-center gap-1.5"
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      data-testid="text-leaderboard-rank"
                    >
                      <img src={trophyIcon} alt={t("resultOverlay.leaderboard")} className="w-4 h-4 object-contain" />
                      <span className="text-white/70 text-xs font-semibold">#{rewardsSummary!.rank}</span>
                      <span
                        className="flex items-center gap-0.5 text-[10px] font-bold"
                        style={{ color: rewardsSummary!.rankDelta > 0 ? "#34d399" : "#f87171" }}
                      >
                        <RankArrowIcon up={rewardsSummary!.rankDelta > 0} />
                        {/* Positive rankDelta means the rank NUMBER dropped (baseline.rank -
                            after.rank > 0), i.e. climbed the leaderboard — that's a gain, so it
                            reads "+2" (places gained), not "-2". */}
                        {rewardsSummary!.rankDelta > 0 ? "+" : "-"}
                        {Math.abs(rewardsSummary!.rankDelta)}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })()}
          </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
