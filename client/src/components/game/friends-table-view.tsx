import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { BetSlider } from "@/components/BetSlider";
import PlayingCard from "./card";
import type { Card, PlayerHand } from "@shared/blackjack-types";

type SeatPosition = "bottom" | "left" | "right";

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

interface TableInfo {
  id: string;
  hostUserId: string;
  status: "waiting" | "betting" | "in_progress" | "closed";
  mode: string;
  dealerHand: Card[] | null;
  currentTurnUserId: string | null;
}

interface FriendsTableViewProps {
  tableId: string;
  table: TableInfo;
  seats: TableSeatInfo[];
  currentUserId: string;
  balance: number;
}

function handTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.value === "?") return 0; // hidden card, nothing to total yet
    if (card.value === "A") {
      aces++;
      total += 11;
    } else if (["K", "Q", "J"].includes(card.value)) {
      total += 10;
    } else {
      total += parseInt(card.value, 10) || 0;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export default function FriendsTableView({ tableId, table, seats, currentUserId, balance }: FriendsTableViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [betValue, setBetValue] = useState(Math.min(25, Math.max(1, balance)));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/tables/${tableId}`] });

  const betMutation = useMutation({
    mutationFn: async (amount: number) => {
      await apiRequest("POST", `/api/tables/${tableId}/bet`, { amount });
    },
    onSuccess: invalidate,
    onError: (error: any) => {
      toast({ title: "Couldn't place bet", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (action: "hit" | "stand" | "double" | "surrender") => {
      await apiRequest("POST", `/api/tables/${tableId}/action`, { action });
    },
    onSuccess: invalidate,
    onError: (error: any) => {
      toast({ title: "Couldn't play that", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  const seatByPosition = (position: SeatPosition) => seats.find((s) => s.position === position);
  const mySeat = seats.find((s) => s.userId === currentUserId);
  const isMyTurn = table.status === "in_progress" && table.currentTurnUserId === currentUserId;
  const isBusy = betMutation.isPending || actionMutation.isPending;

  const renderDealer = () => {
    const cards = table.dealerHand || [];
    if (cards.length === 0) return <div className="h-24" />;
    const hidden = cards.some((c) => c.value === "?");
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1">
          {cards.map((card, i) => (
            <PlayingCard key={i} suit={card.suit} value={card.value} isHidden={card.value === "?"} />
          ))}
        </div>
        {!hidden && <span className="text-white/50 text-xs font-medium">{handTotal(cards)}</span>}
      </div>
    );
  };

  const renderSeat = (position: SeatPosition) => {
    const seat = seatByPosition(position);
    if (!seat) {
      return (
        <div className="flex flex-col items-center gap-2 opacity-30" data-testid={`seat-empty-${position}`}>
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/15 bg-white/5" />
          <span className="text-white/35 text-[11px]">Empty seat</span>
        </div>
      );
    }

    const avatar = seat.selectedAvatarId ? getAvatarById(seat.selectedAvatarId) : getDefaultAvatar();
    const isSelf = seat.userId === currentUserId;
    const isTurn = table.status === "in_progress" && table.currentTurnUserId === seat.userId;
    const isWaitingForBet = table.status === "betting" && !seat.betConfirmed;

    return (
      <div className="flex flex-col items-center gap-2" data-testid={`seat-${position}`}>
        <div className="flex flex-col items-center gap-1.5">
          <div className={`w-12 h-12 rounded-full overflow-hidden bg-white/10 ${isTurn ? "ring-2 ring-[#B5F3C7]" : "ring-1 ring-white/10"}`}>
            <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
          </div>
          <span className="text-white text-xs font-medium">{seat.username}{isSelf ? " (You)" : ""}</span>
        </div>

        {table.status === "betting" && (
          <span className={`text-[11px] font-medium ${seat.betConfirmed ? "text-[#B5F3C7]" : "text-white/40"}`}>
            {seat.betConfirmed ? `Bet ${seat.betAmount?.toLocaleString()}` : isWaitingForBet ? "Waiting for bet…" : ""}
          </span>
        )}

        {seat.hand && (table.status === "in_progress" || table.status === "waiting") && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1 scale-90">
              {seat.hand.cards.map((card, i) => (
                <PlayingCard key={i} suit={card.suit} value={card.value} />
              ))}
            </div>
            <span className="text-white/60 text-[11px]">{handTotal(seat.hand.cards)}</span>
            {seat.hand.result && (
              <span
                className={`text-[11px] font-bold ${
                  seat.hand.result === "lose" ? "text-red-400" : seat.hand.result === "push" ? "text-yellow-400" : "text-[#B5F3C7]"
                }`}
              >
                {seat.hand.result === "lose" ? "Lost" : seat.hand.result === "push" ? "Push" : seat.hand.result === "blackjack" ? "Blackjack!" : "Won"}
                {" "}{(seat.hand.payout || 0).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const canDouble = mySeat?.hand && mySeat.hand.cards.length === 2 && balance >= mySeat.hand.bet;
  const canSurrender = mySeat?.hand && mySeat.hand.cards.length === 2;

  return (
    <div className="flex flex-col items-center gap-10 py-6">
      {renderDealer()}

      <div className="flex items-start justify-center gap-14">
        {renderSeat("left")}
        {renderSeat("right")}
      </div>

      <div>{renderSeat("bottom")}</div>

      {table.status === "betting" && mySeat && !mySeat.betConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs flex flex-col items-center gap-4 px-6"
        >
          <p className="text-white/50 text-xs uppercase tracking-wide">Your bet</p>
          <p className="text-3xl font-bold text-white">{betValue.toLocaleString()}</p>
          <BetSlider min={1} max={Math.max(1, balance)} value={betValue} onChange={setBetValue} disabled={isBusy} />
          <button
            onClick={() => betMutation.mutate(betValue)}
            disabled={isBusy || betValue <= 0 || betValue > balance}
            className="w-full py-3 text-sm font-bold rounded-xl bg-white text-black disabled:opacity-50"
            data-testid="button-confirm-table-bet"
          >
            {betMutation.isPending ? "Placing bet…" : "Confirm bet"}
          </button>
        </motion.div>
      )}

      {table.status === "in_progress" && mySeat?.hand && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full px-6">
          {isMyTurn ? (
            <div className="flex justify-center gap-2">
              <button onClick={() => actionMutation.mutate("hit")} disabled={isBusy} className="px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-bold disabled:opacity-50" data-testid="button-hit">Hit</button>
              <button onClick={() => actionMutation.mutate("stand")} disabled={isBusy} className="px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-bold disabled:opacity-50" data-testid="button-stand">Stand</button>
              {canDouble && (
                <button onClick={() => actionMutation.mutate("double")} disabled={isBusy} className="px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-bold disabled:opacity-50" data-testid="button-double">Double</button>
              )}
              {canSurrender && (
                <button onClick={() => actionMutation.mutate("surrender")} disabled={isBusy} className="px-5 py-3 rounded-xl bg-white/10 text-white/70 text-sm font-bold disabled:opacity-50" data-testid="button-surrender">Surrender</button>
              )}
            </div>
          ) : (
            <p className="text-white/40 text-xs text-center">
              {table.currentTurnUserId ? `Waiting for ${seats.find((s) => s.userId === table.currentTurnUserId)?.username || "…"}` : "Dealer's turn…"}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
