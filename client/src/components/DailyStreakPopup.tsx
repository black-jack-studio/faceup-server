import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import Flame from "@/icons/Flame";
import Coin from "@/icons/Coin";
import Gem from "@/icons/Gem";
import { apiRequest } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";

type RewardType = "coins" | "gems";
type CycleReward = { day: number; type: RewardType; amount: number };

interface DailyStreakStatus {
  currentStreak: number;
  longestStreak: number;
  wonToday: boolean;
  claimableReward: { type: RewardType; amount: number } | null;
  cycleRewards: CycleReward[];
}

function RewardIcon({ type, size = 16 }: { type: RewardType; size?: number }) {
  if (type === "coins") return <Coin size={size} />;
  return <Gem style={{ width: size, height: size }} />;
}

// One row reads as one week, so a 14-day cycle naturally becomes two rows of 7 instead of one
// long list — the two-week shape is visible at a glance instead of needing to be counted.
const ROW_SIZE = 7;

interface DailyStreakPopupProps {
  open: boolean;
  onClose: () => void;
}

export default function DailyStreakPopup({ open, onClose }: DailyStreakPopupProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data } = useQuery<DailyStreakStatus>({
    queryKey: ["/api/daily-streak"],
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/daily-streak/claim");
      return await response.json();
    },
    onSuccess: (result: { claimed: boolean; reward?: { type: RewardType; amount: number } }) => {
      if (!result.claimed) return;
      queryClient.invalidateQueries({ queryKey: ["/api/daily-streak"] });
      // Streak rewards are coins/gems only (no XP) but loadUser() (not loadUserCoins, which
      // skips gems) covers both in one call, same as the Battle Pass claim flow.
      useUserStore.getState().loadUser();
      toast({
        title: "Reward claimed!",
        description: `+${result.reward?.amount} ${result.reward?.type} added to your balance`,
      });
    },
    onError: () => {
      toast({
        title: "Couldn't claim reward",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Same reset boundary the daily challenges use (Paris midnight) — reused here rather than
  // duplicating the calculation, since a missed day breaks the streak at that same instant.
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    if (!open) return;

    const fetchTimeLeft = async () => {
      try {
        const response = await apiRequest("GET", "/api/challenges/time-until-reset");
        setTimeLeft(await response.json());
      } catch {
        // Keep showing the last known value rather than a broken countdown.
      }
    };
    fetchTimeLeft();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        fetchTimeLeft();
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  const currentStreak = data?.currentStreak ?? 0;
  const wonToday = data?.wonToday ?? false;
  const claimableReward = data?.claimableReward ?? null;
  const cycleRewards = data?.cycleRewards ?? [];
  // Derived from however many rewards the server actually sent rather than a literal 14, so
  // this keeps working on its own if that reward table's length ever changes again.
  const cycleLength = cycleRewards.length || 14;

  // Position of the most recently credited day in the cycle (0 = no streak yet).
  const lastClaimedPos = currentStreak > 0 ? ((currentStreak - 1) % cycleLength) + 1 : 0;
  // Where "today" sits: the day just won if already claimed, otherwise the day still up for
  // grabs — null once a full cycle was already claimed and today's win would start the *next*
  // cycle, since that next day has no slot left in this strip to ring.
  const todayPos = wonToday ? lastClaimedPos : lastClaimedPos < cycleLength ? lastClaimedPos + 1 : null;

  const rows: CycleReward[][] = [];
  for (let i = 0; i < cycleRewards.length; i += ROW_SIZE) {
    rows.push(cycleRewards.slice(i, i + ROW_SIZE));
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      // This popup's content is short and fixed-size — a full 75vh sheet left dead empty
      // space both above the flame and below the Claim/Nice button. "auto" sizes the sheet
      // to exactly fit its content instead.
      height="auto"
      contentClassName="px-4 pt-3 pb-8 text-white flex flex-col items-center"
    >
      <motion.div
        animate={{ rotate: [-4, 4, -4], scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Flame size={56} glow />
      </motion.div>

      <h2 className="mt-2 text-2xl font-black text-white" data-testid="text-daily-streak-title">
        {currentStreak} Day Streak
      </h2>

      <div className="mt-6 w-full flex flex-col gap-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-7 gap-x-1">
            {row.map((reward) => {
              const day = reward.day;
              const isToday = day === todayPos;
              // Winning today already advances lastClaimedPos (the server credits the streak
              // on the win itself, before the reward is claimed) — the `!(isToday &&
              // claimableReward)` guard keeps today's circle from flashing "claimed" before
              // the Claim button below has actually been tapped.
              const isClaimed = day <= lastClaimedPos && !(isToday && claimableReward);

              return (
                <div
                  key={day}
                  className="flex flex-col items-center gap-2"
                  data-testid={`daily-streak-day-${day}`}
                >
                  <span className="text-xs font-medium text-white/35">{day}</span>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: isClaimed ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)",
                      boxShadow: isToday ? "0 0 0 2px #FFFFFF" : "0 0 0 1px rgba(255,255,255,0.07)",
                    }}
                  >
                    {isClaimed ? (
                      <Check size={18} strokeWidth={2.5} className="text-white/55" />
                    ) : (
                      <RewardIcon type={reward.type} size={18} />
                    )}
                  </div>
                  {/* The icon rides along with every amount, claimed or not — a bare number
                      ("2", "10"...) doesn't say coins vs gems on its own once the circle above
                      has already swapped its icon out for a checkmark. */}
                  <div className="flex items-center gap-1">
                    <RewardIcon type={reward.type} size={14} />
                    <span className="text-xs font-bold text-white/70 tabular-nums">
                      {reward.amount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {claimableReward ? (
        <p className="mt-5 text-xs text-white/50">Your reward from today's win is ready to claim!</p>
      ) : wonToday ? (
        <div className="mt-5 flex items-center gap-1.5 text-xs text-white/50" data-testid="text-daily-streak-reset-countdown">
          <span>Streak resets in</span>
          <span className="font-mono text-white/70">
            {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
          </span>
        </div>
      ) : (
        <p className="mt-5 text-xs text-white/50">Win a Classic hand today to keep your streak alive.</p>
      )}

      <motion.button
        onClick={() => (claimableReward ? claimMutation.mutate() : onClose())}
        disabled={claimMutation.isPending}
        className="mt-6 w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        style={{
          background: '#FFFFFF',
          color: '#15161A',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
        whileTap={{ scale: 0.98 }}
        data-testid="button-daily-streak-primary"
      >
        {claimableReward ? (
          <>
            Claim +{claimableReward.amount}
            <RewardIcon type={claimableReward.type} size={18} />
          </>
        ) : (
          "Nice!"
        )}
      </motion.button>
    </BottomSheet>
  );
}
