import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TableInvite {
  id: string;
  tableId: string;
  inviterUsername: string;
}

// Play with Friends — pending table invites, polled the same way battlepass.tsx already
// polls for season/tier updates (no push notifications yet). Accepting drops the user
// straight into the lobby (client/src/pages/play/friends-lobby.tsx).
export default function TableInviteBanner() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery<{ invites: TableInvite[] }>({
    queryKey: ["/api/tables/invites"],
    refetchInterval: 15000,
  });

  const invites = data?.invites ?? [];

  const acceptMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest("POST", `/api/tables/invites/${inviteId}/accept`);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables/invites"] });
      navigate(`/play/friends-lobby/${result.tableId}`);
    },
    onError: (error: any) => {
      toast({ title: "Couldn't join", description: error?.message || "Please try again", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/tables/invites"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("POST", `/api/tables/invites/${inviteId}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables/invites"] });
    },
  });

  if (invites.length === 0) return null;

  return (
    <div className="px-6 mb-4 space-y-2">
      <AnimatePresence>
        {invites.map((invite) => (
          <motion.div
            key={invite.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3"
            data-testid={`invite-banner-${invite.id}`}
          >
            <p className="text-white text-sm">
              <span className="font-bold">{invite.inviterUsername}</span> invited you to play blackjack
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => declineMutation.mutate(invite.id)}
                disabled={declineMutation.isPending || acceptMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                data-testid={`button-decline-${invite.id}`}
              >
                Decline
              </button>
              <button
                onClick={() => acceptMutation.mutate(invite.id)}
                disabled={declineMutation.isPending || acceptMutation.isPending}
                className="px-3 py-1.5 text-xs font-bold bg-white text-black rounded-lg transition-colors disabled:opacity-50"
                data-testid={`button-accept-${invite.id}`}
              >
                Join
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
