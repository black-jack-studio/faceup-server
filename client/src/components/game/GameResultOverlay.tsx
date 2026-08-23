import { useEffect, useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
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
      {display.toLocaleString()}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
}: GameResultOverlayProps) {
  const user = useUserStore((state) => state.user);
  const currentAvatar = user?.selectedAvatarId ? getAvatarById(user.selectedAvatarId) : getDefaultAvatar();

  if (!resultType) return null;
  const config = RESULT_CONFIG[resultType];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 cursor-pointer"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { type: "spring", damping: 28, stiffness: 300 } }}
            exit={{ y: "100%", transition: { duration: 0.25, ease: "easeIn" } }}
            className="relative w-full max-w-md mx-auto px-7 pt-3 pb-9 rounded-t-[32px] bg-[#0c0c0e] border-t border-white/10 cursor-default"
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
                className="flex items-center justify-center w-14 h-14 rounded-full shrink-0"
                style={{ backgroundColor: config.iconBg, color: config.amountColor }}
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
                  <CountingBalance from={startingBalance} to={endingBalance} active={show} />
                </div>
              </motion.div>
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
