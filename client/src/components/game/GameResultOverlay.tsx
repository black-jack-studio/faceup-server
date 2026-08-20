import { motion, AnimatePresence } from "framer-motion";
import Coin from "@/icons/Coin";
import { useUserStore } from "@/store/user-store";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';

export type GameResultType = "win" | "loss" | "tie" | "blackjack" | null;

interface GameResultOverlayProps {
  show: boolean;
  resultType: GameResultType;
  dealerTotal: number;
  playerTotal: number;
  // Absolute chips amount to display next to the coin icon (already computed by the caller —
  // finalWinnings for a win/blackjack, the returned bet for a push, or the net loss).
  amount: number;
  onDismiss: () => void;
}

const RESULT_CONFIG: Record<
  Exclude<GameResultType, null>,
  {
    text: string;
    gradient: string;
    glow: string;
    borderColor: string;
    sparkles: boolean;
    pulse: [number, number, number];
    duration: number;
    sign: "+" | "-";
    amountColor: string;
  }
> = {
  blackjack: {
    text: "BLACKJACK !",
    gradient: "linear-gradient(90deg, #FFD452, #FF9A3D, #FFD452, #F8CA5A, #FFD452)",
    glow: "drop-shadow(0 0 24px rgba(255, 212, 82, 0.55))",
    borderColor: "border-yellow-400/60",
    sparkles: true,
    pulse: [1, 1.16, 1],
    duration: 0.9,
    sign: "+",
    amountColor: "#34d399",
  },
  win: {
    text: "WIN",
    gradient: "linear-gradient(90deg, #34d399, #6ee7b7, #34d399, #10b981, #34d399)",
    glow: "drop-shadow(0 0 20px rgba(52, 211, 153, 0.5))",
    borderColor: "border-green-400/60",
    sparkles: false,
    pulse: [1, 1.08, 1],
    duration: 1.2,
    sign: "+",
    amountColor: "#34d399",
  },
  tie: {
    text: "PUSH",
    gradient: "linear-gradient(90deg, #d1d5db, #f3f4f6, #d1d5db)",
    glow: "drop-shadow(0 0 12px rgba(209, 213, 219, 0.25))",
    borderColor: "border-white/20",
    sparkles: false,
    pulse: [1, 1, 1],
    duration: 3,
    sign: "+",
    amountColor: "#ffffff",
  },
  loss: {
    text: "LOSE",
    gradient: "linear-gradient(90deg, #f87171, #fca5a5, #f87171, #ef4444, #f87171)",
    glow: "drop-shadow(0 0 14px rgba(248, 113, 113, 0.35))",
    borderColor: "border-red-400/60",
    sparkles: false,
    pulse: [1, 1.03, 1],
    duration: 2.2,
    sign: "-",
    amountColor: "#f87171",
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
  amount,
  onDismiss,
}: GameResultOverlayProps) {
  const user = useUserStore((state) => state.user);
  const currentAvatar = user?.selectedAvatarId ? getAvatarById(user.selectedAvatarId) : getDefaultAvatar();

  if (!resultType) return null;
  const config = RESULT_CONFIG[resultType];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
        >
          <motion.div
            initial={{ scale: 0, rotate: -5 }}
            animate={{
              scale: 1,
              rotate: 0,
              transition: { duration: 0.4, type: "spring", bounce: 0.3 },
            }}
            className={`relative flex flex-col items-center ${config.borderColor} border-4 px-10 py-10 rounded-2xl shadow-xl w-[90vw] max-w-md mx-4 bg-black/40`}
          >
            {config.sparkles &&
              SPARKLE_OFFSETS.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute text-2xl select-none pointer-events-none top-1/3 left-1/2"
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
              className="text-5xl font-black text-center tracking-tight"
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

            {/* Dealer / player totals */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
              className="flex items-center justify-center gap-6 mt-5"
            >
              <div className="flex flex-col items-center gap-1.5">
                <img src={topHatImage} alt="Dealer" className="w-10 h-10 object-contain" />
                <p className="text-white/50 text-xs">Dealer</p>
                <p className="text-white font-bold text-xl">{dealerTotal}</p>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                {currentAvatar ? (
                  <img
                    src={currentAvatar.image}
                    alt={currentAvatar.name}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <span className="text-white font-bold text-2xl">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                )}
                <p className="text-white/50 text-xs">You</p>
                <p className="text-white font-bold text-xl">{playerTotal}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
              className="flex items-center gap-2 mt-5 font-bold text-2xl"
              style={{ color: config.amountColor }}
              data-testid="text-result-amount"
            >
              <span>
                {config.sign}
                {amount.toLocaleString()}
              </span>
              <Coin size={28} glow />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
