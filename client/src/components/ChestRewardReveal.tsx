import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Coin from "@/icons/Coin";
import Gem from "@/icons/Gem";
import SwapCoin from "@/icons/SwapCoin";
import Sparkle from "@/icons/Sparkle";
import OffsuitCard from "@/components/PlayingCard";

export interface ChestRewardItem {
  kind: "coins" | "gems" | "swapTokens";
  amount: number;
}

export interface ChestRewardCardBack {
  id: string;
  name: string;
  rarity: "COMMON" | "RARE" | "SUPER_RARE" | "LEGENDARY";
  imageUrl: string;
}

interface ChestRewardRevealProps {
  chestImage: string;
  rewards: ChestRewardItem[]; // empty when a card back was won instead
  cardBack: ChestRewardCardBack | null;
  onDismiss: () => void;
}

// Gem parses its own size out of a `w-<n>` Tailwind class (n * 4 = px), unlike Coin/SwapCoin
// which take a plain `size` prop — kept as `w-14` (56px) to match the other two here.
const REWARD_ICON: Record<ChestRewardItem["kind"], (size: number) => React.ReactNode> = {
  coins: (size) => <Coin size={size} glow />,
  gems: () => <Gem className="w-14 h-14" />,
  swapTokens: (size) => <SwapCoin size={size} />,
};

const RARITY_GLOW: Record<ChestRewardCardBack["rarity"], string> = {
  COMMON: "rgba(160,160,170,0.55)",
  RARE: "rgba(56,189,248,0.6)",
  SUPER_RARE: "rgba(168,85,247,0.65)",
  LEGENDARY: "rgba(250,204,21,0.7)",
};

const RARITY_LABEL: Record<ChestRewardCardBack["rarity"], string> = {
  COMMON: "Common",
  RARE: "Rare",
  SUPER_RARE: "Super Rare",
  LEGENDARY: "Legendary",
};

// How long the "drumroll" suspense phase holds before the actual reward is revealed. Long
// enough to feel like a real tease (the chest visibly shaking/pulsing, cycling through what it
// *might* be) without the popup feeling stuck.
const SUSPENSE_DURATION_MS = 1400;

const CONFETTI_COLORS = ["#FFC454", "#38bdf8", "#a855f7", "#facc15", "#f472b6", "#4ade80"];

// Fired once when the reveal phase starts: a burst of small colored squares flung outward from
// the center and fading out as they fall, plus a slower/wider layer of sparkle icons drifting
// up. Generated once per mount (useMemo) so React doesn't reshuffle trajectories mid-animation.
function ConfettiBurst({ big }: { big: boolean }) {
  const pieces = useMemo(() => {
    const count = big ? 36 : 20;
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 90 + Math.random() * (big ? 160 : 110);
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20,
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.15,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      };
    });
  }, [big]);

  const sparkles = useMemo(() => {
    const count = big ? 10 : 6;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * (big ? 260 : 180),
      y: (Math.random() - 0.5) * (big ? 220 : 160),
      delay: 0.1 + Math.random() * 0.5,
      scale: 0.6 + Math.random() * 0.8,
    }));
  }, [big]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-sm"
          style={{ backgroundColor: p.color, width: p.size, height: p.size * 0.6 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y + 60, opacity: 0, rotate: p.rotate }}
          transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
        />
      ))}
      {sparkles.map((s) => (
        <motion.div
          key={`sparkle-${s.id}`}
          className="absolute text-white"
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: s.scale }}
          transition={{ duration: 1.3, delay: s.delay, ease: "easeOut" }}
        >
          <Sparkle className="w-5 h-5" />
        </motion.div>
      ))}
    </div>
  );
}

// One popup used for both the Shop's chest purchases and the Battle Pass's tier claims, so
// opening a chest always feels the same regardless of where it came from. Two phases: a
// "drumroll" tease (chest shaking/pulsing, glow building) followed by the actual reveal
// (resources popping in with a count-up, or -- if a card was won -- a large, deliberately
// showy card flip with a confetti burst and rarity-colored glow).
export default function ChestRewardReveal({ chestImage, rewards, cardBack, onDismiss }: ChestRewardRevealProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), SUSPENSE_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => revealed && onDismiss()}
    >
      <AnimatePresence mode="wait">
        {!revealed ? (
          // Suspense phase: the chest shakes with mounting intensity and pulses a warm glow,
          // like a slot machine reel about to land -- no numbers, no shapes, just tension.
          <motion.div
            key="suspense"
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.15 } }}
          >
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(255,196,84,0.45), transparent 70%)" }}
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.15, 0.9] }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src={chestImage}
              alt="Opening chest..."
              className="relative w-40 h-40 object-contain drop-shadow-2xl"
              animate={{
                rotate: [-6, 6, -8, 8, -5, 5, 0],
                scale: [1, 1.05, 1, 1.08, 1, 1.12, 1.2],
              }}
              transition={{ duration: SUSPENSE_DURATION_MS / 1000, ease: "easeInOut" }}
            />
            <motion.div
              className="mt-6 text-white/70 text-sm font-medium tracking-wide"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              Opening…
            </motion.div>
          </motion.div>
        ) : cardBack ? (
          // Card reveal: shown big and centered, nothing else on screen -- per the rule that a
          // card dose is the chest's entire reward, it gets the entire spotlight too.
          <motion.div
            key="card"
            className="relative flex flex-col items-center gap-5"
            initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <ConfettiBurst big />
            <motion.div
              className="absolute inset-0 -z-10 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${RARITY_GLOW[cardBack.rarity]}, transparent 70%)` }}
              animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              style={{ transform: "scale(1.7)" }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            >
              <OffsuitCard rank="A" suit="spades" faceDown size="lg" cardBackUrl={cardBack.imageUrl} />
            </motion.div>
            <motion.div
              className="flex flex-col items-center gap-1 mt-4"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-white font-bold text-2xl text-center px-6">{cardBack.name}</span>
              <span
                className="text-sm font-semibold tracking-wide px-3 py-1 rounded-full"
                style={{ backgroundColor: RARITY_GLOW[cardBack.rarity], color: "#0a0a0a" }}
              >
                {RARITY_LABEL[cardBack.rarity]}
              </span>
            </motion.div>
          </motion.div>
        ) : (
          // Resource reveal: 1 or 2 chips, same treatment as before (spring pop-in + count-up),
          // just with a lighter confetti burst behind them now.
          <motion.div
            key="resources"
            className="relative flex items-center gap-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <ConfettiBurst big={false} />
            {rewards.map((reward, i) => (
              <motion.div
                key={reward.kind}
                className="flex items-center gap-2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.15 + i * 0.15 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: "reverse", delay: i * 0.2 }}
                >
                  {REWARD_ICON[reward.kind](56)}
                </motion.div>
                <span className="text-4xl font-light tracking-tight text-white tabular-nums">
                  +<CountUpNumber value={reward.amount} />
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Animates 0 -> value once on mount (easeOutCubic), then holds.
function CountUpNumber({ value, duration = 650 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
}
