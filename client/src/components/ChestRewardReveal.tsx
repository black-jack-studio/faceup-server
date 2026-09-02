import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Coin from "@/icons/Coin";
import Gem from "@/icons/Gem";
import SwapCoin from "@/icons/SwapCoin";
import OffsuitCard from "@/components/PlayingCard";
import { getAvatarById } from "@/data/avatars";
import { EMOTE_CATALOG } from "@/data/emotes";

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

export interface ChestRewardAvatar {
  id: string;
  name: string;
}

export interface ChestRewardEmote {
  id: string;
  name: string;
}

interface ChestRewardRevealProps {
  chestImage: string;
  rewards: ChestRewardItem[]; // empty when an item (card back/avatar/emote) was won instead
  cardBack: ChestRewardCardBack | null;
  avatar: ChestRewardAvatar | null;
  emote: ChestRewardEmote | null;
  onDismiss: () => void;
}

// No rarity or item name is ever shown for a won item (card back/avatar/emote) — just a plain
// "New X!" caption, so they all share this one flat warm glow instead of a per-rarity color.
const ITEM_GLOW = "rgba(255,196,84,0.65)";

// Gem parses its own size out of a `w-<n>` Tailwind class (n * 4 = px), unlike Coin/SwapCoin
// which take a plain `size` prop — kept as `w-14` (56px) to match the other two here.
const REWARD_ICON: Record<ChestRewardItem["kind"], (size: number) => React.ReactNode> = {
  coins: (size) => <Coin size={size} glow />,
  gems: () => <Gem className="w-14 h-14" />,
  swapTokens: (size) => <SwapCoin size={size} />,
};

// How long the "drumroll" suspense phase holds before the actual reward is revealed. Long
// enough to feel like a real tease (the chest visibly shaking/pulsing, cycling through what it
// *might* be) without the popup feeling stuck.
const SUSPENSE_DURATION_MS = 1400;

const CONFETTI_COLORS = ["#FFC454", "#38bdf8", "#a855f7", "#facc15", "#f472b6", "#4ade80"];

// Keeps raining confetti for as long as this stays mounted (i.e. until the reveal is
// dismissed) instead of firing a single burst — a lot of pieces, each falling from the top of
// the screen and looping (repeat: Infinity, staggered delays) so new ones keep launching
// continuously rather than everything landing at once. Generated once per mount (useMemo) so
// React doesn't reshuffle trajectories mid-animation.
function ConfettiRain({ count = 70 }: { count?: number }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // vw %
      drift: (Math.random() - 0.5) * 140,
      rotate: Math.random() * 720 - 360,
      duration: 1.6 + Math.random() * 1.2,
      delay: Math.random() * 1.5,
      repeatDelay: Math.random() * 1.2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      width: 6 + Math.random() * 7,
      height: 10 + Math.random() * 8,
    }));
  }, [count]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{ left: `${p.left}%`, backgroundColor: p.color, width: p.width, height: p.height }}
          initial={{ y: "-10vh", x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: "110vh", x: p.drift, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: p.repeatDelay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// One popup used for both the Shop's chest purchases and the Battle Pass's tier claims, so
// opening a chest always feels the same regardless of where it came from. Two phases: a
// "drumroll" tease (chest shaking/pulsing, glow building) followed by the actual reveal
// (resources popping in with a count-up, or -- if a card was won -- a large, deliberately
// showy card flip with a confetti burst and rarity-colored glow).
export default function ChestRewardReveal({ chestImage, rewards, cardBack, avatar, emote, onDismiss }: ChestRewardRevealProps) {
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
      {/* Sync mode (the default -- no `mode="wait"`) lets the outgoing chest and the incoming
          reward crossfade over each other instead of a hard cut: the chest fades/scales out
          while the reward simultaneously fades/scales in, both over roughly the same ~0.4s. */}
      <AnimatePresence>
        {!revealed ? (
          // Suspense phase: the chest shakes with mounting intensity and pulses a warm glow,
          // like a slot machine reel about to land -- no numbers, no shapes, just tension.
          <motion.div
            key="suspense"
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.4, ease: "easeOut" } }}
          >
            <div className="relative flex flex-col items-center">
              <motion.div
                className="absolute inset-0 rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(255,196,84,0.45), transparent 70%)" }}
                animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* More keyframes over a longer cycle (was 0.35s/5 points) reads as a smooth,
                  fluid wobble instead of a fast, jerky shake at the same visual amplitude. */}
              <motion.img
                src={chestImage}
                alt="Opening chest..."
                className="relative w-56 h-56 object-contain drop-shadow-2xl"
                animate={{
                  rotate: [0, -7, 6, -8, 7, -5, 4, -3, 0],
                  scale: [1, 1.04, 1.02, 1.06, 1.03, 1.05, 1.02, 1.03, 1],
                }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        ) : cardBack ? (
          // Card reveal: shown big and centered, nothing else on screen -- per the rule that a
          // card dose is the chest's entire reward, it gets the entire spotlight too.
          <motion.div
            key="card"
            className="absolute inset-0 flex flex-col items-center justify-center gap-5"
            initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <ConfettiRain count={90} />
            <div className="relative flex flex-col items-center gap-5">
              <motion.div
                className="absolute inset-0 -z-10 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle, ${ITEM_GLOW}, transparent 70%)` }}
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
              <motion.span
                className="text-sm font-semibold tracking-wide px-3 py-1 rounded-full mt-4"
                style={{ backgroundColor: ITEM_GLOW, color: "#0a0a0a" }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                New Card Back!
              </motion.span>
            </div>
          </motion.div>
        ) : avatar ? (
          // Avatar reveal: same big-and-centered treatment as a card, just a plain image
          // instead of the card-back component (avatars have no rarity of their own).
          <motion.div
            key="avatar"
            className="absolute inset-0 flex flex-col items-center justify-center gap-5"
            initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <ConfettiRain count={90} />
            <div className="relative flex flex-col items-center gap-5">
              <motion.div
                className="absolute inset-0 -z-10 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle, ${ITEM_GLOW}, transparent 70%)` }}
                animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img
                src={getAvatarById(avatar.id)?.image}
                alt="New avatar"
                className="w-40 h-40 object-contain drop-shadow-2xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
              <motion.span
                className="text-sm font-semibold tracking-wide px-3 py-1 rounded-full mt-4"
                style={{ backgroundColor: ITEM_GLOW, color: "#0a0a0a" }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                New Avatar!
              </motion.span>
            </div>
          </motion.div>
        ) : emote ? (
          // Emote reveal: same treatment as avatar.
          <motion.div
            key="emote"
            className="absolute inset-0 flex flex-col items-center justify-center gap-5"
            initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <ConfettiRain count={90} />
            <div className="relative flex flex-col items-center gap-5">
              <motion.div
                className="absolute inset-0 -z-10 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle, ${ITEM_GLOW}, transparent 70%)` }}
                animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img
                src={EMOTE_CATALOG.find((e) => e.id === emote.id)?.image}
                alt="New emote"
                className="w-40 h-40 object-contain drop-shadow-2xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
              <motion.span
                className="text-sm font-semibold tracking-wide px-3 py-1 rounded-full mt-4"
                style={{ backgroundColor: ITEM_GLOW, color: "#0a0a0a" }}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                New Emote!
              </motion.span>
            </div>
          </motion.div>
        ) : (
          // Resource reveal: 1 or 2 chips, same treatment as before (spring pop-in + count-up),
          // just with a lighter confetti burst behind them now.
          <motion.div
            key="resources"
            className="absolute inset-0 flex items-center justify-center gap-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <ConfettiRain count={70} />
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
