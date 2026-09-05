import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import Coin from "@/icons/Coin";
import Gem from "@/icons/Gem";
import SwapCoin from "@/icons/SwapCoin";
import OffsuitCard from "@/components/PlayingCard";
import { getAvatarById } from "@/data/avatars";
import { EMOTE_CATALOG } from "@/data/emotes";
import CardBackShardBar from "@/components/CardBackShardBar";
import type { BattlePassChestTier } from "@shared/battlePassChests";
import { playSound, isSoundEnabled } from "@/lib/sound";
import { triggerHapticTick, triggerHapticImpact, triggerHapticSuccess, ImpactStyle } from "@/lib/haptics";

export interface ChestRewardItem {
  kind: "coins" | "gems" | "swapTokens";
  amount: number;
}

export interface ChestRewardCardBack {
  id: string;
  name: string;
  rarity: "COMMON" | "RARE" | "SUPER_RARE" | "LEGENDARY";
  imageUrl: string;
  // Fragment progress (shared/cardBackShards.ts) -- drives whether the reveal below shows
  // "New Card Back!" (isComplete) or a "Card Fragment X/required" count + progress bar.
  shards: number;
  required: number;
  isComplete: boolean;
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
  // Drives the suspense/reveal's whole visual intensity (drumroll duration, shake force, glow
  // color, light rays, confetti density, haptics) -- NOT the won item's own rarity, which stays
  // hidden per the rule below. The chest's tier is already known to the player before they open
  // it (they picked/earned that exact chest), so leaning on it here amplifies information they
  // already have instead of leaking anything new.
  tier: BattlePassChestTier;
  rewards: ChestRewardItem[]; // empty when an item (card back/avatar/emote) was won instead
  cardBack: ChestRewardCardBack | null;
  avatar: ChestRewardAvatar | null;
  emote: ChestRewardEmote | null;
  onDismiss: () => void;
}

// No rarity or item name is ever shown for a won item (card back/avatar/emote) -- just a plain
// "New X!" caption -- so the glow/rays/confetti below are keyed off the chest's tier (see the
// `tier` prop above) rather than a per-item rarity color.
interface TierTheme {
  glow: string;
  suspenseMs: number; // total drumroll duration before the cut -- worse chest, shorter tease
  shakeDeg: number; // suspense wobble amplitude
  shakeScale: number; // suspense pulse amplitude
  rayCount: number; // 0 = no light rays behind the revealed item
  screenShake: boolean; // brief jolt on the whole popup at the reveal cut
  confettiCount: number;
  confettiColors: string[];
  haptic: "tick" | "medium" | "success";
}

const TIER_THEME: Record<BattlePassChestTier, TierTheme> = {
  wood: {
    glow: "rgba(180,140,92,0.5)",
    suspenseMs: 700,
    shakeDeg: 5,
    shakeScale: 0.03,
    rayCount: 0,
    screenShake: false,
    confettiCount: 40,
    confettiColors: ["#C9A171", "#E8C48A", "#8B6B45", "#F0D9AE"],
    haptic: "tick",
  },
  silver: {
    glow: "rgba(203,213,225,0.55)",
    suspenseMs: 950,
    shakeDeg: 6,
    shakeScale: 0.035,
    rayCount: 0,
    screenShake: false,
    confettiCount: 55,
    confettiColors: ["#CBD5E1", "#94A3B8", "#E2E8F0", "#64748B"],
    haptic: "tick",
  },
  gold: {
    glow: "rgba(255,196,84,0.65)",
    suspenseMs: 1200,
    shakeDeg: 7,
    shakeScale: 0.045,
    rayCount: 6,
    screenShake: false,
    confettiCount: 70,
    confettiColors: ["#FFC454", "#facc15", "#f59e0b", "#fde68a"],
    haptic: "medium",
  },
  purple: {
    glow: "rgba(168,85,247,0.65)",
    suspenseMs: 1500,
    shakeDeg: 8,
    shakeScale: 0.055,
    rayCount: 9,
    screenShake: false,
    confettiCount: 85,
    confettiColors: ["#a855f7", "#c084fc", "#e9d5ff", "#FFC454"],
    haptic: "medium",
  },
  crown: {
    glow: "rgba(250,204,21,0.75)",
    suspenseMs: 1900,
    shakeDeg: 10,
    shakeScale: 0.07,
    rayCount: 14,
    screenShake: true,
    confettiCount: 110,
    confettiColors: ["#facc15", "#FFC454", "#f97316", "#fff7cc", "#a855f7"],
    haptic: "success",
  },
};

// Gem parses its own size out of a `w-<n>` Tailwind class (n * 4 = px), unlike Coin/SwapCoin
// which take a plain `size` prop — kept as `w-14` (56px) to match the other two here.
const REWARD_ICON: Record<ChestRewardItem["kind"], (size: number) => React.ReactNode> = {
  coins: (size) => <Coin size={size} glow />,
  gems: () => <Gem className="w-14 h-14" />,
  swapTokens: (size) => <SwapCoin size={size} />,
};

// The last stretch of the drumroll (as a fraction of that tier's suspenseMs) where the chest
// "cracks" -- a brief light-burst tease right before the cut to the reveal, on top of the
// ongoing shake, so the reveal feels earned by an escalating buildup instead of a wobble that
// just stops. Clamped so even wood's short tease still gets a visible crack beat.
const CRACK_FRACTION = 0.22;
const CRACK_MIN_MS = 180;

// Keeps raining confetti for as long as this stays mounted (i.e. until the reveal is
// dismissed) instead of firing a single burst — a lot of pieces, each falling from the top of
// the screen and looping (repeat: Infinity, staggered delays) so new ones keep launching
// continuously rather than everything landing at once. Generated once per mount (useMemo) so
// React doesn't reshuffle trajectories mid-animation.
function ConfettiRain({ count, colors }: { count: number; colors: string[] }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100, // vw %
      drift: (Math.random() - 0.5) * 140,
      rotate: Math.random() * 720 - 360,
      duration: 1.6 + Math.random() * 1.2,
      delay: Math.random() * 1.5,
      repeatDelay: Math.random() * 1.2,
      color: colors[i % colors.length],
      width: 6 + Math.random() * 7,
      height: 10 + Math.random() * 8,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

// Slowly-rotating light rays behind the revealed item, evenly spaced around the center. Pure
// CSS/motion (no art asset) — count and reach scale with the chest's tier via TIER_THEME.
function LightRays({ count, color }: { count: number; color: string }) {
  const rays = useMemo(() => Array.from({ length: count }, (_, i) => (360 / count) * i), [count]);
  return (
    <motion.div
      className="absolute inset-0 -z-20 flex items-center justify-center"
      animate={{ rotate: 360 }}
      transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
    >
      {rays.map((deg) => (
        <div
          key={deg}
          className="absolute"
          style={{
            width: 4,
            height: "140vmax",
            background: `linear-gradient(to bottom, ${color}, transparent 55%)`,
            transform: `rotate(${deg}deg)`,
            transformOrigin: "center top",
            top: "50%",
            opacity: 0.5,
          }}
        />
      ))}
    </motion.div>
  );
}

// One popup used for both the Shop's chest purchases and the Battle Pass's tier claims, so
// opening a chest always feels the same regardless of where it came from. Three beats: a
// "drumroll" tease (chest shaking/pulsing, glow building, intensity scaled by chest tier), a
// brief "crack" flash right before the cut, then the actual reveal (resources popping in with a
// count-up, or -- if an item was won -- a large, deliberately showy flip with a confetti burst,
// light rays and a tier-colored glow).
export default function ChestRewardReveal({ chestImage, tier, rewards, cardBack, avatar, emote, onDismiss }: ChestRewardRevealProps) {
  const { t } = useTranslation("chestRewardReveal");
  const [revealed, setRevealed] = useState(false);
  const [cracking, setCracking] = useState(false);
  const theme = TIER_THEME[tier];
  const crackMs = Math.max(CRACK_MIN_MS, Math.round(theme.suspenseMs * CRACK_FRACTION));

  useEffect(() => {
    const crackTimer = setTimeout(() => {
      setCracking(true);
      if (theme.haptic === "success") triggerHapticImpact(ImpactStyle.Light);
      else triggerHapticTick();
    }, Math.max(0, theme.suspenseMs - crackMs));
    const revealTimer = setTimeout(() => setRevealed(true), theme.suspenseMs);
    return () => {
      clearTimeout(crackTimer);
      clearTimeout(revealTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sound + haptics for the reveal cut itself, once, the instant `revealed` flips true.
  useEffect(() => {
    if (!revealed) return;
    if (isSoundEnabled()) playSound("win");
    if (theme.haptic === "success") triggerHapticSuccess();
    else if (theme.haptic === "medium") triggerHapticImpact(ImpactStyle.Medium);
    else triggerHapticImpact(ImpactStyle.Light);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  // A tap during the drumroll skips straight to the reveal instead of doing nothing -- lets
  // players who are opening many chests back-to-back move at their own pace. Once revealed, the
  // same tap dismisses as before.
  const handleTap = () => {
    if (!revealed) {
      setCracking(false);
      setRevealed(true);
    } else {
      onDismiss();
    }
  };

  // Portaled straight to document.body: the Shop page it's opened from sits inside an
  // ancestor (Router's outer motion.div in App.tsx) that keeps a "parked" transform even at
  // rest, which makes that ancestor the containing block for any `position: fixed` descendant
  // painted inside it -- combined with Shop's own `overflow-hidden` root, that was clipping
  // this popup's confetti short of the real screen bottom instead of it raining down over the
  // bottom nav bar. Rendering here via a portal keeps `fixed` resolving against the true
  // viewport, same as BottomNav itself, so z-[9999] actually wins.
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={theme.screenShake && revealed ? { opacity: 1, x: [0, -6, 6, -4, 4, 0] } : { opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={theme.screenShake && revealed ? { x: { duration: 0.4, ease: "easeOut" } } : undefined}
      onClick={handleTap}
    >
        {/* Sync mode (the default -- no `mode="wait"`) lets the outgoing chest and the incoming
            reward crossfade over each other instead of a hard cut: the chest fades/scales out
            while the reward simultaneously fades/scales in, both over roughly the same ~0.4s. */}
        <AnimatePresence>
          {!revealed ? (
            // Suspense phase: the chest shakes with mounting intensity and pulses a warm glow,
            // like a slot machine reel about to land -- no numbers, no shapes, just tension.
            // Amplitude scales with the chest's tier (TIER_THEME) so a crown chest visibly
            // rattles harder than a wood one before either has shown anything.
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
                  style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }}
                  animate={{
                    opacity: cracking ? [0.8, 1] : [0.3, 0.8, 0.3],
                    scale: cracking ? [1.15, 1.6] : [0.9, 1.15, 0.9],
                  }}
                  transition={{
                    duration: cracking ? crackMs / 1000 : 0.9,
                    repeat: cracking ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* More keyframes over a longer cycle (was 0.35s/5 points) reads as a smooth,
                    fluid wobble instead of a fast, jerky shake at the same visual amplitude. */}
                <motion.img
                  src={chestImage}
                  alt={t("openingChestAlt")}
                  className="relative w-56 h-56 object-contain drop-shadow-2xl"
                  animate={{
                    rotate: [0, -theme.shakeDeg, theme.shakeDeg * 0.85, -theme.shakeDeg * 1.1, theme.shakeDeg, -theme.shakeDeg * 0.7, theme.shakeDeg * 0.6, -theme.shakeDeg * 0.4, 0],
                    scale: [1, 1 + theme.shakeScale * 0.6, 1 + theme.shakeScale * 0.3, 1 + theme.shakeScale, 1 + theme.shakeScale * 0.5, 1 + theme.shakeScale * 0.8, 1 + theme.shakeScale * 0.3, 1 + theme.shakeScale * 0.4, 1],
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
              <ConfettiRain count={theme.confettiCount} colors={theme.confettiColors} />
              <div className="relative flex flex-col items-center gap-5">
                {theme.rayCount > 0 && <LightRays count={theme.rayCount} color={theme.glow} />}
                <motion.div
                  className="absolute inset-0 -z-10 rounded-full blur-3xl"
                  style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }}
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
                {cardBack.isComplete ? (
                  <motion.span
                    className="text-white font-bold text-xl tracking-wide mt-4"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {t("newCardBack")}
                  </motion.span>
                ) : (
                  // Not complete yet -- same card art as always (you always see what you're
                  // pulling toward), just a fragment count instead of "New Card Back!", plus the
                  // same segmented bar as the collection page (card-backs.tsx) animating this
                  // pull's newly-lit segment in.
                  <motion.div
                    className="flex flex-col items-center gap-2 mt-4"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-white font-bold text-xl tracking-wide">
                      {t("cardFragment", { shards: cardBack.shards, required: cardBack.required })}
                    </span>
                    <CardBackShardBar filled={cardBack.shards} total={cardBack.required} animateLatest className="w-32" />
                  </motion.div>
                )}
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
              <ConfettiRain count={theme.confettiCount} colors={theme.confettiColors} />
              <div className="relative flex flex-col items-center gap-5">
                {theme.rayCount > 0 && <LightRays count={theme.rayCount} color={theme.glow} />}
                <motion.div
                  className="absolute inset-0 -z-10 rounded-full blur-3xl"
                  style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }}
                  animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.img
                  src={getAvatarById(avatar.id)?.image}
                  alt={t("newAvatarAlt")}
                  className="w-40 h-40 object-contain drop-shadow-2xl"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                />
                <motion.span
                  className="text-white font-bold text-xl tracking-wide mt-4"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {t("newAvatar")}
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
              <ConfettiRain count={theme.confettiCount} colors={theme.confettiColors} />
              <div className="relative flex flex-col items-center gap-5">
                {theme.rayCount > 0 && <LightRays count={theme.rayCount} color={theme.glow} />}
                <motion.div
                  className="absolute inset-0 -z-10 rounded-full blur-3xl"
                  style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }}
                  animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.img
                  src={EMOTE_CATALOG.find((e) => e.id === emote.id)?.image}
                  alt={t("newEmoteAlt")}
                  className="w-40 h-40 object-contain drop-shadow-2xl"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                />
                <motion.span
                  className="text-white font-bold text-xl tracking-wide mt-4"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {t("newEmote")}
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
              <ConfettiRain count={Math.round(theme.confettiCount * 0.8)} colors={theme.confettiColors} />
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
    </motion.div>,
    document.body
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
