import { AnimatePresence, motion } from "framer-motion";
import Flame from "@/icons/Flame";

// Mirrors STREAK_BONUS_TIERS in server/routes.ts — display only, the server is the one that
// actually decides how many bonus coins/XP a streak earns. Ordered low-to-high (opposite of the
// server's own array, which checks highest-first) since this side needs to walk up through them
// to find how far into the *current* segment the bar should fill. Kept deliberately tight (max
// tier at 5) — real per-hand win rate is ~45%, so a pure win streak this long is already a rare
// event; anything much higher would basically never be reached (see the brief this came from).
const TIERS = [
  { at: 2, percent: 25, color: "#34d399" }, // emerald — first bonus unlocked
  { at: 3, percent: 50, color: "#60a5fa" }, // blue
  { at: 5, percent: 100, color: "#FFD452" }, // gold — maxed, pulses instead of climbing further
];
const MAX_STREAK_FOR_BAR = TIERS[TIERS.length - 1].at;

function currentTier(streak: number) {
  let tier: (typeof TIERS)[number] | null = null;
  for (const t of TIERS) {
    if (streak >= t.at) tier = t;
  }
  return tier;
}

// The next tier's own threshold, not yet reached — undefined once maxed (nothing left to climb
// toward). Used to size the fill *within the current stretch* rather than across the whole bar,
// so e.g. going 1 -> 2 wins (reaching the first tier) visibly fills the bar, instead of barely
// nudging it the way a fixed streak/MAX_STREAK ratio would.
function nextTierThreshold(streak: number): number | undefined {
  for (const t of TIERS) {
    if (streak < t.at) return t.at;
  }
  return undefined;
}

// Vertical fill bar pinned to the left edge of the table — appears the instant a win-streak
// starts (streak >= 1), fills toward each bonus tier, and breaks away the moment a loss zeroes
// it out. Purely presentational: table-test.tsx just feeds it the live streak count (from
// useGameStore's lastStreak, falling back to the user's own persisted currentStreakClassic).
export default function WinStreakBar({ streak }: { streak: number }) {
  const visible = streak > 0;
  const tier = currentTier(streak);
  const maxed = streak >= MAX_STREAK_FOR_BAR;
  // streak / (threshold of the next tier not yet reached) — e.g. at streak 2 with tier 2 sitting
  // at 3 wins, that's 2/3 full: close, not just "one tick up" from a flat streak/5. This can dip
  // by a few points right at the instant a new tier is reached (the next threshold jumping
  // further away can outpace the streak that just got there) — accepted on purpose, since the
  // tier-crossing flash/color-change below already draws the eye at that exact moment.
  const nextThreshold = nextTierThreshold(streak);
  const fillPercent = maxed ? 100 : nextThreshold ? Math.min(100, (streak / nextThreshold) * 100) : 100;
  const color = tier?.color ?? "#e5e7eb";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="streak-bar"
          // absolute, not fixed — this whole page is rendered as a plain descendant inside an
          // ancestor that's the one actually pinned to the viewport (Home's sliding overlay, or
          // .fixed-safe-screen on the standalone route — see table-test.tsx's own root comment),
          // and that ancestor's own slide animation runs on a CSS transform, which would hijack
          // `fixed` positioning into being relative to it instead of the true viewport. Every
          // other absolutely-placed piece of this table (the player controls block, etc.)
          // already follows this same rule.
          className="absolute left-2 top-[32%] z-20 flex flex-col items-center gap-2 pointer-events-none"
          initial={{ opacity: 0, x: -16, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 22 } }}
          // The "break" — a quick downward drop + fade rather than a plain fade, so losing the
          // streak reads as something falling away, not just quietly disappearing.
          exit={{ opacity: 0, y: 18, scale: 0.85, transition: { duration: 0.25, ease: "easeIn" } }}
        >
          <motion.div
            className="flex flex-col items-center"
            animate={tier ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.4 }}
            key={`flame-${tier?.at ?? 0}`}
          >
            <Flame size={26} glow={!!tier} />
            <span
              className="text-xs font-bold tabular-nums leading-none mt-0.5"
              style={{ color: tier ? color : "#ffffff" }}
              data-testid="text-win-streak"
            >
              {streak}
            </span>
          </motion.div>

          <div
            className="relative w-[7px] h-[140px] rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
              animate={{
                height: `${fillPercent}%`,
                opacity: maxed ? [1, 0.6, 1] : 1,
              }}
              transition={{
                height: { type: "spring", stiffness: 200, damping: 26 },
                opacity: maxed ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 },
              }}
            />
          </div>

          {/* Just "+N%" — a fuller "Streak bonus +N%" label used to be wider than the bar/flame
              above it, and since all three share one centered column, that width pushed the
              whole thing away from the left edge it's supposed to stay pinned to. Short enough
              now that it can't do that regardless of how the column sizes itself. */}
          {tier && (
            <motion.span
              key={`pct-${tier.percent}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[11px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap"
              style={{ backgroundColor: "#17171b", color }}
              data-testid="text-win-streak-bonus"
            >
              +{tier.percent}%
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
