import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import AnimatedModal from "@/components/AnimatedModal";
import Flame from "@/icons/Flame";
import Coin from "@/icons/Coin";
import Gem from "@/icons/Gem";
import { Bolt } from "@/components/ui/Bolt";
import { apiRequest } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";

type RewardType = "coins" | "gems" | "bolts";

interface DailyStreakStatus {
  currentStreak: number;
  longestStreak: number;
  wonToday: boolean;
  claimableReward: { type: RewardType; amount: number } | null;
  cycleRewards: { day: number; type: RewardType; amount: number }[];
}

function RewardIcon({ type, size = 16 }: { type: RewardType; size?: number }) {
  if (type === "coins") return <Coin size={size} />;
  if (type === "gems") return <Gem style={{ width: size, height: size }} />;
  return <Bolt size={size} />;
}

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
      // Streak rewards are coins/gems/bolts only (no XP) but loadUser() (not loadUserCoins,
      // which skips gems) covers all three in one call, same as the Battle Pass claim flow.
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

  const currentStreak = data?.currentStreak ?? 0;
  const wonToday = data?.wonToday ?? false;
  const claimableReward = data?.claimableReward ?? null;
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

        <h2 className="mt-3 text-2xl font-black text-white">{currentStreak} Day Streak</h2>
        <p className="mt-1 text-sm text-white/60">
          {currentStreak} {currentStreak === 1 ? "day" : "days"} in a row
        </p>

        {cycleRewards.length > 0 && (
          <div className="mt-5 flex flex-col gap-1.5 w-full">
            {cycleRewards.map((reward, i) => {
              const day = i + 1;
              const isClaimed = day <= lastClaimedPos;
              const isToday = day === todayPos;

              return (
                <div
                  key={day}
                  className="flex items-center justify-between rounded-xl px-4 py-2.5"
                  style={{
                    backgroundColor: isClaimed ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.04)",
                    boxShadow: isToday ? "0 0 0 1.5px #38bdf8" : "0 0 0 1px rgba(255,255,255,0.06)",
                  }}
                  data-testid={`daily-streak-day-${day}`}
                >
                  <span className="text-xs font-medium text-white/60">Day {day}</span>
                  <div className="flex items-center gap-1.5">
                    <RewardIcon type={reward.type} size={14} />
                    <span className="text-xs font-semibold text-white/80">{reward.amount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-white/50">
          {claimableReward
            ? "Your reward from today's win is ready to claim!"
            : wonToday
              ? "Today's win is locked in. Come back tomorrow!"
              : "Win a Classic hand today to keep your streak alive."}
        </p>

        <motion.button
          onClick={() => (claimableReward ? claimMutation.mutate() : onClose())}
          disabled={claimMutation.isPending}
          className="mt-6 w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            backgroundImage: "linear-gradient(90deg, #38bdf8, #7dd3fc, #38bdf8)",
            backgroundSize: "200% auto",
          }}
          animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
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
      </div>
    </AnimatedModal>
  );
}
