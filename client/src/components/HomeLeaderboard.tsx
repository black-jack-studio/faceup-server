import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown, Award, Star } from "lucide-react";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";

export default function HomeLeaderboard() {
  const [, navigate] = useLocation();
  const isPremium = useUserStore((state) => state.isPremium());

  // Only show leaderboard for premium users
  if (!isPremium) {
    return null;
  }

  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/top50-streak"],
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Star className="w-5 h-5 text-orange-600" />;
      default:
        return <Trophy className="w-5 h-5 text-blue-400" />;
    }
  };

  const getRankColors = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: "from-yellow-500/20 to-amber-600/20",
          border: "border-yellow-500/30",
          text: "text-yellow-400"
        };
      case 2:
        return {
          bg: "from-gray-400/20 to-slate-500/20", 
          border: "border-gray-400/30",
          text: "text-gray-300"
        };
      case 3:
        return {
          bg: "from-orange-500/20 to-amber-700/20",
          border: "border-orange-500/30", 
          text: "text-orange-400"
        };
      default:
        return {
          bg: "from-blue-500/10 to-purple-600/10",
          border: "border-blue-500/20",
          text: "text-blue-400"
        };
    }
  };

  // Show top 3 players only
  const topPlayers = leaderboard.slice(0, 3);

  return (
    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center">
          <img src={trophyIcon} alt="Trophy" className="w-6 h-6 mr-2" />
          Top Streaks
        </h2>
        <button
          onClick={() => navigate("/leaderboard")}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          data-testid="button-view-all-leaderboard"
        >View all</button>
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
          <p className="text-white/70">Aucun streak enregistré</p>
          <p className="text-white/50 text-sm mt-2">Soyez le premier à gravir le classement !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topPlayers.map((entry: any, index: number) => {
            const rank = entry.rank || index + 1;
            const colors = getRankColors(rank);
            const avatar = entry.user?.selectedAvatarId ? 
              getAvatarById(entry.user.selectedAvatarId) : 
              getDefaultAvatar();

            return (
              <motion.div
                key={entry.id}
                className="py-3 px-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                data-testid={`home-leaderboard-entry-${rank}`}
              >
                <div className="flex items-center space-x-3">
                  {/* Rank & Icon */}
                  <div className="flex items-center justify-center w-8">
                    <span className="text-lg font-bold text-white">
                      {rank}
                    </span>
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

                  {/* Best Streak */}
                  <div className="flex items-center space-x-1">
                    <div className="text-xs text-white/50">streak</div>
                    <div className="text-lg font-bold text-white" data-testid={`home-best-streak-${rank}`}>
                      {entry.bestStreak || 0}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}