import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { useTableSocket } from "@/hooks/use-table-socket";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FriendsTableView from "@/components/game/friends-table-view";
import { getSeatDisplayOrder, type SeatPosition } from "@/lib/tableSeats";
import type { Card, PlayerHand } from "@shared/blackjack-types";

interface TableSeatInfo {
  id: string;
  userId: string;
  position: SeatPosition;
  username: string;
  selectedAvatarId: string | null;
  betAmount: number | null;
  betConfirmed: boolean;
  hand: PlayerHand | null;
}

interface TableResponse {
  table: {
    id: string;
    hostUserId: string;
    status: "waiting" | "betting" | "in_progress" | "closed";
    mode: string;
    code: string | null;
    dealerHand: Card[] | null;
    currentTurnUserId: string | null;
  };
  seats: TableSeatInfo[];
}

// Play with Friends. The lobby (create/join, invite, live seats) is the "waiting" state;
// "betting"/"in_progress" hand over to FriendsTableView for the actual hand. A hand's result
// stays visible on the lobby view once settled (status returns to "waiting") until the host
// starts another one.
export default function FriendsLobby() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/play/friends-lobby/:tableId");
  const tableId = params?.tableId ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const balance = user?.coins || 0;
  const [showInvitePicker, setShowInvitePicker] = useState(false);

  useTableSocket(tableId);

  const { data, isLoading, isError, error } = useQuery<TableResponse>({
    queryKey: [`/api/tables/${tableId}`],
    enabled: !!tableId,
    refetchInterval: 5000, // backstop in case a WS nudge is missed
  });

  const { data: friendsData } = useQuery<{ friends: any[] }>({
    queryKey: ["/api/friends"],
    enabled: showInvitePicker,
  });

  const table = data?.table;
  const seats = data?.seats ?? [];
  const isHost = !!table && table.hostUserId === user?.id;
  const isLiveHand = table?.status === "betting" || table?.status === "in_progress";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/tables/${tableId}`] });

  useEffect(() => {
    if (table?.status === "closed") {
      toast({ title: "Table closed", description: "The host left the table." });
      navigate("/");
    }
  }, [table?.status, navigate, toast]);

  const inviteMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const response = await apiRequest("POST", `/api/tables/${tableId}/invite`, { friendId });
      return response.json();
    },
    onSuccess: () => {
      setShowInvitePicker(false);
      invalidate();
    },
    onError: (err: any) => {
      toast({ title: "Couldn't invite", description: err?.message || "Please try again", variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tables/${tableId}/leave`);
    },
    onSuccess: () => navigate("/"),
    onError: (err: any) => {
      toast({ title: "Something went wrong", description: err?.message || "Please try again", variant: "destructive" });
    },
  });

  const startHandMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tables/${tableId}/start-hand`);
    },
    onSuccess: invalidate,
    onError: (err: any) => {
      toast({ title: "Couldn't start the hand", description: err?.message || "Please try again", variant: "destructive" });
    },
  });

  if (!tableId) return null;

  if (isError) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: "#000000" }}>
        <p className="text-white/60 text-center">{(error as any)?.message || "This table isn't available."}</p>
        <button onClick={() => navigate("/")} className="text-white underline">Back home</button>
      </div>
    );
  }

  const seatByPosition = (position: SeatPosition) => seats.find((s) => s.position === position);
  const seatedUserIds = new Set(seats.map((s) => s.userId));
  const availableFriends = (friendsData?.friends ?? []).filter((f: any) => !seatedUserIds.has(f.id));

  // Always show my own seat at the bottom of my screen, others arranged around it — see
  // getSeatDisplayOrder's comment for why this isn't just "whatever the DB position is".
  const myPosition = seats.find((s) => s.userId === user?.id)?.position ?? null;
  const { bottomAbs, leftAbs, rightAbs } = getSeatDisplayOrder(myPosition);

  const renderSeat = (position: SeatPosition) => {
    const seat = seatByPosition(position);

    if (seat) {
      const avatar = seat.selectedAvatarId ? getAvatarById(seat.selectedAvatarId) : getDefaultAvatar();
      return (
        <div className="flex flex-col items-center gap-2" data-testid={`seat-filled-${position}`}>
          <div className="w-16 h-16 rounded-full overflow-hidden">
            <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
          </div>
          <span className="text-white text-xs font-medium">{seat.username}</span>
          {seat.hand?.result && (
            <span
              className={`text-[11px] font-bold ${
                seat.hand.result === "lose" ? "text-red-400" : seat.hand.result === "push" ? "text-yellow-400" : "text-[#B5F3C7]"
              }`}
            >
              {seat.hand.result === "lose" ? "Lost" : seat.hand.result === "push" ? "Push" : "Won"} {(seat.hand.payout || 0).toLocaleString()}
            </span>
          )}
        </div>
      );
    }

    if (isHost) {
      return (
        <button
          onClick={() => setShowInvitePicker(true)}
          className="flex flex-col items-center gap-2"
          data-testid={`seat-invite-${position}`}
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/25 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <UserPlus className="w-6 h-6 text-white/50" />
          </div>
          <span className="text-white/50 text-xs font-medium">Invite</span>
        </button>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2" data-testid={`seat-empty-${position}`}>
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/15 bg-white/5 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-white/25" />
        </div>
        <span className="text-white/35 text-[11px] font-medium">Empty seat</span>
      </div>
    );
  };

  return (
    <div className="fixed-safe-screen text-white p-6 overflow-hidden" style={{ backgroundColor: "#000000" }}>
      <div className="max-w-md mx-auto h-full flex flex-col">
        <motion.div
          className="flex items-center mb-8 pt-4 flex-shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
            className="flex items-center text-white/60 hover:text-white transition-colors disabled:opacity-50"
            data-testid="button-leave-table"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </motion.div>

        {isLoading || !table ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : isLiveHand ? (
          <FriendsTableView tableId={tableId} table={table} seats={seats} currentUserId={user?.id || ""} balance={balance} myPosition={myPosition} />
        ) : (
          <motion.div
            className="flex-1 flex flex-col items-center justify-start gap-10 min-h-0 pt-2 pb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {table.code && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(table.code!);
                  toast({ title: "Code copied", description: "Share it with a friend to join." });
                }}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
                data-testid="button-copy-table-code"
              >
                <span className="text-white text-2xl font-bold tracking-[0.3em]">{table.code}</span>
              </button>
            )}

            <div className="w-full flex items-start justify-between px-2">
              {renderSeat(leftAbs)}
              {renderSeat(rightAbs)}
            </div>

            <div className="flex flex-col items-center gap-6 flex-shrink-0">
              {renderSeat(bottomAbs)}

              {isHost ? (
                <button
                  onClick={() => startHandMutation.mutate()}
                  disabled={startHandMutation.isPending}
                  className="px-8 py-3 rounded-xl bg-white text-black text-sm font-bold disabled:opacity-50"
                  data-testid="button-start-hand"
                >
                  {startHandMutation.isPending ? "Starting…" : "Start Hand"}
                </button>
              ) : (
                <p className="text-white/30 text-xs text-center max-w-xs">
                  Waiting for the host to start the hand.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <Dialog open={showInvitePicker} onOpenChange={setShowInvitePicker}>
        <DialogContent className="bg-white/10 backdrop-blur-xl border-white/20 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Invite a friend</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {availableFriends.length === 0 ? (
              <p className="text-white/50 text-sm text-center py-6">
                No friends available to invite right now.
              </p>
            ) : (
              availableFriends.map((friend: any) => {
                const avatar = friend.selectedAvatarId ? getAvatarById(friend.selectedAvatarId) : getDefaultAvatar();
                return (
                  <button
                    key={friend.id}
                    onClick={() => inviteMutation.mutate(friend.id)}
                    disabled={inviteMutation.isPending}
                    className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-3 transition-colors disabled:opacity-50"
                    data-testid={`button-invite-${friend.username}`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <img src={avatar?.image} alt={friend.username} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-white font-medium text-sm">{friend.username}</span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
