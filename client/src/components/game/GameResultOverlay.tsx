import { motion, AnimatePresence } from "framer-motion";
import Coin from "@/icons/Coin";

export type GameResultType = "win" | "loss" | "tie" | "blackjack" | null;

interface GameResultOverlayProps {
  show: boolean;
  resultType: GameResultType;
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
  amount,
  onDismiss,
}: GameResultOverlayProps) {
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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black cursor-pointer"
        >
          <div className="relative flex flex-col items-center">
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

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { delay: 0.25 } }}
              className="flex items-center gap-2 mt-4 font-bold text-2xl"
              style={{ color: config.amountColor }}
              data-testid="text-result-amount"
            >
              <span>
                {config.sign}
                {amount.toLocaleString()}
              </span>
              <Coin size={28} glow />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
