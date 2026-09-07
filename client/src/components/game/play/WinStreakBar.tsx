import { AnimatePresence, motion } from "framer-motion";
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

// Vertical fill bar pinned to the left edge of the table. Only ever on screen for as long as
// the result banner itself is (see the `showResult` prop, fed straight from table-test.tsx's
// own state) — it used to persist across the whole betting screen between hands too, which read
// as always being in the way; now it pops in from the right in step with the result appearing,
// climbs to reflect the just-updated streak, and slides back out to the left the instant the
// result is dismissed (the same beat the cards start flipping face-down again), rather than
// hanging around. On a loss the streak is already 0 by the time this would show, so there's
// nothing to display at all that round — no separate "break" animation needed for that case
// anymore.
export default function WinStreakBar({ streak, showResult }: { streak: number; showResult: boolean }) {
  const visible = showResult && streak > 0;
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
          initial={{ opacity: 0, x: 16, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 22 } }}
          exit={{ opacity: 0, x: -16, scale: 0.85, transition: { duration: 0.25, ease: "easeIn" } }}
        >
          <motion.div
            className="flex flex-col items-center"
            animate={tier ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            <Flame size={26} glow={tier} />
            <span
              className="text-xs font-bold tabular-nums leading-none mt-0.5 text-white"
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
              className="absolute bottom-0 left-0 right-0 rounded-full bg-white"
              style={{ boxShadow: "0 0 10px #ffffff" }}
              // Starts empty every time this mounts (see the component's own comment on why it
              // only ever mounts for the result window now) so the fill genuinely climbs into
              // view instead of popping in already at its target level.
              initial={{ height: "0%" }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
