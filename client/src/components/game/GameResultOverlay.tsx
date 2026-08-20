import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';

export type GameResultType = "win" | "loss" | "tie" | "blackjack" | null;

interface GameResultOverlayProps {
  show: boolean;
  resultType: GameResultType;
  dealerTotal: number;
  playerTotal: number;
  // Signed net profit/loss for this hand — 0 for a push (bet is just returned, no gain/loss).
  netDelta: number;
  // Exact chips line to display (handles the surrender / push-returns-bet edge cases).
  chipsLabel: string;
  onContinue: () => void;
  onMenu: () => void;
}

const RESULT_CONFIG: Record<
  Exclude<GameResultType, null>,
  {
    text: string;
    gradient: string;
    glow: string;
    sparkles: boolean;
    pulse: [number, number, number];
    duration: number;
  }
> = {
  blackjack: {
    text: "BLACKJACK !",
    gradient: "linear-gradient(90deg, #FFD452, #FF9A3D, #FFD452, #F8CA5A, #FFD452)",
    glow: "drop-shadow(0 0 24px rgba(255, 212, 82, 0.55))",
    sparkles: true,
    pulse: [1, 1.16, 1],
    duration: 0.9,
  },
  win: {
    text: "WIN",
    gradient: "linear-gradient(90deg, #34d399, #6ee7b7, #34d399, #10b981, #34d399)",
    glow: "drop-shadow(0 0 20px rgba(52, 211, 153, 0.5))",
    sparkles: false,
    pulse: [1, 1.08, 1],
    duration: 1.2,
  },
  tie: {
    text: "PUSH",
    gradient: "linear-gradient(90deg, #d1d5db, #f3f4f6, #d1d5db)",
    glow: "drop-shadow(0 0 12px rgba(209, 213, 219, 0.25))",
    sparkles: false,
    pulse: [1, 1, 1],
    duration: 3,
  },
  loss: {
    text: "LOSE",
    gradient: "linear-gradient(90deg, #f87171, #fca5a5, #f87171, #ef4444, #f87171)",
    glow: "drop-shadow(0 0 14px rgba(248, 113, 113, 0.35))",
    sparkles: false,
    pulse: [1, 1.03, 1],
    duration: 2.2,
  },
};

const SPARKLE_OFFSETS = [
  { x: -90, y: -40, delay: 0 },
  { x: 90, y: -55, delay: 0.15 },
  { x: -60, y: 50, delay: 0.3 },
  { x: 70, y: 55, delay: 0.1 },
  { x: 0, y: -80, delay: 0.25 },
];

export default function GameResultOverlay({
  show,
  resultType,
  dealerTotal,
  playerTotal,
  netDelta,
  chipsLabel,
  onContinue,
  onMenu,
}: GameResultOverlayProps) {
  const user = useUserStore((state) => state.user);
  const balance = user?.coins ?? 0;
  const currentAvatar = user?.selectedAvatarId ? getAvatarById(user.selectedAvatarId) : getDefaultAvatar();

  if (!resultType) return null;
  const config = RESULT_CONFIG[resultType];

  const balanceColor =
    netDelta > 0 ? "#34d399" : netDelta < 0 ? "#f87171" : "#ffffff";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-black"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Result headline */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
            {config.sparkles &&
              SPARKLE_OFFSETS.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute text-2xl select-none pointer-events-none"
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

            <motion.h1
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: config.pulse,
                opacity: 1,
                transition: {
                  scale: {
                    duration: config.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                  opacity: { duration: 0.4 },
                },
              }}
              className="text-6xl font-black text-center tracking-tight"
              style={{
                backgroundImage: config.gradient,
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: config.glow,
              }}
              data-testid="text-game-result"
            >
              {config.text}
            </motion.h1>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { delay: 0.25 } }}
              className="text-lg mt-4"
            >
              {chipsLabel}
            </motion.p>

            <motion.div
              key={balance}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-2 font-bold text-2xl"
              style={{ color: balanceColor }}
              data-testid="text-total-balance"
            >
              {balance.toLocaleString()} chips
            </motion.div>
          </div>

          {/* Dealer / player scores */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
            className="flex items-center justify-between px-6 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[#13151A] ring-1 ring-white/10 flex items-center justify-center">
                <img src={topHatImage} alt="Dealer" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Dealer</p>
                <p className="text-white font-bold text-xl">{dealerTotal}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <p className="text-white/50 text-xs text-right">You</p>
                <p className="text-white font-bold text-xl text-right">{playerTotal}</p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-[#13151A] ring-1 ring-white/10 flex items-center justify-center overflow-hidden">
                {currentAvatar ? (
                  <img
                    src={currentAvatar.image}
                    alt={currentAvatar.name}
                    className="w-9 h-9 object-contain"
                  />
                ) : (
                  <span className="text-white font-bold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
            className="flex items-center gap-3 px-6"
            style={{ paddingBottom: "1.5rem" }}
          >
            <button
              onClick={onMenu}
              className="flex-1 py-4 rounded-2xl bg-white/10 text-white/80 font-semibold text-base active:scale-95 transition-transform"
              data-testid="button-back-to-menu"
            >
              Menu
            </button>
            <button
              onClick={onContinue}
              className="flex-[2] py-4 rounded-2xl bg-[#F8CA5A] text-black font-bold text-base active:scale-95 transition-transform"
              data-testid="button-continue"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
