import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { BetSlider } from "@/components/BetSlider";
import PlayingCard from "./card";
import { getSeatDisplayOrder, type SeatPosition } from "@/lib/tableSeats";
import type { Card, PlayerHand } from "@shared/blackjack-types";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';

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
  myPosition: SeatPosition | null;
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

export default function FriendsTableView({ tableId, table, seats, currentUserId, balance, myPosition }: FriendsTableViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [betValue, setBetValue] = useState(Math.min(25, Math.max(1, balance)));
  const { bottomAbs, leftAbs, rightAbs } = getSeatDisplayOrder(myPosition);

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
    // Show a running total of whatever's actually visible (just the up-card while the hole
    // card is still hidden) instead of hiding the badge entirely until the reveal — handTotal
    // bails to 0 the moment it hits a "?" card, so it must only ever see the revealed ones.
    const visibleCards = cards.filter((c) => c.value !== "?");
    return (
      <div className="relative inline-block">
        <div className="flex gap-1">
          {cards.map((card, i) => (
            <PlayingCard key={i} suit={card.suit} value={card.value} isHidden={card.value === "?"} />
          ))}
        </div>
        {visibleCards.length > 0 && (
          <div className="absolute -bottom-2 -right-4 flex items-center gap-1 bg-[#232227] rounded-xl pl-1.5 pr-2 py-1 shadow-lg">
            <img src={topHatImage} alt="Dealer hat" className="w-4 h-4 object-contain" />
            <span className="text-white text-xs font-semibold">{handTotal(visibleCards)}</span>
          </div>
        )}
      </div>
    );
  };

  // displaySlot (not the seat's absolute DB position) drives the card size — a seat showing in
  // the "left"/"right" screen slot gets smaller (size="xs") cards than the viewer's own.
  const renderSeat = (position: SeatPosition, displaySlot: SeatPosition) => {
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
    const isTurn = table.status === "in_progress" && table.currentTurnUserId === seat.userId;
    const isWaitingForBet = table.status === "betting" && !seat.betConfirmed;
    const hasDealtHand = !!seat.hand && (table.status === "in_progress" || table.status === "waiting");

    const avatarBlock = (
      <div className="flex flex-col items-center gap-1.5">
        <div className={`w-12 h-12 rounded-full overflow-hidden ${isTurn ? "ring-2 ring-[#B5F3C7]" : ""}`}>
          <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
        </div>
        <span className="text-white text-xs font-medium">{seat.username}</span>
      </div>
    );

    const cardsOnly = hasDealtHand && (
      <div className="flex gap-1">
        {seat.hand!.cards.map((card, i) => (
          <PlayingCard key={i} suit={card.suit} value={card.value} size="xs" />
        ))}
      </div>
    );

    const totalLabel = hasDealtHand && (
      <span className="inline-block bg-[#232227] rounded-xl px-2 py-1 text-white text-xs font-semibold shadow-lg">
        {handTotal(seat.hand!.cards)}
      </span>
    );

    const resultBadge = seat.hand?.result && (
      <span
        className={`text-[11px] font-bold ${
          seat.hand.result === "lose" ? "text-red-400" : seat.hand.result === "push" ? "text-yellow-400" : "text-[#B5F3C7]"
        }`}
      >
        {seat.hand.result === "lose" ? "Lost" : seat.hand.result === "push" ? "Push" : seat.hand.result === "blackjack" ? "Blackjack!" : "Won"}
        {" "}{(seat.hand.payout || 0).toLocaleString()}
      </span>
    );

    // My own seat lines up with the action buttons above it: cards sit under Hit/Double, and
    // a square avatar + total block — matching that column's own width — sits under
    // Stand/Surrender. That only makes sense once there's a hand to show — before that (still
    // betting), there are no buttons to line up with either, so keep the plain centered
    // avatar/bet-status stack instead of leaving an empty grid cell next to a lone square.
    if (displaySlot === "bottom") {
      if (!hasDealtHand) {
        return (
          <div className="flex flex-col items-center gap-2" data-testid={`seat-${position}`}>
            {avatarBlock}
            {table.status === "betting" && (
              seat.betConfirmed ? (
                <span className="text-[11px] font-medium text-[#B5F3C7]">
                  {`Bet ${seat.betAmount?.toLocaleString()}`}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-white/60">
                  {`Balance ${balance.toLocaleString()}`}
                </span>
              )
            )}
          </div>
        );
      }

      // The "friend" card size is sized to match the avatar/total block's height (141px) —
      // bigger than the rest of the app's cards. Fanned with an overlap (growing with the
      // hand size, so a 4-5 card hand from hitting doesn't blow past it either) instead of a
      // full gap, so a whole hand still stays inside the Hit/Double column's width. Kept
      // shallow enough at 2 cards (the common case) that the rank/suit — both inset 12px from
      // the card's own top-left corner — stay fully clear of the next card, not clipped.
      const overlapPx = seat.hand!.cards.length <= 2 ? 40 : seat.hand!.cards.length === 3 ? 69 : seat.hand!.cards.length === 4 ? 79 : 84;
      return (
        <div className="w-full flex flex-col items-center gap-2" data-testid={`seat-${position}`}>
          <div className="w-full grid grid-cols-2 gap-3 items-center">
            <div className="flex justify-center">
              {seat.hand!.cards.map((card, i) => (
                <div key={i} style={{ marginLeft: i > 0 ? -overlapPx : 0 }}>
                  <PlayingCard suit={card.suit} value={card.value} size="friend" />
                </div>
              ))}
            </div>

            <div className="w-full h-[141px] rounded-2xl border border-white/10 bg-[#141417] flex flex-col items-center justify-center gap-2">
              <div className="w-16 h-16 rounded-full overflow-hidden">
                <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
              </div>
              <span className="text-white text-2xl font-bold">{handTotal(seat.hand!.cards)}</span>
            </div>
          </div>
          {resultBadge}
        </div>
      );
    }

    // Side seats (friends) read top-to-bottom as username, avatar, cards, total — unlike the
    // player's own bottom seat, so this order is inlined here rather than reusing avatarBlock
    // (which puts the avatar above the username).
    return (
      <div className="flex flex-col items-center gap-0.5" data-testid={`seat-${position}`}>
        <span className="text-white text-xs font-medium">{seat.username}</span>
        <div className={`w-12 h-12 rounded-full overflow-hidden mb-1.5 ${isTurn ? "ring-2 ring-[#B5F3C7]" : ""}`}>
          <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
        </div>

        {table.status === "betting" && (
          <span className={`text-[11px] font-medium ${seat.betConfirmed ? "text-[#B5F3C7]" : "text-white/40"}`}>
            {seat.betConfirmed ? `Bet ${seat.betAmount?.toLocaleString()}` : isWaitingForBet ? "Waiting for bet…" : ""}
          </span>
        )}

        {hasDealtHand && (
          <div className="flex flex-col items-center gap-1.5">
            {cardsOnly}
            {totalLabel}
            {resultBadge}
          </div>
        )}
      </div>
    );
  };

  const canDouble = mySeat?.hand && mySeat.hand.cards.length === 2 && balance >= mySeat.hand.bet;
  const canSurrender = mySeat?.hand && mySeat.hand.cards.length === 2;

  return (
    <div className="flex-1 w-full flex flex-col items-center pb-4 min-h-0">
      <div className="flex-1 w-full flex flex-col items-center justify-between min-h-0">
        <div className="flex-shrink-0">{renderDealer()}</div>

        <div className="w-full flex items-start justify-between px-2">
          {renderSeat(leftAbs, "left")}
          {renderSeat(rightAbs, "right")}
        </div>

        <div className="w-full flex-shrink-0 flex flex-col items-center gap-3 -mt-4">
          {table.status === "in_progress" && mySeat?.hand && isMyTurn && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full grid grid-cols-2 gap-3">
              <button onClick={() => actionMutation.mutate("hit")} disabled={isBusy} className="px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-bold disabled:opacity-50" data-testid="button-hit">Hit</button>
              <button onClick={() => actionMutation.mutate("stand")} disabled={isBusy} className="px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-bold disabled:opacity-50" data-testid="button-stand">Stand</button>
              {canDouble && (
                <button onClick={() => actionMutation.mutate("double")} disabled={isBusy} className="px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-bold disabled:opacity-50" data-testid="button-double">Double</button>
              )}
              {canSurrender && (
                <button onClick={() => actionMutation.mutate("surrender")} disabled={isBusy} className="px-5 py-3 rounded-xl bg-white/10 text-white/70 text-sm font-bold disabled:opacity-50" data-testid="button-surrender">Surrender</button>
              )}
            </motion.div>
          )}
          {renderSeat(bottomAbs, "bottom")}
        </div>
      </div>

      {table.status === "betting" && mySeat && !mySeat.betConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs flex flex-col items-center gap-4 px-6"
        >
          <p className="text-white/50 text-xs uppercase tracking-wide">Your bet</p>
          <p className="text-3xl font-light tracking-tight text-white">{betValue.toLocaleString()}</p>
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

      {table.status === "in_progress" && mySeat?.hand && !isMyTurn && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full px-6 mt-4">
          <p className="text-white/40 text-xs text-center">
            {table.currentTurnUserId ? `Waiting for ${seats.find((s) => s.userId === table.currentTurnUserId)?.username || "…"}` : "Dealer's turn…"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
