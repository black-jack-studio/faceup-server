import { useEffect, useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { MovingBorder } from "@/components/ui/moving-border";
import { useUserStore } from "@/store/user-store";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { showRewardedAd } from "@/lib/admob";
import { gameService } from "@/services/gameService";
import { formatFullNumber } from "@/lib/formatUtils";
import { playSound } from "@/lib/sound";
import WatchAdIcon from "@/components/icons/WatchAdIcon";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';

export type GameResultType = "win" | "loss" | "tie" | "blackjack" | null;

interface GameResultOverlayProps {
  show: boolean;
  resultType: GameResultType;
  dealerTotal: number;
  playerTotal: number;
  // The sheet counts from one of these to the other, showing this hand's own net change (0 ->
  // +200, 0 -> -1900, ...) rather than the player's whole account balance — counting through a
  // large real balance for a small bet used to read as having lost/won far more than was ever
  // actually at stake. Every caller passes 0 as startingBalance and the signed net result
  // (payout minus stake) as endingBalance.
  startingBalance: number;
  endingBalance: number;
  onDismiss: () => void;
  // The persisted hand this result came from (Classic solo — see pages/play/game.tsx) or the
  // table it came from (Play with Friends — see pages/play/friends-lobby.tsx). Either one lets
  // the sheet offer "watch an ad to double your win" for a win/blackjack; both are omitted by
  // Practice, which never shows the offer. At most one of the two is ever passed.
  gameId?: string | null;
  tableId?: string | null;
}

// Counts from `from` to `to` once `active` becomes true, resetting to `from` otherwise so
// the next result animates from a clean slate instead of continuing off the last value.
// A win prefixes "+" explicitly (toLocaleString only ever adds "-" on its own for a loss),
// so a win and a loss read symmetrically: "+200" next to "-1,900", not "200" next to "-1,900".
function CountingBalance({
  from,
  to,
  active,
}: {
  from: number;
  to: number;
  active: boolean;
}) {
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    if (!active) {
      setDisplay(from);
      return;
    }
    const controls = animate(from, to, {
      duration: 1,
      delay: 0.3,
      ease: "easeOut",
      onUpdate: (value) => setDisplay(Math.round(value)),
    });
    return () => controls.stop();
  }, [active, from, to]);

  return (
    <span>
      {display > 0 ? "+" : ""}
      {formatFullNumber(display)}
    </span>
  );
}

// Ticking "HH:MM:SS" until `resetAt`, for the button's grey countdown label once today's 3
// double-reward ads are used up — recomputes every second rather than once, so it counts
// down live instead of showing a value frozen at fetch time.
function useCountdown(resetAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!resetAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [resetAt]);

  if (!resetAt) return null;
  const remainingMs = Math.max(0, new Date(resetAt).getTime() - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function CheckIcon({ size = 26 }: { size?: number } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Replaces the old "2x applied" pill+label once the double-reward offer is claimed — just a
// checkmark that draws itself into a green circle, no text needed at that point since the
// button's own state (spinner -> this) already tells the story.
function AnimatedCheckBadge({ size = 40 }: { size?: number }) {
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

function CrossIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EqualsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M4.5 9h15M4.5 15h15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" />
    </svg>
  );
}

const RESULT_CONFIG: Record<
  Exclude<GameResultType, null>,
  {
    label: string;
    amountColor: string;
    iconBg: string;
    icon: () => JSX.Element;
    sparkles: boolean;
  }
> = {
  blackjack: {
    label: "Blackjack !",
    amountColor: "#FFD452",
    iconBg: "rgba(255, 212, 82, 0.16)",
    icon: BoltIcon,
    sparkles: true,
  },
  win: {
    label: "You won",
    amountColor: "#34d399",
    iconBg: "rgba(52, 211, 153, 0.14)",
    icon: CheckIcon,
    sparkles: false,
  },
  tie: {
    label: "Push",
    amountColor: "#e5e7eb",
    iconBg: "rgba(255, 255, 255, 0.08)",
    icon: EqualsIcon,
    sparkles: false,
  },
  loss: {
    label: "You lost",
    amountColor: "#f87171",
    iconBg: "rgba(248, 113, 113, 0.14)",
    icon: CrossIcon,
    sparkles: false,
  },
};

const SPARKLE_OFFSETS = [
  { x: -80, y: -20, delay: 0 },
  { x: 80, y: -30, delay: 0.15 },
  { x: -50, y: -55, delay: 0.3 },
  { x: 55, y: -60, delay: 0.1 },
  { x: 0, y: -70, delay: 0.25 },
];

export default function GameResultOverlay({
  show,
  resultType,
  dealerTotal,
  playerTotal,
  startingBalance,
  endingBalance,
  onDismiss,
  gameId,
  tableId,
}: GameResultOverlayProps) {
  const user = useUserStore((state) => state.user);
  const currentAvatar = user?.selectedAvatarId ? getAvatarById(user.selectedAvatarId) : getDefaultAvatar();
  const queryClient = useQueryClient();

  // Set once the ad-to-double offer has been claimed, so the counted amount bumps from the
  // original result up to its doubled value instead of restarting the count from zero.
  const [doubledTo, setDoubledTo] = useState<number | null>(null);
  const [isDoubling, setIsDoubling] = useState(false);

  // Fresh result sheet, fresh offer — without this a double claimed on the previous hand
  // would still show as claimed on the next one (the component never unmounts between hands).
  useEffect(() => {
    if (show) {
      setDoubledTo(null);
      setIsDoubling(false);
    }
  }, [show]);

  // One overlay instance, shown across every mode (Classic, Cash, Practice, Play with
  // Friends) — the single spot that knows a hand just settled, regardless of which action
  // path (local engine or server sync) got it there.
  useEffect(() => {
    if (!show || !resultType) return;
    if (resultType === "win" || resultType === "blackjack") playSound("win");
    else if (resultType === "loss") playSound("lose");
    else if (resultType === "tie") playSound("push");
  }, [show, resultType]);

  // Only a win/blackjack has anything worth doubling, and only Classic solo (gameId) or Play
  // with Friends (tableId) offer it at all — Practice passes neither.
  const canOfferDouble =
    (!!gameId || !!tableId) && (resultType === "win" || resultType === "blackjack") && endingBalance > 0;

  // Server-authoritative "n/3 watched today" — re-fetched on every result sheet so a claim
  // made from a previous hand (or a previous app session) is already reflected here.
  const { data: doubleRewardStatus, refetch: refetchDoubleRewardStatus } = useQuery({
    queryKey: ["/api/game/double-reward/status"],
    queryFn: () => gameService.getDoubleRewardStatus(),
    enabled: show && canOfferDouble,
  });
  const watchedToday = doubleRewardStatus?.watchedToday ?? 0;
  const dailyLimit = doubleRewardStatus?.limit ?? 3;
  const dailyLimitReached = watchedToday >= dailyLimit;
  const resetCountdown = useCountdown(dailyLimitReached ? doubleRewardStatus?.resetAt ?? null : null);

  if (!resultType) return null;
  const config = RESULT_CONFIG[resultType];
  const Icon = config.icon;

  const handleWatchAdToDouble = async () => {
    if ((!gameId && !tableId) || isDoubling || doubledTo !== null || dailyLimitReached) return;
    setIsDoubling(true);
    try {
      const earned = await showRewardedAd();
      if (!earned) return;
      const { newNetResult } = gameId
        ? await gameService.doubleReward(gameId)
        : await gameService.doubleTableReward(tableId!);
      setDoubledTo(newNetResult);
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/coins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard/weekly-xp'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard/weekly-xp/me'] });
      if (tableId) queryClient.invalidateQueries({ queryKey: [`/api/tables/${tableId}`] });
      refetchDoubleRewardStatus();
      useUserStore.getState().loadUser();
    } catch (error) {
      console.error("Failed to double reward:", error);
    } finally {
      setIsDoubling(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          // Deliberately slower than the sheet's own 0.25s slide-down (below): the table
          // underneath swaps from the settled hand to the fresh face-down placeholders the
          // instant this is dismissed (see table-test.tsx's dealer/player AnimatePresence
          // blocks), and that swap needs to finish while this backdrop still has some darkness
          // left to mask it — otherwise the swap's own brief "nothing on screen" beat gets
          // exposed in full light instead of staying hidden behind a dimmed table.
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 cursor-pointer"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { type: "spring", damping: 28, stiffness: 300 } }}
            exit={{ y: "100%", transition: { duration: 0.25, ease: "easeIn" } }}
            className="relative w-full max-w-md mx-auto px-7 pt-3 pb-9 rounded-t-[32px] bg-[#232328] border-t border-white/10 cursor-default"
          >
            <div className="w-9 h-1 rounded-full bg-white/15 mx-auto mb-7" />

            {config.sparkles &&
              SPARKLE_OFFSETS.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute text-xl select-none pointer-events-none top-12 left-1/2"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: s.x,
                    y: s.y,
                    scale: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1.6,
                    delay: s.delay,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                  }}
                >
                  ✨
                </motion.span>
              ))}

            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { delay: 0.1, type: "spring", bounce: 0.5 } }}
                className="flex items-center justify-center w-14 h-14 shrink-0"
                style={{ color: config.amountColor }}
              >
                <Icon />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.15 } }}
                className="flex flex-col"
              >
                <span className="text-white/50 text-sm font-medium">{config.label}</span>
                <div
                  className="text-4xl leading-none font-light tracking-tight"
                  style={{ color: config.amountColor }}
                  data-testid="text-result-amount"
                >
                  <CountingBalance
                    from={doubledTo === null ? startingBalance : endingBalance}
                    to={doubledTo === null ? endingBalance : doubledTo}
                    active={show}
                  />
                </div>
              </motion.div>

              {canOfferDouble && (
                <div className="ml-auto flex flex-col items-center gap-1.5 shrink-0">
                  <span
                    className="text-[11px] font-semibold tabular-nums"
                    style={{ color: dailyLimitReached ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.5)" }}
                    data-testid="text-double-reward-count"
                  >
                    {Math.max(dailyLimit - watchedToday, 0)}/{dailyLimit}
                  </span>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1, transition: { delay: 0.3 } }}
                    onClick={handleWatchAdToDouble}
                    disabled={isDoubling || doubledTo !== null || dailyLimitReached}
                    className="relative shrink-0 rounded-full p-[1.5px] overflow-hidden disabled:opacity-70"
                    data-testid="button-double-reward"
                  >
                    {/* The rotating green glow (Aceternity's "moving border" technique: an SVG
                        path traced by a small radial-gradient dot, masked down to a thin ring by
                        the solid pill sitting on top of it) only runs while the offer is still
                        live — once claimed, mid-ad, or out of daily plays there's nothing left
                        to draw attention to. */}
                    {doubledTo === null && !isDoubling && !dailyLimitReached && (
                      <span className="absolute inset-0 rounded-full">
                        <MovingBorder duration={2200} rx="30%" ry="50%">
                          <div className="h-9 w-9 bg-[radial-gradient(#34d399_40%,transparent_70%)] opacity-90" />
                        </MovingBorder>
                      </span>
                    )}
                    {doubledTo !== null ? (
                      <span className="relative flex items-center justify-center h-10 w-10">
                        <AnimatedCheckBadge size={32} />
                      </span>
                    ) : (
                      <span
                        className="relative flex items-center gap-1.5 h-10 pl-3 pr-4 rounded-full text-[13px] font-bold whitespace-nowrap"
                        style={{
                          backgroundColor: "#17171b",
                          color: dailyLimitReached ? "rgba(255,255,255,0.35)" : "#34d399",
                        }}
                      >
                        {isDoubling ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : dailyLimitReached ? (
                          // Out of plays for today — the button itself becomes the countdown
                          // to the next Paris midnight, in place of the play icon + label.
                          <span className="tabular-nums">{resetCountdown ?? "--:--:--"}</span>
                        ) : (
                          <>
                            <WatchAdIcon />
                            Watch to 2X
                          </>
                        )}
                      </span>
                    )}
                  </motion.button>
                </div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.25 } }}
              className="flex items-center justify-between mt-7 pt-5 border-t border-white/[0.07]"
              data-testid="text-game-result"
            >
              <div className="flex items-center gap-2">
                <img src={topHatImage} alt="Dealer" className="w-6 h-6 object-contain" />
                <span className="text-white font-bold text-sm">{dealerTotal}</span>
              </div>

              <div className="flex items-center gap-2">
                {currentAvatar ? (
                  <img
                    src={currentAvatar.image}
                    alt={currentAvatar.name}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-white font-bold text-sm">{playerTotal}</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
