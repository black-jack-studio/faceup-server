import { useQuery } from "@tanstack/react-query";
import BottomSheet from "@/components/BottomSheet";
import CoinsHistoryChart from "@/components/CoinsHistoryChart";
import GameStatsGrid from "@/components/GameStatsGrid";
import { RankBadge } from "@/ranks/RankBadge";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";

interface PlayerStatsModalProps {
  player: any;
  // "friend": stats endpoints gated server-side on actually being friends (opened from
  // friends.tsx). "public": no such gate (opened from the Weekly Leaderboard, where the
  // tapped player is frequently a stranger — the leaderboard itself is already public).
  scope: "friend" | "public";
  open: boolean;
  onClose: () => void;
}

// Same slide-up stats popup regardless of where it was opened from — a BottomSheet (same
// reliable slide-up/down + scoped drag-to-close as every other sheet in the app) showing
// avatar/username/premium crown/level, then rank progress, the coins history chart, and the
// Hands Won/Win Rate/TGP/Blackjacks tiles. Was Friends-only (FriendStatsModal); generalized so
// the Weekly Leaderboard's rows can open the exact same thing for any player, not a
// re-implementation with its own drift-prone copy of this layout.
export default function PlayerStatsModal({ player, scope, open, onClose }: PlayerStatsModalProps) {
  const avatar = player.selectedAvatarId ?
    getAvatarById(player.selectedAvatarId) :
    getDefaultAvatar();

  const statsEndpoint = scope === "public"
    ? `/api/users/${player.id}/stats/summary`
    : `/api/friends/${player.id}/stats/summary`;

  // Same summary shape as Profile's own /api/stats/summary, scoped to this player — feeds
  // GameStatsGrid below.
  const { data: playerStats } = useQuery({
    queryKey: [statsEndpoint],
    enabled: open,
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      // Taller than the 75vh default — header + rank + chart + the 4 stat tiles need more
      // room than that to show without scrolling first on most phone screens.
      height="90vh"
      contentClassName="px-6 pb-6"
    >
      <div data-testid="player-stats-modal">
        {/* Header with Avatar and Name */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            {avatar?.image ? (
              <img
                src={avatar.image}
                alt={`${player.username} avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {player.username[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-xl font-bold text-white">{player.username}</h2>
              {player.membershipType === 'premium' && (
                <PremiumCrown size={20} />
              )}
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-sm text-white/50">Lvl</span>
              <span className="text-sm font-semibold text-white">
                {player.level ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Rank progress, then the same two blocks as Profile's own Statistics section
            (coins chart, then the Hands Won/Win Rate/TGP/Blackjacks tiles). RankBadge is
            readOnly here: claimed-rewards state belongs to whoever's logged in, not this
            player, so tapping it doesn't open the (viewer's own) claim flow against someone
            else's progress. */}
        <div className="mb-6">
          <RankBadge wins={player.seasonHandsWon || 0} readOnly />
        </div>
        <div className="mb-6">
          <CoinsHistoryChart userId={player.id} scope={scope} />
        </div>
        <GameStatsGrid stats={playerStats} />
      </div>
    </BottomSheet>
  );
}
