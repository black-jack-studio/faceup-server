import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Flame from "@/icons/Flame";

// Mirrors STREAK_BONUS_THRESHOLD in server/routes.ts — display only, the server is the one that
// actually decides the bonus. A single threshold now (Anatole, 2026-09-10 — replaces the old
// 2/3/5 multi-tier version): the bar fills toward it and, once reached, stays full and pulses to
// mark that every win from here on has its own profit doubled.
const STREAK_BONUS_THRESHOLD = 3;

// Horizontal fill bar in a pill, inline (not absolutely positioned) — meant to sit in the
// betting screen's own result slot (see classic.tsx). Mount/unmount and its fade in/out are
// entirely the caller's responsibility — this component just renders the pill itself for
// whatever streak it's given.
export default function WinStreakBar({ streak }: { streak: number }) {
  const { t } = useTranslation("gameplay");
  const maxed = streak >= STREAK_BONUS_THRESHOLD;
  const fillPercent = Math.min(100, (streak / STREAK_BONUS_THRESHOLD) * 100);
  const winsRemaining = STREAK_BONUS_THRESHOLD - streak;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Same caption style as "YOUR BET" above the bet amount (uppercase via CSS, not baked
          into the translated string) — counts down exactly how many more wins unlock the x2,
          then confirms once it's live, instead of leaving the player to infer the threshold
          from the bar alone. */}
      <p
        className="text-xs text-white/50 uppercase tracking-wide"
        data-testid="text-win-streak-caption"
      >
        {maxed ? t("winStreak.x2Active") : t("winStreak.moreWinsForX2", { count: winsRemaining })}
      </p>
      {/* bg-white/10, same pill color as Home's "See full leaderboard" button
          (HomeLeaderboard.tsx) — the app's standard neutral pill background, used here so this
          reads as one contained pill rather than the flame/bar floating bare against the table. */}
      <div className="flex items-center justify-center gap-2.5 bg-white/10 rounded-full py-2 px-3.5">
        <motion.div
          className="shrink-0"
          animate={maxed ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Flame size={22} glow={maxed} />
        </motion.div>

        <div
          className="relative w-[140px] h-[7px] rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <motion.div
            className="absolute left-0 top-0 bottom-0 rounded-full bg-white"
            style={{ boxShadow: "0 0 10px #ffffff" }}
            // Starts empty every time this mounts (matching the old vertical bar's own behavior)
            // so the fill genuinely climbs into view instead of popping in already at its target
            // level.
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
    </div>
  );
}
