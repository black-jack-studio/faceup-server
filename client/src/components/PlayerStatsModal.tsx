import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import BottomSheet from "@/components/BottomSheet";
import CoinsHistoryChart from "@/components/CoinsHistoryChart";
import GameStatsGrid from "@/components/GameStatsGrid";
import ActionSheet from "@/components/ActionSheet";
import ReportReasonModal from "@/components/ReportReasonModal";
import { RankBadge } from "@/ranks/RankBadge";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";

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

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUserId = useUserStore((state) => state.user?.id);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportReason, setShowReportReason] = useState(false);

  const blockMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${player.id}/block`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/weekly-xp"] });
      toast({ title: "Joueur bloqué", description: `Tu ne verras plus ${player.username}.` });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Impossible de bloquer ce joueur",
        description: error.message || "Réessaie plus tard.",
        variant: "destructive",
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (reason: string) => {
      await apiRequest("POST", `/api/users/${player.id}/report`, { reason });
    },
    onSuccess: () => {
      setShowReportReason(false);
      toast({ title: "Signalement envoyé", description: "Merci, notre équipe va l'examiner." });
    },
    onError: (error: any) => {
      toast({
        title: "Impossible d'envoyer le signalement",
        description: error.message || "Réessaie plus tard.",
        variant: "destructive",
      });
    },
  });

  // Never shown for the viewer's own row (leaderboard rows can include yourself) — you can't
  // report or block yourself.
  const canModerate = !!currentUserId && currentUserId !== player.id;

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

        {/* GameStatsGrid's own tiles right above are h-24 (96px) with a 24px radius — a 0.25
            radius-to-height ratio. This button is much shorter (h-9, 36px), so the literal
            24px value read as a full pill instead of matching that tiles' rounded-square feel
            (24px on a 36px-tall element is already over half its height). Scaling the radius
            by the same 0.25 ratio (0.25 × 36 ≈ 9px) keeps the same rounding language as the
            tiles at this smaller size instead. */}
        {canModerate && (
          <button
            onClick={() => setShowActionSheet(true)}
            className="block mx-auto mt-6 h-9 px-6 rounded-[9px] bg-black text-white text-sm font-medium active:bg-white/10 transition-colors"
            data-testid="button-report-player"
          >
            Signaler
          </button>
        )}
      </div>

      {canModerate && (
        <>
          <ActionSheet
            open={showActionSheet}
            onClose={() => setShowActionSheet(false)}
            options={[
              {
                label: "Signaler le joueur",
                onClick: () => {
                  setShowActionSheet(false);
                  setShowReportReason(true);
                },
              },
              {
                label: "Bloquer le joueur",
                destructive: true,
                onClick: () => {
                  setShowActionSheet(false);
                  blockMutation.mutate();
                },
              },
            ]}
          />
          <ReportReasonModal
            open={showReportReason}
            onClose={() => setShowReportReason(false)}
            onSubmit={(reason) => reportMutation.mutate(reason)}
            isSubmitting={reportMutation.isPending}
          />
        </>
      )}
    </BottomSheet>
  );
}
