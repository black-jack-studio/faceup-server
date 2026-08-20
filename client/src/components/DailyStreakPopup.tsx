import { motion } from "framer-motion";
import AnimatedModal from "@/components/AnimatedModal";
import Flame from "@/icons/Flame";
import Coin from "@/icons/Coin";
import Gem from "@/icons/Gem";
import { Bolt } from "@/components/ui/Bolt";

export interface DailyStreakRewardInfo {
  currentStreak: number;
  longestStreak: number;
  streakDay: number;
  reward: { type: "coins" | "gems" | "bolts"; amount: number } | null;
}

function RewardIcon({ type, size = 22 }: { type: "coins" | "gems" | "bolts"; size?: number }) {
  if (type === "coins") return <Coin size={size} />;
  if (type === "gems") return <Gem style={{ width: size, height: size }} />;
  return <Bolt size={size} />;
}

interface DailyStreakPopupProps {
  streak: DailyStreakRewardInfo | null;
  onClose: () => void;
}

export default function DailyStreakPopup({ streak, onClose }: DailyStreakPopupProps) {
  const reward = streak?.reward;

  return (
    <AnimatedModal open={!!reward} onClose={onClose} className="w-full max-w-xs">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 220, delay: 0.1 }}
        >
          <Flame size={64} glow />
        </motion.div>

        <h2 className="mt-3 text-2xl font-black text-white">Day {streak?.streakDay} Streak!</h2>
        <p className="mt-1 text-sm text-white/60">
          {streak?.currentStreak} {streak?.currentStreak === 1 ? "day" : "days"} in a row
        </p>

        {reward && (
          <div
            className="mt-5 flex items-center gap-2 rounded-full px-5 py-2.5"
            style={{ backgroundColor: "rgba(56,189,248,0.14)", boxShadow: "0 0 0 1px rgba(56,189,248,0.4)" }}
            data-testid="text-daily-streak-reward"
          >
            <RewardIcon type={reward.type} />
            <span className="text-lg font-bold text-white">+{reward.amount}</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 rounded-2xl font-bold text-black active:scale-95 transition-transform"
          style={{ backgroundColor: "#F8CA5A" }}
          data-testid="button-close-daily-streak-popup"
        >
          Nice!
        </button>
      </div>
    </AnimatedModal>
  );
}
