import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { BetSlider } from "@/components/BetSlider";
import PlayingCard from "./card";
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

// One reel per digit — only the digits that actually changed roll (old one slides up and out,
// new one slides in from below), instead of the whole number swapping at once. Keyed by
// position, not by the digit's own identity, so "10" -> "13" only rolls the last digit (the
// "1" at index 0 never unmounts since its key doesn't change) — matches how a real odometer
// only spins the wheels that need to.
function RollingDigit({ digit }: { digit: string }) {
  return (
    // A digit's default line-height reaches beyond its own font-size box, so a container
    // sized to exactly "1em" clips the bottom of the glyph the instant overflow-hidden kicks
    // in — happened to look like the roll got cut off mid-spin, but it was really just as
    // visible at rest. Centering the digit with flex (rather than relying on line-height to
    // land it right) keeps it fully inside the 1em box regardless of the font's own metrics.
    <span className="relative inline-block overflow-hidden leading-none" style={{ height: "1em" }}>
      <span className="invisible">{digit}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center leading-none"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function RollingTotal({ value, className }: { value: number; className?: string }) {
  return (
    <span className={className}>
      {value.toString().split("").map((digit, i) => (
        <RollingDigit key={i} digit={digit} />
      ))}
    </span>
  );
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
  const leftFriendSeat = seatByPosition(leftAbs);
  const rightFriendSeat = seatByPosition(rightAbs);
  // With just one friend seated, center them instead of leaving an empty slot on the other
  // side — that slot only makes sense once there's a second friend to fill it too.
  const soloFriendSlot = leftFriendSeat && !rightFriendSeat ? "left" : !leftFriendSeat && rightFriendSeat ? "right" : null;
  const mySeat = seats.find((s) => s.userId === currentUserId);
  const isMyTurn = table.status === "in_progress" && table.currentTurnUserId === currentUserId;
  const isBusy = betMutation.isPending || actionMutation.isPending;

  const dealerCards = table.dealerHand || [];
  // A stable primitive (not the array reference, which is fresh on every refetch even with
  // identical content) — the effect below should only ever restart for an actually different
  // dealer hand, never a background poll that happened to land during the reveal sequence.
  const dealerHandKey = dealerCards.map((c) => `${c.suit}:${c.value}`).join(",");
  const dealerHasHiddenCard = dealerCards.some((c) => c.value === "?");
  // How many of the dealer's cards are actually mounted in the DOM right now — not just
  // flip-delayed while already sitting there face down. A hit card beyond the starting two
  // shouldn't exist at all (not even as a face-down back) until it's genuinely that card's
  // turn to be drawn and revealed.
  const [dealerMountedCount, setDealerMountedCount] = useState(dealerCards.length);
  // How many of the dealer's cards count towards the total badge. Deliberately lags behind
  // dealerMountedCount: a card's value shouldn't visibly change the total the instant it
  // mounts (or the instant the hole card's real value is known) — only once that card's own
  // flip has actually finished turning over.
  const [dealerRevealedCount, setDealerRevealedCount] = useState(dealerHasHiddenCard ? 1 : dealerCards.length);

  useEffect(() => {
    if (dealerHasHiddenCard) {
      // Mid-hand: only the up-card's value is real and already showing, nothing to delay.
      setDealerMountedCount(dealerCards.length);
      setDealerRevealedCount(1);
      return;
    }
    // Settled: the hole card's real value is known and the dealer may have hit beyond the
    // starting two. The up-card already counts towards the total from the start; the hole card
    // itself starts mounted (face down) and every card after it only mounts, and only starts
    // counting towards the total, once the card before it reports its own flip actually
    // finished — see each PlayingCard's onFlipComplete below. A spring's settle time isn't a
    // fixed duration, so this can't be driven off a guessed setTimeout without drifting out of
    // sync with what's visibly still mid-rotation.
    setDealerMountedCount(Math.min(2, dealerCards.length));
    setDealerRevealedCount(dealerCards.length === 0 ? 0 : 1);
  }, [dealerHandKey]);

  const renderDealer = () => {
    const cards = dealerCards.slice(0, dealerMountedCount);
    if (cards.length === 0) return <div className="h-24" />;
    // Show a running total of whatever's actually visible (just the up-card while the hole
    // card is still hidden, or mid-reveal) instead of hiding the badge entirely until the
    // whole hand settles — handTotal bails to 0 the moment it hits a "?" card, so it must only
    // ever see cards whose flip has actually finished (see dealerRevealedCount above).
    const visibleCards = dealerCards.slice(0, dealerRevealedCount).filter((c) => c.value !== "?");
    return (
      // Full-width and centered here (not shrink-wrapped to the cards), so the total below is
      // anchored to a screen position that stays put as the dealer hits — the cards' own box
      // (the inline-block one below) grows and recenters on every hit, so anchoring the total
      // to *that* box's midpoint would drag it along with every new card the same way.
      <div className="relative w-full flex justify-center">
        <motion.div className="inline-block" layout="position" transition={{ duration: 0.4, ease: "easeOut" }}>
          <div className="flex">
            {cards.map((card, i) => {
              // Later cards stack on top of earlier ones (zIndex: i, increasing) — the dealer
              // can hit more than twice, and a card buried behind an earlier one is a card
              // nobody can actually see.
              //
              // Every card falls from the top and lands before it flips — never both at once —
              // so the flip's revealDelay is timed to start right as the fall finishes. The two
              // starting cards fall together but staggered slightly (like a real deal); a hit
              // card beyond them mounts alone (see dealerMountedCount above) so it never needs
              // that stagger. The hole card (index 1) is the one exception: it still falls
              // face down with the up-card, but its *flip* waits until well after — a beat past
              // the player's own last card — instead of following the fall.
              const cardFallDelay = i < 2 ? i * 0.15 : 0;
              const revealDelay = i === 1 ? 1.4 : cardFallDelay + 0.4;
              // Fires when this card's own flip visibly finishes: bump the total to include it,
              // and — since that's also exactly when the next card is allowed to appear — mount
              // the one after it, if any.
              const handleFlipComplete = () => {
                setDealerRevealedCount((prev) => Math.max(prev, i + 1));
                if (i + 1 < dealerCards.length) {
                  setDealerMountedCount((prev) => Math.max(prev, i + 2));
                }
              };
              return (
                <motion.div
                  key={i}
                  initial={{ y: -70, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: cardFallDelay, ease: "easeOut" }}
                  style={{ marginLeft: i > 0 ? -32 : 0, position: "relative", zIndex: i }}
                >
                  <PlayingCard
                    suit={card.suit}
                    value={card.value}
                    isHidden={card.value === "?"}
                    radius={16}
                    revealDelay={revealDelay}
                    onFlipComplete={handleFlipComplete}
                  />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
        {visibleCards.length > 0 && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2">
            <RollingTotal value={handTotal(visibleCards)} className="text-white text-lg font-semibold" />
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
        <div className="relative w-12 h-12">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
          </div>
          {isTurn && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7dd3fc]" />}
        </div>
        <span className="text-white text-xs font-medium">{seat.username}</span>
      </div>
    );

    const cardsOnly = hasDealtHand && (
      // layout on the row, not per card: layout on each card separately made them drift to
      // their new spot independently instead of moving together as one hand. "position" only
      // (not the default, which also animates size) — plain `layout` here faked the width
      // change with a scaleX correction, which squished every card horizontally for the
      // transition's duration before snapping back to normal, since the cards inside don't
      // actually resize when a new one is added, only the row's own width does.
      <motion.div layout="position" transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }} className="flex">
        {seat.hand!.cards.map((card, i) => {
          const cardFallDelay = i < 2 ? i * 0.15 : 0;
          return (
            <motion.div
              key={i}
              initial={{ y: -70, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: cardFallDelay, ease: "easeOut" }}
              style={{ marginLeft: i > 0 ? -16 : 0, position: "relative", zIndex: i }}
            >
              <PlayingCard suit={card.suit} value={card.value} size="xs" radius={8} revealDelay={cardFallDelay + 0.4} />
            </motion.div>
          );
        })}
      </motion.div>
    );

    const totalLabel = hasDealtHand && (
      <RollingTotal value={handTotal(seat.hand!.cards)} className="text-white text-sm font-semibold" />
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
            <motion.div layout="position" transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }} className="flex justify-center">
              {seat.hand!.cards.map((card, i) => {
                const cardFallDelay = i < 2 ? i * 0.15 : 0;
                return (
                  <motion.div
                    key={i}
                    initial={{ y: -70, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: cardFallDelay, ease: "easeOut" }}
                    style={{ marginLeft: i > 0 ? -overlapPx : 0, position: "relative", zIndex: i }}
                  >
                    <PlayingCard suit={card.suit} value={card.value} size="friend" radius={20} revealDelay={cardFallDelay + 0.4} />
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="w-full h-[141px] rounded-2xl border border-white/10 bg-[#141417] flex flex-col items-center justify-center gap-2">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
                </div>
                {isTurn && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#7dd3fc]" />}
              </div>
              <RollingTotal value={handTotal(seat.hand!.cards)} className="text-white text-2xl font-bold" />
            </div>
          </div>
        </div>
      );
    }

    // Side seats (friends) read top-to-bottom as username, avatar, cards, total — unlike the
    // player's own bottom seat, so this order is inlined here rather than reusing avatarBlock
    // (which puts the avatar above the username).
    return (
      <div className="flex flex-col items-center gap-0.5" data-testid={`seat-${position}`}>
        <span className="text-white text-xs font-medium">{seat.username}</span>
        <div className="relative w-12 h-12 mb-1.5">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
          </div>
          {isTurn && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7dd3fc]" />}
        </div>

        {table.status === "betting" && (
          <span className={`text-[11px] font-medium ${seat.betConfirmed ? "text-[#B5F3C7]" : "text-white/40"}`}>
            {seat.betConfirmed ? `Bet ${seat.betAmount?.toLocaleString()}` : isWaitingForBet ? "Waiting for bet…" : ""}
          </span>
        )}

        {hasDealtHand && (
          // The total sits absolutely below the cards instead of in normal flow — same trick as
          // the dealer's own total badge (see renderDealer). Otherwise its own height would get
          // counted as part of this seat's box, throwing off the friends-cards-to-dealer gap
          // that's supposed to match the dealer-to-buttons gap exactly (both come from the same
          // justify-between split further up, which only works if neither side's box includes
          // trailing text the other side doesn't have).
          <div className="relative flex flex-col items-center">
            {cardsOnly}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2">{totalLabel}</div>
          </div>
        )}
      </div>
    );
  };

  const canDouble = mySeat?.hand && mySeat.hand.cards.length === 2 && balance >= mySeat.hand.bet;
  const canSurrender = mySeat?.hand && mySeat.hand.cards.length === 2;

  return (
    <div className="flex-1 w-full flex flex-col items-center pb-4 min-h-0">
      {/* Always flex-1 regardless of whether the "waiting for…" block below is showing — ceding
          it a slice of this area (as a previous version did) shrank the main play area and
          visibly shifted every seat/button up whenever it appeared. */}
      <div className="w-full flex-1 flex flex-col items-center justify-between min-h-0">
        <div className={`w-full flex items-start px-2 ${soloFriendSlot ? "justify-center" : "justify-between"}`}>
          {soloFriendSlot === "left" ? renderSeat(leftAbs, "left") : soloFriendSlot === "right" ? renderSeat(rightAbs, "right") : (
            <>
              {renderSeat(leftAbs, "left")}
              {renderSeat(rightAbs, "right")}
            </>
          )}
        </div>

        <div className="flex-shrink-0">{renderDealer()}</div>

        <div className="w-full flex-shrink-0 flex flex-col items-center gap-3">
          {!!mySeat?.hand && (
            // Mounted for the whole hand, dealer reveal included — mySeat.hand is only ever
            // set while a hand is live or its just-settled result is still being reviewed
            // (see placeTableBet, which is what clears it back to null once someone bets
            // again), so this never shows during betting. Gating on table.status === "in_progress" too
            // used to hide the whole grid the instant the last seat acted and the table
            // flipped to "waiting" for the dealer's reveal — exactly when isMyTurn is already
            // false, so it just needs to stay mounted and dim rather than disappear.
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                onClick={() => actionMutation.mutate("hit")}
                disabled={isBusy || !isMyTurn}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${isMyTurn ? "bg-white/10 text-white" : "bg-white/5 text-white/25"}`}
                data-testid="button-hit"
              >
                Hit
              </button>
              <button
                onClick={() => actionMutation.mutate("stand")}
                disabled={isBusy || !isMyTurn}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${isMyTurn ? "bg-white/10 text-white" : "bg-white/5 text-white/25"}`}
                data-testid="button-stand"
              >
                Stand
              </button>
              <button
                onClick={() => actionMutation.mutate("double")}
                disabled={isBusy || !isMyTurn || !canDouble}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${isMyTurn && canDouble ? "bg-white/10 text-white" : "bg-white/5 text-white/25"}`}
                data-testid="button-double"
              >
                Double
              </button>
              <button
                onClick={() => actionMutation.mutate("surrender")}
                disabled={isBusy || !isMyTurn || !canSurrender}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${isMyTurn && canSurrender ? "bg-white/10 text-white/70" : "bg-white/5 text-white/20"}`}
                data-testid="button-surrender"
              >
                Surrender
              </button>
            </div>
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
    </div>
  );
}
