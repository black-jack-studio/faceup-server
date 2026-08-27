import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerHapticTick } from "@/lib/haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { EMOTE_CATALOG, type EmoteEntry } from "@/data/emotes";
import { useEmoteLoadoutStore } from "@/store/emote-loadout-store";
import { useUserStore } from "@/store/user-store";
import { gameService } from "@/services/gameService";
import { showRewardedAd } from "@/lib/admob";
import { BetSlider } from "@/components/BetSlider";
import { MovingBorder } from "@/components/ui/moving-border";
import SwapIcon from "@/components/icons/SwapIcon";
import WatchAdIcon from "@/components/icons/WatchAdIcon";
import PlayingCard from "./card";
import RollingTotal from "./play/RollingTotal";
import { getSeatDisplayOrder, type SeatPosition } from "@/lib/tableSeats";
import type { Card, PlayerHand } from "@shared/blackjack-types";
import { formatFullNumber } from "@/lib/formatUtils";
import { playSound } from "@/lib/sound";

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
  // Set fresh on every new deal (dealTableHand), unchanged for the rest of that hand including
  // settlement — a stable "which hand is this" signal, unlike dealerHand's own contents (see
  // the dealer reveal effect below for why those aren't safe to key off).
  deckSeed: string | null;
}

interface FriendsTableViewProps {
  tableId: string;
  table: TableInfo;
  seats: TableSeatInfo[];
  currentUserId: string;
  balance: number;
  // Owned by friends-lobby.tsx via useUserStore, same as balance — the caller's current Swap
  // token count, shown on the Swap button and used to decide whether tapping it spends one or
  // offers a rewarded ad instead (see hasSwapTokens below).
  swapTokens: number;
  // My own seat's simulated win probability for the current hand (see GET /api/tables/:id and
  // handStrength.ts) — only present while the swap window is open (first decision, not yet
  // swapped). undefined reads as "not eligible", same as Classic solo's identical field.
  winProbability?: number;
  myPosition: SeatPosition | null;
  // userId -> the emote currently showing above their avatar, and a `key` that changes on
  // every send so re-tapping the same emote restarts the pop-in instead of AnimatePresence
  // treating it as unchanged. Owned by friends-lobby.tsx (see its own comment) since that's
  // where the table socket already lives — this component only ever reads it.
  emotesBySeat: Record<string, { emoteId: string; key: number }>;
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

// Swipe up/down transition: keyed off `direction` (1 = moving to emotes, -1 = moving to
// avatar) via AnimatePresence's custom prop, not off showEmotes directly — both states share
// the same two variants, just mirrored, so swiping up always feels like content rising past
// and swiping down always feels like it's sinking away, regardless of which one is entering.
// A full 100% (the card's own height, not a small fixed px nudge) so the incoming panel
// visibly slides in from off-card rather than just fading in a few pixels off — that's what
// read as an abrupt pop instead of an actual glide. absolute inset-0 (set on the two
// motion.div below, not here) keeps both panels stacked exactly on top of each other for the
// crossfade instead of the entering one only reaching its final position once the exiting one
// (still mid-slide-out) has cleared normal flow.
const seatCardVariants = {
  enter: (direction: number) => ({ y: direction > 0 ? "100%" : "-100%" }),
  center: { y: 0 },
  exit: (direction: number) => ({ y: direction > 0 ? "-100%" : "100%" }),
};

// The player's own seat card (bottom seat only — friends' seats don't get this). Swipe up to
// reveal the 4 equipped emotes (client/src/store/emote-loadout-store.ts, same loadout picked on
// the Emotes page under Profile) in place of the avatar/total, swipe down to return. Pulled
// into its own component (rather than inlined in renderSeat below, a plain function, not a
// component) so its own useState is actually legal — renderSeat is called directly as a
// function, not rendered as JSX, so hooks inside it would violate the rules of hooks.
function MySeatCard({
  avatarImage,
  username,
  revealedTotal,
  isTurn,
  onSelectEmote,
}: {
  avatarImage: string | undefined;
  username: string;
  revealedTotal: number;
  isTurn: boolean;
  onSelectEmote: (emoteId: string) => void;
}) {
  const [showEmotes, setShowEmotes] = useState(false);
  const [direction, setDirection] = useState(1);
  const loadout = useEmoteLoadoutStore((state) => state.loadout);
  const loadoutEntries = loadout
    .map((id) => EMOTE_CATALOG.find((entry) => entry.id === id))
    .filter((entry): entry is EmoteEntry => !!entry);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -40) {
      setDirection(1);
      setShowEmotes(true);
    } else if (info.offset.y > 40) {
      setDirection(-1);
      setShowEmotes(false);
    }
  };

  // Local-only mirror of the same 2.5s window friends-lobby.tsx keeps the badge up for on
  // everyone else's screen — this component has no idea that timer even exists (it's the
  // receiving side's own state), so it just replays the same duration here rather than
  // trying to share it. The 4-emote grid swaps out for the tapped emote, centered, then swaps
  // back — never back to the avatar, since the player is still mid-browsing their loadout.
  // `sentKey` (not entry.id) is what AnimatePresence keys the popped-in emote on — tapping the
  // *same* emote a second time, right after the first cycle clears, would otherwise reuse the
  // exact same key and React would treat it as the same node rather than a fresh mount, so it'd
  // just sit there at animate="animate" instead of replaying the pop-in.
  const [sentEmote, setSentEmote] = useState<{ entry: EmoteEntry; sentKey: number } | null>(null);
  const sentEmoteTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(sentEmoteTimerRef.current);
  }, []);

  const handleSelectEmote = (entry: EmoteEntry) => {
    // Some web/WebView contexts throw synchronously here instead of rejecting the promise —
    // .catch alone wouldn't save the send below from a synchronous throw, so this whole call
    // is wrapped rather than just chained.
    try {
      triggerHapticTick();
    } catch {
      // Haptics unavailable — never let that block the actual emote send/animation below.
    }
    onSelectEmote(entry.id);
    setSentEmote({ entry, sentKey: Date.now() });
    clearTimeout(sentEmoteTimerRef.current);
    sentEmoteTimerRef.current = setTimeout(() => setSentEmote(null), 2500);
  };

  return (
    <div className="relative w-full h-[141px] rounded-2xl border border-white/10 bg-[#141417] overflow-hidden">
      {/* dragElastic 0 (not a little give like most drag-to-dismiss gestures): this box is
          purely a gesture sensor here, it never visibly follows the finger. It used to snap
          back with its own bounce AFTER release, at the same time as the content below started
          its own separate slide — two overlapping motions read as one stutter/hitch instead of
          one continuous swipe. Now only the content transition below actually animates. */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        className="w-full h-full"
      >
        {/* mode="popLayout": the exiting card is taken out of flow the instant it starts
            leaving, instead of sitting there fighting the entering one for the same box for the
            whole crossfade — without it the swap read as a stutter rather than one continuous
            motion. initial={false}: no slide-in on first mount, only on an actual swap. */}
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          {showEmotes ? (
            <motion.div
              key="emotes"
              custom={direction}
              variants={seatCardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              {/* Same simultaneous-crossfade technique as the receiving side's avatar<->emote
                  swap (see renderSeat's avatarOrEmote) — both the outgoing and incoming element
                  animate at once rather than AnimatePresence's mode="wait" waiting for the exit
                  to finish first, which read as a stutter/gap instead of one continuous motion. */}
              <AnimatePresence initial={false}>
                {sentEmote ? (
                  <motion.div
                    key={`sent-${sentEmote.sentKey}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <img src={sentEmote.entry.image} alt={sentEmote.entry.name} className="w-24 h-24 object-contain" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                    // grid-cols-2 (tried previously) ties each image's position to half the
                    // card's own width, not to a direct distance from its neighbor — gap-x only
                    // changes that indirectly (shrinking both columns a little), so a big gap-x
                    // change barely moved the images at all. Two flex rows instead: gap-x here is
                    // the literal, direct pixel distance between the pair on each row,
                    // independent of the card's width. justify-between (not justify-center +
                    // gap-y) so the top/bottom rows sit a fixed py-5 away from the card's own
                    // border regardless of how far apart the two rows end up — a gap-y grows/
                    // shrinks the whole centered block instead, which stops guaranteeing a
                    // minimum edge margin as it's pushed wider.
                    className="w-full h-full flex flex-col items-center justify-between py-5"
                  >
                    <div className="flex items-center gap-x-7">
                      {loadoutEntries.slice(0, 2).map((entry) => (
                        <motion.button
                          key={entry.id}
                          type="button"
                          whileTap={{ scale: 0.82 }}
                          onTap={() => handleSelectEmote(entry)}
                          data-testid={`button-send-emote-${entry.id}`}
                        >
                          <img src={entry.image} alt={entry.name} className="w-9 h-9 object-contain pointer-events-none" />
                        </motion.button>
                      ))}
                    </div>
                    <div className="flex items-center gap-x-7">
                      {loadoutEntries.slice(2, 4).map((entry) => (
                        <motion.button
                          key={entry.id}
                          type="button"
                          whileTap={{ scale: 0.82 }}
                          onTap={() => handleSelectEmote(entry)}
                          data-testid={`button-send-emote-${entry.id}`}
                        >
                          <img src={entry.image} alt={entry.name} className="w-9 h-9 object-contain pointer-events-none" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="avatar"
              custom={direction}
              variants={seatCardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2"
            >
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <img src={avatarImage} alt={username} className="w-full h-full object-cover" />
                </div>
                {isTurn && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#7dd3fc]" />}
              </div>
              {/* Plain text, not RollingTotal: that component always plays its digit-roll-in
                  animation on mount, and this panel remounts fresh every time you swipe back
                  from the emote grid — the roll-in replayed every single swipe, reading as the
                  hand total scrolling back up out of nowhere. */}
              <span className="text-white text-2xl font-bold">{revealedTotal}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Page dots, right edge / vertically centered — vertical (not the usual horizontal
          carousel row) since the gesture switching between them is itself vertical. */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 pointer-events-none">
        <span className={`w-1.5 h-1.5 rounded-full ${!showEmotes ? "bg-white" : "bg-white/25"}`} />
        <span className={`w-1.5 h-1.5 rounded-full ${showEmotes ? "bg-white" : "bg-white/25"}`} />
      </div>
    </div>
  );
}

export default function FriendsTableView({ tableId, table, seats, currentUserId, balance, swapTokens, winProbability, myPosition, emotesBySeat }: FriendsTableViewProps) {
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

  // Swap — spends 1 Swap token (or, out of tokens, a rewarded ad) to redeal my seat's starting
  // 2-card hand from the table's shared deck (see POST /api/tables/:id/swap). Mirrors Classic
  // solo's identical flow (table-test.tsx); the difference here is it can only ever be legal on
  // my own turn, since this hand is played out one seat at a time rather than solo's single one.
  const swapMutation = useMutation({
    mutationFn: async (viaAd: boolean) => gameService.tableSwap(tableId, viaAd),
    onSuccess: (data) => {
      invalidate();
      if (typeof data.swapTokens === "number") {
        useUserStore.getState().updateUser({ swapTokens: data.swapTokens });
      }
    },
    onError: (error: any) => {
      toast({ title: "Couldn't swap", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  // Fire-and-forget, deliberately no onSuccess/onError toast — a missed emote isn't worth
  // interrupting the game over, and the sender gets no local echo either (see MySeatCard):
  // the whole point is what shows up on the *other* screens.
  const emoteMutation = useMutation({
    mutationFn: async (emoteId: string) => {
      await apiRequest("POST", `/api/tables/${tableId}/emote`, { emoteId });
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
  const isBusy = betMutation.isPending || actionMutation.isPending || swapMutation.isPending;

  // Same idea as the dealer's own reveal-gated total (see renderDealer): a hand's total
  // shouldn't count a card the instant it's dealt, only once that card's own flip has actually
  // finished — matches Classic mode's HandCards, which gates a player hand's total the same
  // way. One counter per screen slot (not per seat identity) since who's sitting left/right/
  // bottom can change between hands but the slot itself can't — declared unconditionally here
  // (never inside renderSeat, which isn't always called for every slot) since hooks can't be
  // called a variable number of times per render.
  const [leftRevealedCount, setLeftRevealedCount] = useState(0);
  const [rightRevealedCount, setRightRevealedCount] = useState(0);
  const [bottomRevealedCount, setBottomRevealedCount] = useState(0);
  const leftCardCount = leftFriendSeat?.hand?.cards.length ?? 0;
  const rightCardCount = rightFriendSeat?.hand?.cards.length ?? 0;
  const bottomCardCount = mySeat?.hand?.cards.length ?? 0;
  // A new (shorter) hand always drops revealedCount back to 0 the same way HandCards does —
  // there's no need to key this off deckSeed like the dealer's own reset does, since a fresh
  // deal can only ever start with fewer cards than a previous hand had after any hits.
  useEffect(() => {
    if (leftCardCount < leftRevealedCount) setLeftRevealedCount(0);
  }, [leftCardCount, leftRevealedCount]);
  useEffect(() => {
    if (rightCardCount < rightRevealedCount) setRightRevealedCount(0);
  }, [rightCardCount, rightRevealedCount]);
  useEffect(() => {
    if (bottomCardCount < bottomRevealedCount) setBottomRevealedCount(0);
  }, [bottomCardCount, bottomRevealedCount]);
  const revealedCountBySlot: Record<SeatPosition, number> = {
    left: leftRevealedCount,
    right: rightRevealedCount,
    bottom: bottomRevealedCount,
  };
  const bumpRevealedCount = (slot: SeatPosition, cardIndex: number) => {
    const setters: Record<SeatPosition, Dispatch<SetStateAction<number>>> = {
      left: setLeftRevealedCount,
      right: setRightRevealedCount,
      bottom: setBottomRevealedCount,
    };
    setters[slot]((prev) => {
      if (cardIndex !== prev) return prev;
      playSound("cardFlip");
      return prev + 1;
    });
  };

  const dealerCards = table.dealerHand || [];
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

  // Resets the reveal sequence only when a genuinely new hand is dealt — keyed on deckSeed
  // (fresh every deal, unchanged for the rest of that hand) rather than dealerHand's own
  // contents. The settlement that reveals the hole card and deals the dealer's hits all lands
  // in one single update (the server plays out the dealer's whole hand server-side before
  // sending anything), which changes dealerHand's contents just as much as a new deal does —
  // keying off that used to reset mountedCount/revealedCount right as that same update arrived,
  // wiping out exactly the state the reveal cascade below needed to pick up from. That's what
  // made the total update late, or only once the next card flipped instead of this one.
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
  }, [table.deckSeed]);

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
                playSound("cardFlip");
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

    // Whatever this seat's own userId last had broadcast via emote_sent — see friends-lobby.tsx,
    // which owns the timer that clears this back out a couple seconds later. Read by both
    // avatar renderings below (this seat's own pre-deal avatarBlock, and the side-seat block
    // further down) since either can be on screen when a friend sends one.
    const incomingEmote = emotesBySeat[seat.userId];
    const incomingEmoteEntry = incomingEmote ? EMOTE_CATALOG.find((e) => e.id === incomingEmote.emoteId) : undefined;
    // `key` is the send's own timestamp, not entry.id, so tapping the same emote twice in a
    // row still replays the swap instead of AnimatePresence treating it as the same node.
    // AnimatePresence itself has to stay mounted across the on/off toggle (only the avatar/
    // emote motion elements inside it come and go) — conditioning the wrapper on
    // incomingEmoteEntry too would unmount it in the same render as whichever child it's
    // supposed to be crossfading out, skipping that exit animation entirely. Both the outgoing
    // and incoming element animate at once (not AnimatePresence's mode="wait", which would
    // fully finish the exit before starting the enter) — a true crossfade reads smoother than a
    // sequential fade-out-then-fade-in, per Anatole's request. initial={false}: no fade-in the
    // very first time this mounts, only on an actual avatar<->emote swap.
    const avatarOrEmote = (
      <AnimatePresence initial={false}>
        {incomingEmoteEntry ? (
          <motion.img
            key={`emote-${incomingEmote!.key}`}
            src={incomingEmoteEntry.image}
            alt={incomingEmoteEntry.name}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 w-12 h-12 object-contain pointer-events-none"
          />
        ) : (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 w-12 h-12 rounded-full overflow-hidden"
          >
            <img src={avatar?.image} alt={seat.username} className="w-full h-full object-cover" />
          </motion.div>
        )}
      </AnimatePresence>
    );

    const avatarBlock = (
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative w-12 h-12">
          {avatarOrEmote}
          {isTurn && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7dd3fc] z-10" />}
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
              <PlayingCard
                suit={card.suit}
                value={card.value}
                size="xs"
                radius={8}
                revealDelay={cardFallDelay + 0.4}
                onFlipComplete={() => bumpRevealedCount(displaySlot, i)}
              />
            </motion.div>
          );
        })}
      </motion.div>
    );

    // Same reveal-gated counting as the dealer's own total (see renderDealer) and Classic
    // mode's HandCards — only counts a card once its own flip has actually finished, instead
    // of jumping to the new total the instant a hit is dealt, before the card even lands.
    const revealedTotal = handTotal(seat.hand?.cards.slice(0, revealedCountBySlot[displaySlot]) ?? []);
    const totalLabel = hasDealtHand && (
      <RollingTotal value={revealedTotal} className="text-white text-sm font-semibold" />
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
                <span className="text-[11px] font-medium text-white/50">
                  {`Bet ${formatFullNumber(seat.betAmount ?? 0)}`}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-white/60">
                  {`Balance ${formatFullNumber(balance)}`}
                </span>
              )
            )}
          </div>
        );
      }

      // Rows of 2 (cards 1-2 on row 1, 3-4 on row 2, 5-6 on row 3), inside one fixed 156x141 box
      // (BLOCK_W x BLOCK_H — the same footprint MySeatCard next to it has always had), never
      // bigger, top and bottom always flush with it, and every row flush left/right with it too
      // (Hit's left edge, Double's right edge) so nothing above or beside it ever moves.
      // Horizontal and vertical scale are solved separately (scaleX/scaleY, not one uniform
      // `scale`) because they're fighting different constraints: width has to land exactly on
      // BLOCK_W given a real, clearly-visible overlap (BASE_OVERLAP), which needs cards ~7%
      // wider than their native 98px — but height has to shrink *down* to fit extra rows in
      // BLOCK_H, the opposite direction. SCALE_X is a flat constant (the width/overlap equation
      // has no row-count term in it — 2 cards at a fixed overlap fraction only balances at one
      // specific width, whatever row they're on), while SCALE_Y is the one that answers "how
      // many rows deep is this hand" and shrinks accordingly.
      const BLOCK_W = 156;
      const BLOCK_H = 141;
      const ROW_CAPACITY = 2;
      const FULL_CARD_W = 98;
      const FULL_CARD_H = 141;
      const BASE_OVERLAP = 50;
      // Solves 2*cardW - overlap = BLOCK_W where both cardW and overlap scale together by the
      // same factor (cardW = FULL_CARD_W*SCALE_X, overlap = BASE_OVERLAP*SCALE_X) — the only
      // scale at which a 2-up row hits BLOCK_W exactly while keeping BASE_OVERLAP's overlap
      // *proportion*, so a row never falls short of Double's edge the way a fixed 98px card
      // width did once BASE_OVERLAP grew past the ~40px that used to make 98px land exactly.
      const SCALE_X = BLOCK_W / (2 * FULL_CARD_W - BASE_OVERLAP);
      const cardW = FULL_CARD_W * SCALE_X;
      const overlap = BASE_OVERLAP * SCALE_X;
      // How far down an unscaled card its own rank digit box reaches (pad + rank glyph height,
      // see card.tsx's "friend" preset) — each extra row tucks in this fraction of the row
      // above's own (scaled) height instead of a flat px offset, so it still lands right under
      // the rank digit no matter how much a many-row hand has had to shrink.
      const RANK_ZONE_FRACTION = 50 / 141;
      const cardCount = seat.hand!.cards.length;
      const rowCount = Math.ceil(cardCount / ROW_CAPACITY);
      const SCALE_Y = rowCount <= 1 ? 1 : 1 / (1 + (rowCount - 1) * RANK_ZONE_FRACTION);
      const cardH = FULL_CARD_H * SCALE_Y;
      const ROW_Y_STEP = rowCount > 1 ? (BLOCK_H - cardH) / (rowCount - 1) : 0;
      return (
        <div className="w-full flex flex-col items-center gap-2" data-testid={`seat-${position}`}>
          <div className="w-full grid grid-cols-2 gap-3 items-center">
            <div className="flex justify-center">
              <div className="relative" style={{ width: BLOCK_W, height: BLOCK_H }}>
                {seat.hand!.cards.map((card, i) => {
                  const cardFallDelay = i < 2 ? i * 0.15 : 0;
                  const row = Math.floor(i / ROW_CAPACITY);
                  const col = i % ROW_CAPACITY;
                  const x = col * (cardW - overlap);
                  return (
                    <motion.div
                      key={i}
                      // Rises from below instead of falling from the top — only here, for my
                      // own seat: the dealer and friends' cards still fall from above, unchanged.
                      initial={{ y: 70, opacity: 0, scaleX: SCALE_X, scaleY: SCALE_Y, x }}
                      animate={{ y: 0, opacity: 1, scaleX: SCALE_X, scaleY: SCALE_Y, x }}
                      transition={{
                        duration: 0.4,
                        delay: cardFallDelay,
                        ease: "easeOut",
                      }}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: row * ROW_Y_STEP,
                        zIndex: col,
                        transformOrigin: "top left",
                      }}
                    >
                      <PlayingCard
                        suit={card.suit}
                        value={card.value}
                        size="friend"
                        radius={20}
                        revealDelay={cardFallDelay + 0.4}
                        onFlipComplete={() => bumpRevealedCount(displaySlot, i)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <MySeatCard
              avatarImage={avatar?.image}
              username={seat.username}
              revealedTotal={revealedTotal}
              isTurn={isTurn}
              onSelectEmote={(emoteId) => emoteMutation.mutate(emoteId)}
            />
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
          {avatarOrEmote}
          {isTurn && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7dd3fc] z-10" />}
        </div>

        {table.status === "betting" && (
          <span className={`text-[11px] font-medium ${seat.betConfirmed ? "text-white/50" : "text-white/40"}`}>
            {seat.betConfirmed ? `Bet ${formatFullNumber(seat.betAmount ?? 0)}` : isWaitingForBet ? "Waiting for bet…" : ""}
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

  // Same "first decision" window Double uses, plus gated on the hand actually being weak —
  // winProbability is a server-side Monte Carlo simulation against the table's real remaining
  // deck (see GET /api/tables/:id and handStrength.ts), refetched on every table update so it
  // stays current as earlier seats' turns draw down the shared deck. undefined (not my turn to
  // look at yet, or already past the window) reads as "not eligible" rather than flashing
  // enabled. Deliberately NOT gated on having a Swap token — see hasSwapTokens below, which
  // decides whether tapping it spends one or plays a rewarded ad instead.
  const swapEligible =
    table.status === "in_progress" &&
    !!mySeat?.hand &&
    mySeat.hand.status === "active" &&
    mySeat.hand.cards.length === 2 &&
    !mySeat.hand.swapped &&
    (winProbability ?? 1) < 0.5;
  // Whether tapping Swap right now would actually do anything — also requires it being my turn,
  // unlike Classic solo where there's no turn to wait for.
  const swapClickable = swapEligible && isMyTurn && !isBusy;
  // Once the slot has ever been worth showing for this hand, keep it in the row — greyed out —
  // rather than yanking it the instant a tap starts or it gets used, matching Double/Surrender's
  // own "stays put" behavior.
  const canSwap = swapEligible || swapMutation.isPending || !!mySeat?.hand?.swapped;
  const hasSwapTokens = swapTokens > 0;

  const handleSwap = async () => {
    if (!swapClickable) return;
    if (hasSwapTokens) {
      swapMutation.mutate(false);
    } else {
      // Out of tokens — the same button becomes "watch an ad to swap instead," same trust
      // model as the double-reward ad flow: the server only ever hears about this after the ad
      // actually played through.
      const earned = await showRewardedAd();
      if (!earned) return;
      swapMutation.mutate(true);
    }
  };

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
            <div className="w-full flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { playSound("buttonClick"); actionMutation.mutate("hit"); }}
                  disabled={isBusy || !isMyTurn}
                  className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${isMyTurn ? "bg-white/10 text-white" : "bg-white/5 text-white/25"}`}
                  data-testid="button-hit"
                >
                  Hit
                </button>
                <button
                  onClick={() => { playSound("buttonClick"); actionMutation.mutate("stand"); }}
                  disabled={isBusy || !isMyTurn}
                  className={`px-5 py-3 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${isMyTurn ? "bg-white/10 text-white" : "bg-white/5 text-white/25"}`}
                  data-testid="button-stand"
                >
                  Stand
                </button>
              </div>
              {/* Swap (see swapMutation above) only joins this row once it's actually usable
                  for the current hand — same "stays put once shown" treatment as Double/
                  Surrender once they stop being legal, via canSwap latching on. Double/
                  Surrender shrink to make room only while it's actually present. */}
              <div className={`grid gap-3 ${canSwap ? "grid-cols-3" : "grid-cols-2"}`}>
                <button
                  onClick={() => { playSound("buttonClick"); actionMutation.mutate("double"); }}
                  disabled={isBusy || !isMyTurn || !canDouble}
                  className={`px-2 py-3 rounded-xl text-sm font-bold truncate transition-colors disabled:cursor-not-allowed ${isMyTurn && canDouble ? "bg-white/10 text-white" : "bg-white/5 text-white/25"}`}
                  data-testid="button-double"
                >
                  Double
                </button>
                <button
                  onClick={() => { playSound("buttonClick"); actionMutation.mutate("surrender"); }}
                  disabled={isBusy || !isMyTurn || !canSurrender}
                  className={`px-2 py-3 rounded-xl text-sm font-bold truncate transition-colors disabled:cursor-not-allowed ${isMyTurn && canSurrender ? "bg-white/10 text-white/70" : "bg-white/5 text-white/20"}`}
                  data-testid="button-surrender"
                >
                  Surrender
                </button>
                {canSwap && (
                  // Same Aceternity "moving border" structure as GameResultOverlay's
                  // "Watch to 2X" and Classic solo's ActionBar Swap button: the button itself is
                  // the rounded-xl, overflow-hidden, p-[1.5px] clipping container — the glow is
                  // an absolutely-positioned inset-0 span traced by a small radial-gradient dot,
                  // fully clipped to the button's own corners. The inner span (offset from the
                  // button's edge by exactly that 1.5px padding, opaque #232227 fill) is what
                  // turns that clip into a thin traced ring instead of the dot showing through
                  // as a solid blob — keeps this button's opaque fill rather than matching Hit/
                  // Stand/Double/Surrender's own translucent bg-white/10 for that same reason.
                  <motion.button
                    onClick={() => {
                      if (!swapClickable) return;
                      playSound("buttonClick");
                      handleSwap();
                    }}
                    disabled={!swapClickable}
                    className={cn(
                      "relative rounded-xl p-[1.5px] overflow-hidden",
                      !swapClickable && "opacity-40 pointer-events-none"
                    )}
                    whileHover={swapClickable ? { scale: 1.02 } : {}}
                    whileTap={swapClickable ? { scale: 0.98 } : {}}
                    data-testid="button-swap"
                  >
                    {swapClickable && (
                      <span className="absolute inset-0 rounded-xl">
                        <MovingBorder duration={2200} rx="30%" ry="50%">
                          <div className="h-9 w-9 bg-[radial-gradient(#ffffff_40%,transparent_70%)] opacity-90" />
                        </MovingBorder>
                      </span>
                    )}
                    <span
                      className="relative flex items-center justify-center gap-1.5 w-full h-full rounded-xl ring-1 ring-white/10 bg-[#232227] px-2 py-3 text-[13px] font-medium truncate transition-transform duration-150 ease-out will-change-transform"
                      style={{ color: "#ffffff" }}
                    >
                      {!hasSwapTokens ? (
                        <WatchAdIcon className="w-3.5 h-3.5" />
                      ) : (
                        <SwapIcon className="w-3.5 h-3.5" />
                      )}
                      Swap
                      {hasSwapTokens && (
                        <span className="opacity-50 tabular-nums">{swapTokens}</span>
                      )}
                    </span>
                  </motion.button>
                )}
              </div>
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
          <p className="text-3xl font-light tracking-tight text-white">{formatFullNumber(betValue)}</p>
          <BetSlider min={1} max={Math.max(1, balance)} value={betValue} onChange={setBetValue} disabled={isBusy} />
          <button
            onClick={() => { playSound("chipBet"); betMutation.mutate(betValue); }}
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
