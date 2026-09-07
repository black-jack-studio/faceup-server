import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { MovingBorder } from "@/components/ui/moving-border";
import { useUserStore } from "@/store/user-store";
import { showRewardedAd } from "@/lib/admob";
import { gameService, type HandRewardsSnapshot } from "@/services/gameService";
import { formatFullNumber } from "@/lib/formatUtils";
import { playSound } from "@/lib/sound";
import WatchAdIcon from "@/components/icons/WatchAdIcon";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";
import ConfettiBurst from "./ConfettiBurst";
import type { GameResultType } from "../GameResultOverlay";

// Same double-chevron-pointing-up glyph used everywhere else this app represents "XP gained"
// on this screen — deliberately not the lightning bolt GameResultOverlay's bottom sheet uses,
// this result banner has its own, smaller visual language (see table-test.tsx's brief).
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

function AnimatedCheckBadge({ size = 36 }: { size?: number }) {
  return (
    <motion.div
      className="rounded-full bg-emerald-400 flex items-center justify-center"
      style={{ width: size, height: size }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M5 13l4 4L19 7"
          stroke="#0B0B10"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
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
  gameId?: string | null;
  // Fires once the banner is done showing itself — either the ~1.7s auto-dismiss, or a beat
  // after a double-reward claim resolves. table-test.tsx uses this as the single cue to start
  // flipping the cards back and reopening the bet wheel (see handleDismissResult).
  onDismiss: () => void;
}

// Replaces the old bottom-sheet GameResultOverlay for Classic solo (table-test.tsx only —
// Play with Friends/Practice still use GameResultOverlay unchanged): a single line at the
// vertical center of the table, self-dismissing, with a quick confetti burst on a win instead
// of a popup the player has to tap away.
export default function RoundResultBanner({
  show,
  resultType,
  netResultAmount,
  streakBonus,
  gameId,
  onDismiss,
}: RoundResultBannerProps) {
  const { t } = useTranslation("gameplay");
  const queryClient = useQueryClient();

  const [doubledTo, setDoubledTo] = useState<number | null>(null);
  const [isDoubling, setIsDoubling] = useState(false);

  const [rewardsSummary, setRewardsSummary] = useState<{
    xpGained: number;
    challengesCompleted: number;
    rank: number | null;
    rankDelta: number;
  } | null>(null);
  const baselineRef = useRef<HandRewardsSnapshot | null>(null);

  useEffect(() => {
    gameService.getHandRewardsSnapshot().then((snapshot) => {
      if (!baselineRef.current) baselineRef.current = snapshot;
    });
  }, []);

  useEffect(() => {
    if (show) {
      setDoubledTo(null);
      setIsDoubling(false);
      setRewardsSummary(null);
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

  useEffect(() => {
    if (!show || !resultType) return;
    if (resultType === "win" || resultType === "blackjack") playSound("win");
    else if (resultType === "loss") playSound("lose");
    else if (resultType === "tie") playSound("push");
  }, [show, resultType]);

  const canOfferDouble = !!gameId && (resultType === "win" || resultType === "blackjack") && netResultAmount > 0;

  const { data: doubleRewardStatus, refetch: refetchDoubleRewardStatus } = useQuery({
    queryKey: ["/api/game/double-reward/status"],
    queryFn: () => gameService.getDoubleRewardStatus(),
    enabled: show && canOfferDouble,
  });
  const watchedToday = doubleRewardStatus?.watchedToday ?? 0;
  const dailyLimit = doubleRewardStatus?.limit ?? 3;
  const dailyLimitReached = watchedToday >= dailyLimit;

  // table-test.tsx doesn't memoize handleDismissResult, so a fresh function identity arrives
  // on every one of its renders — reading `onDismiss` straight from the pending setTimeout's
  // own closure below risks firing a stale one if a render happened to land in between (same
  // class of bug table-test.tsx's own revealResultRef already exists to avoid). Keeping the
  // latest one in a ref, reassigned synchronously on every render, sidesteps that entirely
  // without making the timer effects below re-arm on every unrelated re-render.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Auto-dismiss ~1.7s after showing — long enough to actually tap the double-reward button —
  // but suspended for as long as an ad is in flight or was just claimed (see the effect right
  // below this one), so a slow ad load never gets cut off mid-flow.
  useEffect(() => {
    if (!show || isDoubling || doubledTo !== null) return;
    const timer = setTimeout(() => onDismissRef.current(), 1700);
    return () => clearTimeout(timer);
  }, [show, isDoubling, doubledTo]);

  // Once a double claim resolves, give the player a beat to actually see the doubled number
  // before dismissing — rather than continuing whatever was left of the original 1.7s.
  useEffect(() => {
    if (doubledTo === null) return;
    const timer = setTimeout(() => onDismissRef.current(), 1200);
    return () => clearTimeout(timer);
  }, [doubledTo]);

  const handleWatchAdToDouble = async () => {
    if (!gameId || isDoubling || doubledTo !== null || dailyLimitReached) return;
    setIsDoubling(true);
    try {
      const earned = await showRewardedAd();
      if (!earned) return;
      const { newNetResult } = await gameService.doubleReward(gameId);
      setDoubledTo(newNetResult);
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/weekly-xp"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/weekly-xp/me"] });
      refetchDoubleRewardStatus();
      useUserStore.getState().loadUser();
    } catch (error) {
      console.error("Failed to double reward:", error);
    } finally {
      setIsDoubling(false);
    }
  };

  if (!resultType) return null;
  const displayedAmount = doubledTo ?? netResultAmount;
  const amountText = `${displayedAmount > 0 ? "+" : ""}${formatFullNumber(displayedAmount)}`;
  const xpGained = rewardsSummary?.xpGained ?? 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="round-result"
          // absolute (+ max-w-md mx-auto to match the rest of the table's own column), not
          // fixed — see WinStreakBar's identical comment for why `fixed` doesn't reliably mean
          // "pinned to the viewport" inside this page's own ancestor chain.
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-40 max-w-md mx-auto flex flex-col items-center gap-2 px-6 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
        >
          <ConfettiBurst
            active={resultType === "win" || resultType === "blackjack"}
            count={resultType === "blackjack" ? 22 : 12}
          />

          <motion.div
            className="relative flex items-center justify-center gap-2.5 flex-wrap pointer-events-auto"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 24 } }}
          >
            <span className="text-white text-xl font-bold" data-testid="text-result-label">
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

            {canOfferDouble && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 } }}
                onClick={handleWatchAdToDouble}
                disabled={isDoubling || doubledTo !== null || dailyLimitReached}
                className="relative shrink-0 rounded-full p-[1.5px] overflow-hidden disabled:opacity-70"
                data-testid="button-double-reward"
              >
                {doubledTo === null && !isDoubling && !dailyLimitReached && (
                  <span className="absolute inset-0 rounded-full">
                    <MovingBorder duration={2200} rx="30%" ry="50%">
                      <div className="h-8 w-8 bg-[radial-gradient(#34d399_40%,transparent_70%)] opacity-90" />
                    </MovingBorder>
                  </span>
                )}
                {doubledTo !== null ? (
                  <span className="relative flex items-center justify-center h-9 w-9">
                    <AnimatedCheckBadge size={30} />
                  </span>
                ) : (
                  <span
                    className="relative flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full text-[12px] font-bold whitespace-nowrap"
                    style={{ backgroundColor: "#17171b", color: dailyLimitReached ? "rgba(255,255,255,0.35)" : "#34d399" }}
                  >
                    {isDoubling ? (
                      <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : dailyLimitReached ? (
                      t("resultOverlay.watchToDouble")
                    ) : (
                      <>
                        <WatchAdIcon />
                        {t("resultOverlay.watchToDouble")}
                      </>
                    )}
                  </span>
                )}
              </motion.button>
            )}

            {xpGained > 0 && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.25 } }}
                className="flex items-center gap-1 text-white"
                data-testid="text-xp-gained"
              >
                <XpUpIcon />
                <span className="text-xl font-light tabular-nums">+{xpGained}</span>
              </motion.span>
            )}
          </motion.div>

          {(!!rewardsSummary?.challengesCompleted || rewardsSummary?.rank != null) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.35 } }}
              className="flex items-center gap-4 pointer-events-none"
            >
              {!!rewardsSummary?.challengesCompleted && (
                <div className="flex items-center gap-1.5" data-testid="text-challenge-complete">
                  <span className="text-emerald-400">
                    <CheckIcon />
                  </span>
                  <span className="text-white/70 text-xs font-semibold whitespace-nowrap">
                    {t("resultOverlay.challengeComplete", { count: rewardsSummary.challengesCompleted })}
                  </span>
                </div>
              )}

              {rewardsSummary?.rank != null && (
                <div className="flex items-center gap-1.5" data-testid="text-leaderboard-rank">
                  <img src={trophyIcon} alt={t("resultOverlay.leaderboard")} className="w-4 h-4 object-contain" />
                  <span className="text-white/70 text-xs font-semibold">#{rewardsSummary.rank}</span>
                  {rewardsSummary.rankDelta !== 0 && (
                    <span
                      className="flex items-center gap-0.5 text-[10px] font-bold"
                      style={{ color: rewardsSummary.rankDelta > 0 ? "#34d399" : "#f87171" }}
                    >
                      <RankArrowIcon up={rewardsSummary.rankDelta > 0} />
                      {rewardsSummary.rankDelta > 0 ? "-" : "+"}
                      {Math.abs(rewardsSummary.rankDelta)}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
