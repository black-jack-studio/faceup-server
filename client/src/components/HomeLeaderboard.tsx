import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { useLocation } from "wouter";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";
import medal1 from "@assets/1st-place-medal_1758416155392.png";
import medal2 from "@assets/2nd-place-medal_1758416155392.png";
import medal3 from "@assets/3rd-place-medal_1758416155392.png";

interface HomeLeaderboardProps {
  // Skips each row's own staggered fade-in — see home.tsx's useEnteredOnce.
  skipEntrance?: boolean;
}

const MEDALS: Record<number, string> = { 1: medal1, 2: medal2, 3: medal3 };

export default function HomeLeaderboard({ skipEntrance }: HomeLeaderboardProps) {
  const [, navigate] = useLocation();

  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/weekly-xp"],
  });

  const { data: myStatus } = useQuery<{ rank: number }>({
    queryKey: ["/api/leaderboard/weekly-xp/me"],
  });

  // Show top 5 players only
  const topPlayers = leaderboard.slice(0, 5);

  return (
    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Weekly leaderboard</h2>
        <button
          onClick={() => navigate("/leaderboard")}
          className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 hover:bg-white/15 transition-colors"
          data-testid="button-view-all-leaderboard"
        >
          {myStatus && <span className="text-white font-bold text-sm">{myStatus.rank}</span>}
          <img src={trophyIcon} alt="Trophy" className="w-5 h-5" />
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="w-20 h-4 bg-white/10 rounded mb-2 animate-pulse" />
                  <div className="w-16 h-3 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="w-8 h-6 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : topPlayers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/70">Aucun XP enregistré</p>
          <p className="text-white/50 text-sm mt-2">Soyez le premier à gravir le classement !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topPlayers.map((entry: any, index: number) => {
            const rank = entry.rank || index + 1;
            const avatar = entry.user?.selectedAvatarId ?
              (getAvatarById(entry.user.selectedAvatarId) || getDefaultAvatar()) :
              getDefaultAvatar();

            return (
              <motion.div
                key={entry.id}
                className="py-3 px-2"
                initial={skipEntrance ? false : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                data-testid={`home-leaderboard-entry-${rank}`}
              >
                <div className="flex items-center space-x-3">
                  {/* Rank & medal */}
                  <div className="flex items-center justify-center w-8 flex-shrink-0">
                    {MEDALS[rank] ? (
                      <img src={MEDALS[rank]} alt={`Rank ${rank}`} className="w-8 h-8" />
                    ) : (
                      <span className="text-lg font-bold text-white">{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
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

                  {/* Username */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-semibold text-sm truncate" data-testid={`home-username-${rank}`}>
                        {entry.user?.username || 'Anonymous'}
                      </p>
                      {entry.user?.membershipType === 'premium' && (
                        <PremiumCrown size={14} />
                      )}
                    </div>
                  </div>

                  {/* Weekly XP */}
                  <div className="flex items-center space-x-1">
                    <div className="text-xs text-white/50">XP</div>
                    <div className="text-lg font-bold text-white" data-testid={`home-weekly-xp-${rank}`}>
                      {entry.weeklyXp || 0}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      <button
        onClick={() => navigate("/leaderboard")}
        className="w-full mt-4 py-3.5 bg-white/10 hover:bg-white/15 rounded-full text-white font-semibold text-sm transition-colors"
        data-testid="button-see-full-leaderboard"
      >
        See full leaderboard
      </button>
    </div>
  );
}
