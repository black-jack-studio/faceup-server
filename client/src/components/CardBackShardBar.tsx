import { motion } from "framer-motion";

// Same visual language as the Win Rate segmented bar on Profile's stats grid
// (GameStatsGrid.tsx: flex gap-1, h-1 flex-1 rounded-full segments, unfilled at
// rgba(255,255,255,0.1)) -- reused here for card back fragment progress instead of a plain
// continuous progress bar, so both read as the same "discrete steps toward a goal" idiom.
const SHARD_FILLED_COLOR = "#FFC454";
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
          <motion.div
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ backgroundColor: isFilled ? SHARD_FILLED_COLOR : SHARD_EMPTY_COLOR }}
            initial={isLatest ? { opacity: 0, scaleX: 0 } : false}
            animate={isLatest ? { opacity: 1, scaleX: 1 } : undefined}
            transition={isLatest ? { duration: 1, ease: "easeOut", delay: 0.6 } : undefined}
          />
        );
      })}
    </div>
  );
}
