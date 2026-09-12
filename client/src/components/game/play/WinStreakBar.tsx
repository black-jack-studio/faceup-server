import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Flame from "@/icons/Flame";
import { formatFullNumber } from "@/lib/formatUtils";

// Mirrors STREAK_BONUS_THRESHOLD in server/routes.ts — display only, the server is the one that
// actually decides the bonus. The streak resets to 0 the instant it hits this, so the bar never
// actually sits at/above it in normal display — see celebrationBonus below for the one moment
// that completion is shown at all.
const STREAK_BONUS_THRESHOLD = 3;
// The minimum time the "you win X bonus" celebration text stays up for. Exported so classic.tsx
// can clear celebrationBonus itself, timed to whichever is longer between this and the
// celebration's own coin-flight burst (see classic.tsx's streakCelebrationTotalMs) — this used
// to be a fixed internal timer here calling an onCelebrationDone prop regardless of how long
// that burst actually took, which could clear the bar (and hand dismissal off to a second,
// independently-guessed auto-dismiss timer) well before the coins landed, leaving a dead stretch
// in between (Anatole, 2026-09-13: "dès que la barre de streak elle disparaît, tout recommence").
export const CELEBRATION_DURATION_MS = 1800;

interface WinStreakBarProps {
  streak: number;
  // Set for the one hand whose win just completed the cycle — by the time this renders, the
  // server has already reset `streak` back to 0 (see applyClassicStreakBonus's own comment), so
  // without this the bar would just vanish instead of ever showing the win that triggered it.
  // While set, the bar holds at its full/maxed state with a "you win X bonus" celebration in
  // place of the usual countdown text. classic.tsx owns clearing it (see CELEBRATION_DURATION_MS
  // above) — this component just renders whatever it's given for as long as it's given it.
  celebrationBonus?: number | null;
}

// Horizontal fill bar in a pill, inline (not absolutely positioned) — sits just above the
// Watch-to-2X button, in the same bottom box (see classic.tsx's showWatchToDouble branch;
// Anatole, 2026-09-12 — previously lived in the betting screen's own result slot instead).
// Mount/unmount and its fade in/out are entirely the caller's responsibility — this component
// just renders the pill itself for whatever streak (and celebration) it's given.
export default function WinStreakBar({ streak, celebrationBonus }: WinStreakBarProps) {
  const { t } = useTranslation("gameplay");
  const celebrating = celebrationBonus != null;
  const fillPercent = celebrating ? 100 : Math.min(100, (streak / STREAK_BONUS_THRESHOLD) * 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* White and large on purpose (Anatole, 2026-09-10 — was a small gray caption before) so
          this reads as the headline, not a footnote under the bar. text-center + no nowrap: the
          French countdown ("encore N victoires pour x2") runs noticeably longer than the English
          one, and wrapping to a second line here just grows this centered block a little instead
          of spilling past the table's own width onto the cards on either side. */}
      <p
        className="text-xl font-bold text-white text-center px-6"
        data-testid="text-win-streak-caption"
      >
        {celebrating
          ? t("winStreak.bonusWon", { amount: formatFullNumber(celebrationBonus!) })
          : t("winStreak.moreWinsForX2", { count: STREAK_BONUS_THRESHOLD - streak })}
      </p>
      {/* bg-white/10, same pill color as Home's "See full leaderboard" button
          (HomeLeaderboard.tsx) — the app's standard neutral pill background, used here so this
          reads as one contained pill rather than the flame/bar floating bare against the table. */}
      <div className="flex items-center justify-center gap-2.5 bg-white/10 rounded-full py-2 px-3.5">
        <motion.div
          className="shrink-0"
          animate={celebrating ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Flame size={22} glow={celebrating} />
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
              opacity: celebrating ? [1, 0.6, 1] : 1,
            }}
            transition={{
              width: { type: "spring", stiffness: 200, damping: 26 },
              opacity: celebrating ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 },
            }}
          />
        </div>
      </div>
    </div>
  );
}
