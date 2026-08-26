import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";
import medal1 from "@assets/1st-place-medal_1758416155392.png";
import medal2 from "@assets/2nd-place-medal_1758416155392.png";
import medal3 from "@assets/3rd-place-medal_1758416155392.png";

interface HomeLeaderboardProps {
  // Skips each row's own staggered fade-in — see home.tsx's useEnteredOnce.
  skipEntrance?: boolean;
  // Opens the leaderboard as Home's slide-up overlay instead of a route navigation.
  onOpen: () => void;
}

const MEDALS: Record<number, string> = { 1: medal1, 2: medal2, 3: medal3 };

export default function HomeLeaderboard({ skipEntrance, onOpen }: HomeLeaderboardProps) {

  // Polls while this widget is on screen so ranks/coins update live rather than only on
  // the next full page load — same interval as the standalone leaderboard page.
  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/leaderboard/weekly-xp"],
    refetchInterval: 10000,
  });

  const { data: myStatus } = useQuery<{ rank: number }>({
    queryKey: ["/api/leaderboard/weekly-xp/me"],
    refetchInterval: 10000,
  });

  // Show top 4 players only
  const topPlayers = leaderboard.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-normal text-white">Weekly leaderboard</h2>
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 px-3 py-1.5"
          data-testid="button-view-all-leaderboard"
        >
          {myStatus && <span className="text-white font-bold text-sm">{myStatus.rank}</span>}
          <img src={trophyIcon} alt="Trophy" className="w-5 h-5" />
        </button>
      </div>
      {/* Crossfade between the loading skeleton and the real rows instead of the content
          snapping in the instant the query resolves — a plain swap here landed a beat after
          the rest of Home had already finished its own entrance, reading as a separate, jarring
          flash. The skeleton also renders 4 rows now (matching topPlayers' max) so this fade
          doesn't also come with a height jump. */}
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="skeleton"
            className="space-y-3"
            initial={skipEntrance ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3">
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
          </motion.div>
        ) : topPlayers.length === 0 ? (
          <motion.div
            key="empty"
            className="text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
          >
            <p className="text-white/70">Aucun gain enregistré</p>
            <p className="text-white/50 text-sm mt-2">Soyez le premier à gravir le classement !</p>
          </motion.div>
        ) : (
          <motion.div
            key="rows"
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
          >
            {topPlayers.map((entry: any, index: number) => {
              const rank = entry.rank || index + 1;
              const avatar = entry.user?.selectedAvatarId ?
                (getAvatarById(entry.user.selectedAvatarId) || getDefaultAvatar()) :
                getDefaultAvatar();

              return (
                <div key={entry.id} className="py-3 px-2" data-testid={`home-leaderboard-entry-${rank}`}>
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

                    {/* Username & XP */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-semibold text-sm truncate" data-testid={`home-username-${rank}`}>
                          {entry.user?.username || 'Anonymous'}
                        </p>
                        {entry.user?.membershipType === 'premium' && (
                          <PremiumCrown size={14} />
                        )}
                      </div>
                      <p className="text-white/50 text-xs" data-testid={`home-weekly-xp-${rank}`}>
                        {entry.weeklyXp || 0} coins
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={onOpen}
        className="w-full mt-4 py-4 bg-white/10 hover:bg-white/15 rounded-xl text-white font-bold text-lg transition-colors"
        data-testid="button-see-full-leaderboard"
      >
        See full leaderboard
      </button>
    </div>
  );
}
