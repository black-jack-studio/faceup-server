import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, Target } from "lucide-react";

interface WinProbPanelProps {
  pWin?: number;
  pPush?: number;
  pLose?: number;
  ev?: number;
  advice?: string;
  className?: string;
}

const getMoveColor = (move?: string) => {
  switch (move?.toLowerCase()) {
    case "hit":
      return "bg-[#B5F3C7] text-[#0B0B0F]";
    case "stand":
      return "bg-red-500/80 text-white";
    case "double":
      return "bg-[#F8CA5A] text-[#0B0B0F]";
    case "split":
      return "bg-[#B79CFF] text-white";
    case "surrender":
      return "bg-gray-500/80 text-white";
    default:
      return "bg-[#8CCBFF] text-[#0B0B0F]";
  }
};

export default function WinProbPanel({
  pWin,
  pPush,
  pLose,
  ev,
  advice,
  className
}: WinProbPanelProps) {
  if (!pWin && !ev && !advice) {
    return null;
  }

  return (
    <motion.div
      className={cn(
        "bg-[#13151A] rounded-2xl ring-1 ring-white/10 p-4",
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      data-testid="win-prob-panel"
    >
      <div className="flex flex-col gap-2">
        {/* Win Probability */}
        {pWin !== undefined && (
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-[#B5F3C7]" />
            <span className="text-xs text-white/60">Win Chance</span>
            <span className="text-xs font-medium text-[#B5F3C7]">
              {Math.round(pWin * 100)}%
            </span>
          </div>
        )}

        {/* Expected Value */}
        {ev !== undefined && (
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#F8CA5A]" />
            <span className="text-xs text-white/60">EV</span>
            <span className={cn(
              "text-xs font-medium",
              ev >= 0 ? "text-[#B5F3C7]" : "text-red-400"
            )}>
              {ev >= 0 ? "+" : ""}{(ev * 100).toFixed(1)}%
            </span>
          </div>
        )}

      </div>
    </motion.div>
  );
}