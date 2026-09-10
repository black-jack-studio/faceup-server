import { motion } from "framer-motion";
import Flame from "@/icons/Flame";

// Mirrors STREAK_BONUS_TIERS in server/routes.ts — display only, the server is the one that
// actually decides how many bonus coins/XP a streak earns. Ordered low-to-high (opposite of the
// server's own array, which checks highest-first) since this side needs to walk up through them
// to find how far into the *current* segment the bar should fill. Kept deliberately tight (max
// tier at 5) — real per-hand win rate is ~45%, so a pure win streak this long is already a rare
// event; anything much higher would basically never be reached (see the brief this came from).
const TIERS = [2, 3, 5];
const MAX_STREAK_FOR_BAR = TIERS[TIERS.length - 1];

function hasReachedATier(streak: number) {
  return TIERS.some((t) => streak >= t);
}

// The next tier's own threshold, not yet reached — undefined once maxed (nothing left to climb
// toward). Used to size the fill *within the current stretch* rather than across the whole bar,
// so e.g. going 1 -> 2 wins (reaching the first tier) visibly fills the bar, instead of barely
// nudging it the way a fixed streak/MAX_STREAK ratio would.
function nextTierThreshold(streak: number): number | undefined {
  return TIERS.find((t) => streak < t);
}

// Horizontal fill bar, inline (not absolutely positioned) — meant to sit in RoundResultBanner's
// own second-row slot, taking over that centered spot once it fades the Watch-x2/XP row out (see
// RoundResultBanner's own sequencing). Mount/unmount and its fade in/out are entirely the
// caller's responsibility (its own AnimatePresence) — this component just renders the bar itself
// for whatever streak it's given.
export default function WinStreakBar({ streak }: { streak: number }) {
  const tier = hasReachedATier(streak);
  const maxed = streak >= MAX_STREAK_FOR_BAR;
  // streak / (threshold of the next tier not yet reached) — e.g. at streak 2 with tier 2 sitting
  // at 3 wins, that's 2/3 full: close, not just "one tick up" from a flat streak/5. This can dip
  // by a few points right at the instant a new tier is reached (the next threshold jumping
  // further away can outpace the streak that just got there) — accepted on purpose, since the
  // flame's own pulse already draws the eye at that exact moment.
  const nextThreshold = nextTierThreshold(streak);
  const fillPercent = maxed ? 100 : nextThreshold ? Math.min(100, (streak / nextThreshold) * 100) : 100;

  return (
    <div className="flex items-center justify-center gap-2.5">
      <motion.div
        className="flex items-center gap-1.5 shrink-0"
        animate={tier ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.4 }}
      >
        <Flame size={22} glow={tier} />
        <span
          className="text-xs font-bold tabular-nums leading-none text-white"
          data-testid="text-win-streak"
        >
          {streak}
        </span>
      </motion.div>

      <div
        className="relative w-[140px] h-[7px] rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
      >
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-full bg-white"
          style={{ boxShadow: "0 0 10px #ffffff" }}
          // Starts empty every time this mounts (matching the old vertical bar's own behavior) so
          // the fill genuinely climbs into view instead of popping in already at its target level.
          initial={{ width: "0%" }}
          animate={{
            width: `${fillPercent}%`,
            opacity: maxed ? [1, 0.6, 1] : 1,
          }}
          transition={{
            width: { type: "spring", stiffness: 200, damping: 26 },
            opacity: maxed ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 },
          }}
        />
      </div>
    </div>
  );
}
