import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Crown, Star, Award } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";

export default function Leaderboard() {
  const [, navigate] = useLocation();

  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/top50-streak"],
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Award className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Star className="w-6 h-6 text-orange-600" />;
      default:
        return <Trophy className="w-6 h-6 text-blue-400" />;
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

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="text-2xl font-bold text-white">Weekly Leaderboard</h1>
          <div className="w-10" />
        </motion.div>

        {/* 21 Streak Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-2">Top 50 Champions</h2>
          <p className="text-white/70 text-sm">Classement des 50 meilleurs joueurs par streak</p>
        </motion.div>
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
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-white/70 text-lg">No streaks recorded this week</p>
            <p className="text-white/50 text-sm mt-2">Be the first to climb the leaderboard!</p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {leaderboard.map((entry: any, index: number) => {
              const rank = entry.rank || index + 1;
              const colors = getRankColors(rank);
              const avatar = entry.user?.selectedAvatarId ? 
                getAvatarById(entry.user.selectedAvatarId) : 
                getDefaultAvatar();

              return (
                <motion.div
                  key={entry.id}
                  className={`bg-gradient-to-r ${colors.bg} rounded-2xl p-5 border ${colors.border} backdrop-blur-sm`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  data-testid={`leaderboard-entry-${rank}`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank */}
                    <div className="flex items-center justify-center w-12 h-12">
                      <span className={`text-2xl font-bold ${colors.text}`}>
                        #{rank}
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
                      {avatar?.image ? (
                        <img 
                          src={avatar.image} 
                          alt={`${entry.user?.username || 'User'} avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                          <span className="text-white text-lg font-bold">
                            {(entry.user?.username || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Username - flex grow to take remaining space */}
                    <div className="flex-1">
                      <p className="text-white font-bold text-xl" data-testid={`username-${rank}`}>
                        {entry.user?.username || 'Anonymous'}
                      </p>
                    </div>

                    {/* Best Streak */}
                    <div className="text-center">
                      <div className="text-sm text-white/70 mb-1">Best Streak</div>
                      <div className={`text-3xl font-black ${colors.text}`} data-testid={`best-streak-${rank}`}>
                        {entry.bestStreak || 0}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Bottom spacing for navigation */}
      <div className="h-24" />
    </div>
  );
}