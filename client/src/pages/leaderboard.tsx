import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import BottomSheet from "@/components/BottomSheet";
import { SpinningClock } from "@/components/SpinningClock";
import PlayerStatsModal from "@/components/PlayerStatsModal";
import { triggerHapticTick } from "@/lib/haptics";
import crownImage from "@assets/crown_3d (1)_1758398209351.png";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";
import medal1 from "@assets/1st-place-medal_1758416155392.png";
import medal2 from "@assets/2nd-place-medal_1758416155392.png";
import medal3 from "@assets/3rd-place-medal_1758416155392.png";

const MEDALS: Record<number, string> = { 1: medal1, 2: medal2, 3: medal3 };

function formatCountdown(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "0h";
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

interface LeaderboardProps {
  // Passed when rendered as Home's slide-up overlay, in place of routing to "/".
  onClose?: () => void;
}

export default function Leaderboard({ onClose }: LeaderboardProps) {
  const [, navigate] = useLocation();
  const handleBack = onClose ?? (() => navigate("/"));
  const queryClient = useQueryClient();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isPlayerStatsOpen, setIsPlayerStatsOpen] = useState(false);

  // Polls while this page is open so ranks/coins update live as other players' hands
  // settle, instead of only refreshing on the next full page load.
  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/weekly-xp"],
    refetchInterval: 10000,
  });

  const { data: myStatus } = useQuery<{ rank: number; weeklyXp: number; prizeGems: number; weekEndsAt: string }>({
    queryKey: ["/api/leaderboard/weekly-xp/me"],
    refetchInterval: 10000,
  });

  const claimRewardMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/leaderboard/weekly-xp/claim-reward", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.claimed) {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
    },
  });

  // Auto-claim last week's top-3 reward (if any) the first time the player opens the
  // leaderboard this week — silently no-ops server-side when there's nothing to claim.
  useEffect(() => {
    claimRewardMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-updates the countdown once a minute.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const countdown = myStatus ? formatCountdown(new Date(myStatus.weekEndsAt), now) : null;

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-white hover:bg-transparent"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {countdown && (
            <div className="flex items-center gap-1.5 text-white/70 text-sm">
              <SpinningClock className="w-4 h-4" />
              {countdown}
            </div>
          )}

          <div className="flex items-center gap-1.5" data-testid="badge-my-rank">
            {myStatus && <span className="text-white font-bold text-sm">{myStatus.rank}</span>}
            <img src={trophyIcon} alt="Trophy" className="w-5 h-5" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Weekly leaderboard</h1>
        <div className="flex items-center gap-1.5 text-white/50 text-sm">
          <span>Your current prize is {myStatus?.prizeGems ?? 0} gems</span>
          <button onClick={() => setHowItWorksOpen(true)} data-testid="button-how-it-works">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>
      {/* Leaderboard */}
      <div className="px-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="bg-white/5 rounded-2xl p-4 border border-white/10"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full" />
                  <div className="flex-1">
                    <div className="w-24 h-4 bg-white/10 rounded mb-2" />
                    <div className="w-16 h-3 bg-white/10 rounded" />
                  </div>
                  <div className="w-8 h-8 bg-white/10 rounded" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">No coins won this week</p>
            <p className="text-white/50 text-sm mt-2">Be the first to climb the leaderboard!</p>
          </div>
        ) : (
          <div>
            {leaderboard.map((entry: any, index: number) => {
              const rank = entry.rank || index + 1;
              const avatar = entry.user?.selectedAvatarId ?
                getAvatarById(entry.user.selectedAvatarId) :
                getDefaultAvatar();

              return (
                <div key={entry.id}>
                  {rank === 6 && <div className="border-t border-white/10 my-2" />}
                  <div
                    className="p-5 active:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      if (!entry.user?.id) return;
                      triggerHapticTick();
                      setSelectedPlayer(entry.user);
                      setIsPlayerStatsOpen(true);
                    }}
                    data-testid={`leaderboard-entry-${rank}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      {/* Left side: Rank, Avatar, Username */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Rank */}
                        <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                          {MEDALS[rank] ? (
                            <img src={MEDALS[rank]} alt={`Rank ${rank}`} className="w-8 h-8" />
                          ) : (
                            <span className="text-xl font-bold text-white">{rank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          {avatar?.image ? (
                            <img
                              src={avatar.image}
                              alt={`${entry.user?.username || 'User'} avatar`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {(entry.user?.username || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Username - truncated */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-white font-bold text-lg truncate" data-testid={`username-${rank}`}>
                              {entry.user?.username || 'Anonymous'}
                            </p>
                            {entry.user?.membershipType === 'premium' && (
                              <img src={crownImage} alt="Premium" className="w-5 h-5 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-white/50 text-sm" data-testid={`weekly-xp-${rank}`}>
                            {entry.weeklyXp || 0} coins
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Bottom spacing for navigation */}
      <div className="h-24" />

      <BottomSheet
        open={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        height="auto"
        contentClassName="px-6 pt-3 pb-10 text-white flex flex-col items-center text-center"
      >
        <img src={trophyIcon} alt="Trophy" className="w-20 h-20 mb-4" />
        <h2 className="text-xl font-bold mb-3">How it works</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Every player starts at zero each Monday. Your rank is based on the coins you win or lose
          all week, and the top 3 earn gems when the week ends.
        </p>
      </BottomSheet>

      {/* selectedPlayer deliberately stays set on close (only isPlayerStatsOpen flips) so the
          sheet still has data to render while it plays its close animation — same pattern as
          Friends' own player-tap popup (see friends.tsx). */}
      {selectedPlayer && (
        <PlayerStatsModal
          player={selectedPlayer}
          scope="public"
          open={isPlayerStatsOpen}
          onClose={() => setIsPlayerStatsOpen(false)}
        />
      )}
    </div>
  );
}
