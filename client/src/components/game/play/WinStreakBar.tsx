import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Flame from "@/icons/Flame";

// Mirrors STREAK_BONUS_TIERS in server/routes.ts — display only, the server is the one that
// actually decides how many bonus coins/XP a streak earns. Ordered low-to-high (opposite of the
// server's own array, which checks highest-first) since this side needs to walk up through them
// to find how far into the *current* segment the bar should fill.
const TIERS = [
  { at: 3, percent: 50, color: "#34d399" }, // emerald — first bonus unlocked
  { at: 5, percent: 75, color: "#60a5fa" }, // blue
  { at: 7, percent: 100, color: "#FFD452" }, // gold — maxed, pulses instead of climbing further
];
const MAX_STREAK_FOR_BAR = TIERS[TIERS.length - 1].at;

function currentTier(streak: number) {
  let tier: (typeof TIERS)[number] | null = null;
  for (const t of TIERS) {
    if (streak >= t.at) tier = t;
  }
  return tier;
}

// Vertical fill bar pinned to the left edge of the table — appears the instant a win-streak
// starts (streak >= 1), fills toward each bonus tier, and breaks away the moment a loss zeroes
// it out. Purely presentational: table-test.tsx just feeds it the live streak count (from
// useGameStore's lastStreak, falling back to the user's own persisted currentStreakClassic).
export default function WinStreakBar({ streak }: { streak: number }) {
  const { t } = useTranslation("gameplay");
  const visible = streak > 0;
  const tier = currentTier(streak);
  const maxed = streak >= MAX_STREAK_FOR_BAR;
  const fillPercent = Math.min(100, (streak / MAX_STREAK_FOR_BAR) * 100);
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

          {tier && (
            <motion.span
              key={`pct-${tier.percent}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[11px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap"
              style={{ backgroundColor: "#17171b", color }}
              data-testid="text-win-streak-bonus"
            >
              {t("resultOverlay.streakBonus", { percent: tier.percent })}
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
