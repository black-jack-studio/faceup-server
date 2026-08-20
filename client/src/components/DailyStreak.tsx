import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Coin from "@/icons/Coin";
import Gem from "@/icons/Gem";
import { Bolt } from "@/components/ui/Bolt";

interface DailyStreakStatus {
  currentStreak: number;
  longestStreak: number;
  wonToday: boolean;
  cycleRewards: { day: number; type: "coins" | "gems" | "bolts"; amount: number }[];
}

function RewardIcon({ type, size = 14 }: { type: "coins" | "gems" | "bolts"; size?: number }) {
  if (type === "coins") return <Coin size={size} />;
  if (type === "gems") return <Gem style={{ width: size, height: size }} />;
  return <Bolt size={size} />;
}

export default function DailyStreak() {
  const { data, isLoading } = useQuery<DailyStreakStatus>({
    queryKey: ["/api/daily-streak"],
  });

  if (isLoading || !data) {
    return (
      <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
        <div className="w-40 h-4 bg-muted animate-pulse rounded mb-4" />
        <div className="flex gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { currentStreak, wonToday, cycleRewards } = data;
  // Position of the most recently credited day in the 7-day cycle (0 = no streak yet).
  const lastClaimedPos = currentStreak > 0 ? ((currentStreak - 1) % 7) + 1 : 0;
  // Where "today" sits: the day just claimed if already won, otherwise the day still up for
  // grabs — null once a full cycle (day 7) was already claimed and today's win would start
  // the *next* cycle, since that next day has no slot in this 7-day strip to ring.
  const todayPos = wonToday ? lastClaimedPos : lastClaimedPos < 7 ? lastClaimedPos + 1 : null;

  return (
    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white">Daily Streak</h2>
        <span className="text-sm font-bold" style={{ color: "#38bdf8" }} data-testid="text-current-day-streak">
          {currentStreak} {currentStreak === 1 ? "day" : "days"}
        </span>
      </div>

      <div className="flex gap-2">
        {cycleRewards.map((reward, i) => {
          const day = i + 1;
          const isClaimed = day <= lastClaimedPos;
          const isToday = day === todayPos;

          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex-1 flex flex-col items-center gap-1.5 rounded-xl py-2.5"
              style={{
                backgroundColor: isClaimed ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.04)",
                boxShadow: isToday ? "0 0 0 1.5px #38bdf8" : "0 0 0 1px rgba(255,255,255,0.06)",
              }}
              data-testid={`daily-streak-day-${day}`}
            >
              <span className="text-[10px] font-medium text-white/50">Day {day}</span>
              <RewardIcon type={reward.type} size={16} />
              <span className="text-[10px] font-semibold text-white/80">{reward.amount}</span>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-white/50">
        {wonToday
          ? "Today's win is locked in. Come back tomorrow!"
          : "Win a Classic hand today to keep your streak alive."}
      </p>
    </div>
  );
}
