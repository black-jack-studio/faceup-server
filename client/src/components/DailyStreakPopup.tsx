import { useQuery } from "@tanstack/react-query";
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

interface DailyStreakStatus {
  currentStreak: number;
  longestStreak: number;
  wonToday: boolean;
  cycleRewards: { day: number; type: "coins" | "gems" | "bolts"; amount: number }[];
}

function RewardIcon({ type, size = 16 }: { type: "coins" | "gems" | "bolts"; size?: number }) {
  if (type === "coins") return <Coin size={size} />;
  if (type === "gems") return <Gem style={{ width: size, height: size }} />;
  return <Bolt size={size} />;
}

interface DailyStreakPopupProps {
  open: boolean;
  // Only set right after a hand credited a brand new reward — drives the celebratory
  // headline/pill. When opened by tapping the flame instead, this is null and the popup
  // just shows the current status.
  justWon?: DailyStreakRewardInfo | null;
  onClose: () => void;
}

export default function DailyStreakPopup({ open, justWon, onClose }: DailyStreakPopupProps) {
  const { data } = useQuery<DailyStreakStatus>({
    queryKey: ["/api/daily-streak"],
    enabled: open,
  });

  const currentStreak = justWon?.currentStreak ?? data?.currentStreak ?? 0;
  const wonToday = justWon ? true : data?.wonToday ?? false;
  const cycleRewards = data?.cycleRewards ?? [];

  // Position of the most recently credited day in the 7-day cycle (0 = no streak yet).
  const lastClaimedPos = currentStreak > 0 ? ((currentStreak - 1) % 7) + 1 : 0;
  // Where "today" sits: the day just claimed if already won, otherwise the day still up for
  // grabs — null once a full cycle (day 7) was already claimed and today's win would start
  // the *next* cycle, since that next day has no slot in this 7-day strip to ring.
  const todayPos = wonToday ? lastClaimedPos : lastClaimedPos < 7 ? lastClaimedPos + 1 : null;

  return (
    <AnimatedModal open={open} onClose={onClose} className="w-full max-w-xs">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 220, delay: 0.1 }}
        >
          <Flame size={64} />
        </motion.div>

        <h2 className="mt-3 text-2xl font-black text-white">
          {justWon ? `Day ${justWon.streakDay} Streak!` : `${currentStreak} Day Streak`}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {currentStreak} {currentStreak === 1 ? "day" : "days"} in a row
        </p>

        {justWon?.reward && (
          <div
            className="mt-4 flex items-center gap-2 rounded-full px-5 py-2.5"
            style={{ backgroundColor: "rgba(56,189,248,0.14)", boxShadow: "0 0 0 1px rgba(56,189,248,0.4)" }}
            data-testid="text-daily-streak-reward"
          >
            <RewardIcon type={justWon.reward.type} size={22} />
            <span className="text-lg font-bold text-white">+{justWon.reward.amount}</span>
          </div>
        )}

        {cycleRewards.length > 0 && (
          <div className="mt-5 flex gap-1.5 w-full">
            {cycleRewards.map((reward, i) => {
              const day = i + 1;
              const isClaimed = day <= lastClaimedPos;
              const isToday = day === todayPos;

              return (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-center gap-1 rounded-xl py-2"
                  style={{
                    backgroundColor: isClaimed ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.04)",
                    boxShadow: isToday ? "0 0 0 1.5px #38bdf8" : "0 0 0 1px rgba(255,255,255,0.06)",
                  }}
                  data-testid={`daily-streak-day-${day}`}
                >
                  <span className="text-[9px] font-medium text-white/50">D{day}</span>
                  <RewardIcon type={reward.type} size={13} />
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-white/50">
          {wonToday
            ? "Today's win is locked in. Come back tomorrow!"
            : "Win a Classic hand today to keep your streak alive."}
        </p>

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
