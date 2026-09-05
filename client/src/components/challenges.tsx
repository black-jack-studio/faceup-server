import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import coinImage from "@assets/coin_gold_crown_2026-08-26.png";
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";

interface Challenge {
  id: string;
  challengeType: string;
  title: string;
  description: string;
  targetValue: number;
  reward: number;
}

interface UserChallenge {
  id: string;
  currentProgress: number;
  isCompleted: boolean;
  rewardClaimed: boolean;
  challenge: Challenge;
}

interface ChallengesProps {
  // Skips each progress bar's own fill-in-from-0 animation — see home.tsx's useEnteredOnce.
  skipEntrance?: boolean;
}

export default function Challenges({ skipEntrance }: ChallengesProps) {
  const { t } = useTranslation("challenges");
  const { data: userChallenges = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["/api/challenges/user"],
    retry: 2,
  });

  const { toast } = useToast();
  // Drives the card's exit animation independently of the server refetch — the query
  // invalidation still runs (to sync coins/XP/claimed state), but the card leaves the
  // list on our own timeline so the transition always feels the same regardless of
  // network latency.
  const [locallyClaimedIds, setLocallyClaimedIds] = useState<Set<string>>(new Set());

  const claimMutation = useMutation({
    mutationFn: async (userChallengeId: string) => {
      const response = await apiRequest('POST', `/api/challenges/${userChallengeId}/claim`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to claim reward");
      }
      return data;
    },
    onSuccess: (_data, userChallengeId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      // Challenge claims also award XP server-side, so a full loadUser() is needed —
      // loadUserCoins() alone wouldn't refresh the XP bar/level ring.
      useUserStore.getState().loadUser();

      setLocallyClaimedIds((prev) => new Set(prev).add(userChallengeId));
    },
    onError: (error: any) => {
      toast({
        title: t("couldntClaim"),
        description: error.error || error.message || t("tryAgain"),
        variant: "destructive",
      });
    },
  });

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Fetch remaining time from API and update every second
  useEffect(() => {
    const fetchTimeLeft = async () => {
      try {
        const response = await apiRequest('GET', '/api/challenges/time-until-reset');
        const data = await response.json();
        setTimeLeft(data);
      } catch (error) {
        console.error('Error fetching remaining time:', error);
      }
    };

    // Fetch initial time
    fetchTimeLeft();

    // Update countdown every second
    const interval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime.seconds > 0) {
          return { ...prevTime, seconds: prevTime.seconds - 1 };
        } else if (prevTime.minutes > 0) {
          return { hours: prevTime.hours, minutes: prevTime.minutes - 1, seconds: 59 };
        } else if (prevTime.hours > 0) {
          return { hours: prevTime.hours - 1, minutes: 59, seconds: 59 };
        } else {
          // Time elapsed, reload challenges
          fetchTimeLeft();
          // Invalidate challenge cache to reload them
          queryClient.invalidateQueries({ queryKey: ["/api/challenges/user"] });
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <motion.div
        className="space-y-3"
        initial={skipEntrance ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="w-32 h-4 bg-muted animate-pulse rounded mb-2" />
                <div className="w-24 h-3 bg-muted animate-pulse rounded" />
              </div>
              <div className="w-16 h-6 bg-muted animate-pulse rounded" />
            </div>
            <div className="w-full h-2 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </motion.div>
    );
  }

  if (isError) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">{t("couldntLoad")}</h3>
        <p className="text-xs text-white/60 mb-3">{(error as any)?.message || t("tryAgain")}</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-white underline"
          data-testid="button-retry-challenges"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if ((userChallenges as UserChallenge[]).length === 0) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">{t("noChallenges")}</h3>

        <div className="rounded-lg px-4 py-3 inline-flex flex-col items-center">
          <div className="text-xs text-white mb-1">{t("newChallengeIn")}</div>
          <div className="text-white font-mono text-lg font-bold">
            {String(timeLeft.hours).padStart(2, '0')}:
            {String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-normal text-white">{t("title")}</h2>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
        {(userChallenges as UserChallenge[])
          .filter((userChallenge: UserChallenge) => !userChallenge.rewardClaimed && !locallyClaimedIds.has(userChallenge.id))
          // Completed (claimable) challenges bubble to the top so the player sees what's
          // ready to claim first; the "layout" prop on each card animates the reshuffle.
          .sort((a: UserChallenge, b: UserChallenge) => Number(b.isCompleted) - Number(a.isCompleted))
          .map((userChallenge: UserChallenge, index: number) => {
            const progress = Math.min((userChallenge.currentProgress / userChallenge.challenge.targetValue) * 100, 100);
            const isCompleted = userChallenge.isCompleted;

            return (
              <motion.div
                key={userChallenge.id}
                layout
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0, transition: { duration: 0.35, ease: "easeInOut" } }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative">
                  <div className={isCompleted ? "blur-[6px] select-none" : undefined}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-3">
                        <h3 className="font-semibold text-white text-sm mb-1" data-testid={`challenge-title-${index}`}>
                          {userChallenge.challenge.title}
                        </h3>
                        <div className="flex items-center space-x-1 text-yellow-400">
                          <img src={coinImage} alt={t("coinAlt")} className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium text-white" data-testid={`challenge-reward-${index}`}>
                            {userChallenge.challenge.reward}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-base font-bold text-white">
                          {userChallenge.currentProgress}/{userChallenge.challenge.targetValue}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ backgroundColor: "#38bdf8" }}
                        initial={skipEntrance ? false : { width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        data-testid={`challenge-progress-${index}`}
                      />
                    </div>
                  </div>

                  {isCompleted && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => claimMutation.mutate(userChallenge.id)}
                      disabled={claimMutation.isPending && claimMutation.variables === userChallenge.id}
                      className="absolute inset-0 flex items-center justify-center gap-3"
                      data-testid={`button-claim-challenge-${index}`}
                    >
                      <span className="text-2xl font-extrabold text-white drop-shadow-md">{t("claim")}</span>
                      <img src={coinImage} alt="Coin" className="w-8 h-8 drop-shadow-md" />
                      <span className="text-2xl font-extrabold text-white drop-shadow-md">{userChallenge.challenge.reward}</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-8 mb-2 flex items-center justify-center space-x-2 text-xs text-white">
        <i className="fas fa-sync-alt" />
        <span>{t("newChallengesIn")}</span>
        <span className="font-mono text-white/70">
          {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    </motion.div>
  );
}