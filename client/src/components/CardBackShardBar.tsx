import { motion } from "framer-motion";

// Same visual language as the Win Rate segmented bar on Profile's stats grid
// (GameStatsGrid.tsx: flex gap-1, h-1 flex-1 rounded-full segments, unfilled at
// rgba(255,255,255,0.1)) -- reused here for card back fragment progress instead of a plain
// continuous progress bar, so both read as the same "discrete steps toward a goal" idiom.
// Same blue as the Lucky Reels free-spin progress bar (wheel-of-fortune.tsx).
const SHARD_FILLED_COLOR = "#38bdf8";
const SHARD_EMPTY_COLOR = "rgba(255,255,255,0.15)";

interface CardBackShardBarProps {
  filled: number;
  total: number;
  className?: string;
  // When true, the most recently filled segment plays a slow "appear" animation instead of
  // rendering already-settled -- used right after a chest grants a new shard (in
  // ChestRewardReveal). The collection page (card-backs.tsx) always renders settled state, so
  // it leaves this off.
  animateLatest?: boolean;
}

export default function CardBackShardBar({ filled, total, className = "", animateLatest = false }: CardBackShardBarProps) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled;
        const isLatest = animateLatest && i === filled - 1;
        return (
          // Track (always gray) with the fill as a separate layer on top, scaling in from the
          // left edge (transformOrigin "left") -- reads as the segment filling up with color
          // left-to-right, unlike scaling the whole pill from its own center, which just made
          // it grow outward instead of looking "filled".
          <div key={i} className="relative h-1 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: SHARD_EMPTY_COLOR }}>
            {isFilled && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: SHARD_FILLED_COLOR, transformOrigin: "left" }}
                initial={isLatest ? { scaleX: 0 } : false}
                animate={isLatest ? { scaleX: 1 } : undefined}
                transition={isLatest ? { duration: 1, ease: "easeOut", delay: 0.6 } : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
