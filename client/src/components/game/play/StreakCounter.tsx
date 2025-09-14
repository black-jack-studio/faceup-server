import { motion } from "framer-motion";
import { Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  currentStreak: number;
  maxStreak: number;
  currentMultiplier: number;
  className?: string;
}

export default function StreakCounter({
  currentStreak,
  maxStreak,
  currentMultiplier,
  className
}: StreakCounterProps) {
  const getStreakColor = (streak: number) => {
    if (streak === 0) return "from-gray-600/50 to-gray-800/50";
    if (streak < 3) return "from-purple-600/50 to-blue-600/50";
    if (streak < 5) return "from-blue-600/50 to-cyan-600/50";
    if (streak < 7) return "from-cyan-600/50 to-green-600/50";
    if (streak < 10) return "from-green-600/50 to-yellow-600/50";
    return "from-yellow-600/50 to-red-600/50";
  };

  const getStreakGlow = (streak: number) => {
    if (streak === 0) return "";
    if (streak < 3) return "drop-shadow-lg shadow-purple-500/30";
    if (streak < 5) return "drop-shadow-lg shadow-blue-500/30";
    if (streak < 7) return "drop-shadow-lg shadow-cyan-500/30";
    if (streak < 10) return "drop-shadow-lg shadow-green-500/30";
    return "drop-shadow-lg shadow-yellow-500/30 animate-pulse";
  };

  return (
    <motion.div
      className={cn(
        "bg-gradient-to-r rounded-xl p-3 ring-1 ring-white/20",
        getStreakColor(currentStreak),
        getStreakGlow(currentStreak),
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="streak-counter"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Streak Display */}
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center"
            animate={{ 
              scale: currentStreak > 0 ? [1, 1.1, 1] : 1,
              rotate: currentStreak > 5 ? [0, 5, -5, 0] : 0
            }}
            transition={{ 
              scale: { duration: 0.6, repeat: currentStreak > 0 ? Infinity : 0, repeatDelay: 2 },
              rotate: { duration: 1, repeat: currentStreak > 5 ? Infinity : 0, repeatDelay: 1 }
            }}
          >
            <Zap className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <p className="text-purple-200 text-xs font-medium">Win Streak</p>
            <p className="text-white font-bold text-lg" data-testid="text-streak-current">
              {currentStreak}
            </p>
          </div>
        </div>

        {/* Multiplier and Best */}
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span className="text-amber-300 text-xs font-medium" data-testid="text-streak-best">
              Best: {maxStreak}
            </span>
          </div>
          <motion.p 
            className="text-white/90 text-xs font-bold"
            data-testid="text-multiplier"
            animate={{ 
              scale: currentStreak > 0 ? [1, 1.05, 1] : 1
            }}
            transition={{ 
              duration: 0.5, 
              repeat: currentStreak > 0 ? Infinity : 0, 
              repeatDelay: 1.5 
            }}
          >
            {currentMultiplier}x Multiplier
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}