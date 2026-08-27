import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "@/icons";
import { AddUser } from "@/icons";
import NoEntry from "@/icons/NoEntry";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { useTableSocket } from "@/hooks/use-table-socket";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import BottomSheet from "@/components/BottomSheet";
import { BetSlider } from "@/components/BetSlider";
import FriendsTableView from "@/components/game/friends-table-view";
import GameResultOverlay, { type GameResultType } from "@/components/game/GameResultOverlay";
import { getSeatDisplayOrder, type SeatPosition } from "@/lib/tableSeats";
import type { Card, PlayerHand } from "@shared/blackjack-types";
import { formatFullNumber } from "@/lib/formatUtils";

function handTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.value === "?") return 0;
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
    deckSeed: string | null;
  };
  seats: TableSeatInfo[];
  // My own seat's simulated win probability (see handStrength.ts) — only present while my hand
  // is still in the swap-eligible window (first decision, not yet swapped). Drives whether
  // FriendsTableView's Swap button lights up, same as Classic solo's identical field.
  winProbability?: number;
}

interface FriendsLobbyProps {
  // Passed when rendered as Home's slide-up overlay (see home.tsx), same as BattlePassPage's
  // onClose — lets the close animation play with Home already mounted behind it instead of a
  // route swap leaving a black gap until Home mounts. Falls back to the route param/navigate("/")
  // when reached directly (deep-link push notification, or the standalone /play/friends-lobby
  // route), where there's no Home overlay wrapper to reveal underneath anyway.
  tableId?: string;
  onClose?: () => void;
}

// Play with Friends. This same screen covers create/join, invite, and betting — only
// "in_progress" (cards actually dealt) hands over to FriendsTableView. A fresh table starts
// straight in "betting" (see createGameTable), and a settled hand's brief "waiting" status
// gets the host's next start-hand fired automatically (below) rather than waiting on a
// button click, so there's no separate "Start Hand" screen to sit on.
export default function FriendsLobby({ tableId: tableIdProp, onClose }: FriendsLobbyProps = {}) {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/play/friends-lobby/:tableId");
  const tableId = tableIdProp ?? params?.tableId ?? null;
  const close = onClose ?? (() => navigate("/"));
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const loadUserCoins = useUserStore((state) => state.loadUserCoins);
  const balance = user?.coins || 0;
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [betValue, setBetValue] = useState(1);
  const [resultOverlay, setResultOverlay] = useState<{
    type: Exclude<GameResultType, null>;
    dealerTotal: number;
    playerTotal: number;
    startingBalance: number;
    endingBalance: number;
  } | null>(null);
  // Snapshotted the instant I confirm my bet — my own balance right before this hand's stake
  // left it, so the result sheet has a fixed number to count from instead of re-reading the
  // live (possibly already-credited) store balance once the hand settles.
  const preBetBalanceRef = useRef(balance);
  // Guards against re-showing the same settled hand's result on every background refetch
  // while the table sits in "waiting" — reset once my seat's hand clears for the next round.
  const resultShownRef = useRef(false);
  // True from the instant my hand settles until I dismiss the result sheet. Keeps
  // FriendsTableView on screen through that whole window (see showTableView below) instead of
  // cutting straight to the betting screen the moment the server moves past "in_progress" —
  // otherwise the dealer's hole-card reveal and any hit cards never get to finish (or even
  // start) their flip animation, and the result sheet would appear to float over the lobby
  // instead of over the table it actually belongs to.
  const [reviewingLastHand, setReviewingLastHand] = useState(false);
  // True once I've dismissed my own result sheet, until my seat's hand actually clears for the
  // next round. Without this, tapping to dismiss wouldn't reliably send me back to the betting
  // screen: my own seat's hand.result stays set server-side (and justSettledForMe stays true)
  // until the next hand is actually dealt, which — for a guest — depends on the host also
  // dismissing their own sheet first. My dismissal shouldn't wait on anyone else's.
  const [dismissedResult, setDismissedResult] = useState(false);

  // Live emotes: userId -> the emote currently showing above their avatar. Keyed by userId
  // (not stored per-seat) since it's purely a display overlay — FriendsTableView looks it up
  // per seat by that seat's own userId. `key` is a fresh value per send so re-tapping the same
  // emote still restarts its pop-in animation instead of AnimatePresence treating it as
  // unchanged. Cleared on its own timer rather than waiting for the next table refetch, since
  // this never touches the server's table state at all (see broadcastEmote).
  const [emotesBySeat, setEmotesBySeat] = useState<Record<string, { emoteId: string; key: number }>>({});
  const emoteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleIncomingEmote = useCallback((userId: string, emoteId: string) => {
    setEmotesBySeat((prev) => ({ ...prev, [userId]: { emoteId, key: Date.now() } }));
    clearTimeout(emoteTimersRef.current[userId]);
    emoteTimersRef.current[userId] = setTimeout(() => {
      setEmotesBySeat((prev) => {
        if (!(userId in prev)) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }, 2500);
  }, []);

  useEffect(() => {
    const timers = emoteTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  useTableSocket(tableId, handleIncomingEmote);

  // The zustand user store's coins are never touched by this screen's own table queries — a
  // hand's payout only lands in Postgres (see settleTableAndCredit), not in the client's own
  // idea of `user.coins`. Without this, `balance` (and the preBetBalanceRef snapshot taken from
  // it below) would just keep replaying whatever coin count was last loaded somewhere else
  // (e.g. Classic mode, or login), drifting further from the real total with every hand played
  // here — which is exactly what made a 1-coin loss look like it wiped out the whole balance.
  useEffect(() => {
    loadUserCoins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const mySeat = seats.find((s) => s.userId === user?.id);
  // Synchronous (not state) — true the instant this render sees my own settled result. Used
  // below alongside reviewingLastHand (state, set from an effect further down) rather than
  // relying on that state alone: a plain useEffect runs *after* the browser paints, so for one
  // frame after the query update that first reports my result, reviewingLastHand would still
  // read its old (false) value — enough to flash the betting screen before flipping right back
  // to the table view once the effect catches up. Reading this directly in the same render
  // that already has the fresh mySeat closes that gap.
  const justSettledForMe = !!mySeat?.hand?.result;
  // "betting" stays on this same lobby layout (code/seats/avatar visible throughout, just the
  // footer swaps to the bet slider) — only "in_progress" (cards actually dealt), or reviewing
  // the just-settled hand, hands off to FriendsTableView's dealer/hit/stand layout.
  const showTableView = table?.status === "in_progress" || reviewingLastHand || (justSettledForMe && !dismissedResult);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/tables/${tableId}`] });

  useEffect(() => {
    if (table?.status === "closed") {
      toast({ title: "Table closed", description: "Everyone has left the table." });
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.status, toast]);

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

  // Guards against leaving the same table twice: once set (by either path below), the other
  // becomes a no-op.
  const hasLeftRef = useRef(false);

  const leaveMutation = useMutation({
    mutationFn: async () => {
      hasLeftRef.current = true;
      await apiRequest("POST", `/api/tables/${tableId}/leave`);
    },
    onSuccess: () => close(),
    onError: (err: any) => {
      toast({ title: "Something went wrong", description: err?.message || "Please try again", variant: "destructive" });
    },
  });

  // Same "confirm before forfeiting" gate as Classic solo's handleLeaveTable — only while a
  // hand is actually live (cards dealt, not yet settled) does leaving cost anything, so that's
  // the only time it's worth interrupting the tap with a popup. Mid-betting or between hands,
  // leaving still just leaves (a confirmed-but-undealt bet gets refunded server-side, see
  // storage.leaveTable).
  const myHandIsLive = table?.status === "in_progress" && !!mySeat?.hand && mySeat.hand.result === null;
  const handleLeaveTable = () => {
    if (myHandIsLive) {
      setShowLeaveConfirm(true);
      return;
    }
    leaveMutation.mutate();
  };

  // The explicit Leave button isn't the only way off this screen — a hardware/gesture back
  // navigation unmounts this component too, without ever calling the mutation above. Left
  // unhandled, the table stays seated server-side forever, and the next "Create a game" just
  // 409s back to this same stale table. This cleanup is the backstop for every such exit.
  useEffect(() => {
    return () => {
      if (!hasLeftRef.current && tableId) {
        hasLeftRef.current = true;
        apiRequest("POST", `/api/tables/${tableId}/leave`).catch(() => {});
      }
    };
  }, [tableId]);

  const betMutation = useMutation({
    mutationFn: async (amount: number) => {
      await apiRequest("POST", `/api/tables/${tableId}/bet`, { amount });
    },
    onSuccess: invalidate,
    onError: (error: any) => {
      toast({ title: "Couldn't place bet", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  // betMutation.isSuccess only exists to bridge the brief gap between the bet request finishing
  // and the refetch it triggers actually landing (see betJustSent below) — it must not survive
  // past that, or it keeps the button stuck showing "Placing bet…" for the *next* hand too,
  // since nothing else ever resets it (a fresh mutate() call would, but the button looks
  // disabled the whole time it's stuck, so that click never happens). Once the refetched data
  // genuinely shows my bet went through, the gap it was covering for is over — reset it so
  // canBetNow's own ordinary betConfirmed check takes back over cleanly for whatever comes next.
  useEffect(() => {
    if (betMutation.isSuccess && mySeat?.betConfirmed) {
      betMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betMutation.isSuccess, mySeat?.betConfirmed]);

  // Tells the server I've personally moved past my own result sheet — see
  // storage.acknowledgeTableResult. Silent on failure: worst case my seat's leftover hand just
  // sits there a bit longer, which only delays the bet bar looking "ready" for everyone, nothing
  // destructive.
  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tables/${tableId}/acknowledge-result`);
    },
    onSuccess: invalidate,
  });

  // Each player's own result sheet, from their own seat's settled hand only — never anyone
  // else's. Mirrors Classic mode's GameResultOverlay: same win/loss/push/blackjack sheet, same
  // balance count-up, just fed from this table's seat data instead of game-store.
  //
  // reviewingLastHand flips on the instant the result is known (keeping FriendsTableView on
  // screen — see showTableView). The sheet itself waits before appearing, long enough for the
  // dealer's own cards to finish their one-at-a-time reveal (see friends-table-view's
  // renderDealer) instead of being instantly covered by the sheet sliding up — computed from
  // however many cards the dealer actually ended up with, since a couple of hits takes visibly
  // longer to reveal than a plain 2-card stand.
  //
  // Depends on just the result *string* (a stable primitive), not the hand object itself or
  // dealerHand — those are fresh object references on every background refetch even when
  // nothing actually changed, which would re-run this effect on each one and cancel+restart
  // (or just cancel, once resultShownRef already blocks re-entry) the pending timer via its own
  // cleanup before it ever got to fire.
  const myHandResult = mySeat?.hand?.result;
  useEffect(() => {
    if (myHandResult && !resultShownRef.current) {
      resultShownRef.current = true;
      setReviewingLastHand(true);
      // Brings the store's coins back in sync with what the server just credited/debited, so
      // the *next* hand's preBetBalanceRef snapshot (taken from `balance` below) starts from
      // the real total instead of whatever was last loaded before this hand was even played.
      loadUserCoins();
      // Captured now, from this render's closure — stays correct even if a later refetch
      // (e.g. once the next hand actually starts) resets these on the live table/seat data.
      const hand = mySeat!.hand!;
      const dealerCards = table?.dealerHand || [];
      // Mirrors friends-table-view's own dealer reveal timing: the hole card starts flipping
      // at 1.4s and takes 0.5s to settle (1.9s total — see card.tsx's tween duration), then
      // every hit card beyond it only mounts once the one before it has actually settled, each
      // adding its own 0.3s (default revealDelay) + 0.5s (flip duration) — plus a little
      // breathing room before the sheet slides up over it.
      const dealerRevealMs = (1.9 + Math.max(0, dealerCards.length - 2) * 0.8 + 0.3) * 1000;
      const timer = setTimeout(() => {
        const type: Exclude<GameResultType, null> =
          hand.result === "lose" ? "loss" : hand.result === "push" ? "tie" : hand.result === "blackjack" ? "blackjack" : "win";
        const starting = preBetBalanceRef.current;
        const ending = starting - hand.bet + (hand.payout || 0);
        // GameResultOverlay's startingBalance/endingBalance normally animate through the
        // player's whole account balance (that's what Classic mode wants). Here they're fed
        // this hand's own net change instead (0 -> +1, -1, ...) — at a 1-coin bet against a
        // balance in the thousands, counting through the real balance reads as "you lost your
        // whole stack" even though only the bet itself was ever at stake.
        setResultOverlay({
          type,
          dealerTotal: handTotal(dealerCards),
          playerTotal: handTotal(hand.cards),
          startingBalance: 0,
          endingBalance: ending - starting,
        });
      }, dealerRevealMs);
      return () => clearTimeout(timer);
    }
    if (!myHandResult) {
      resultShownRef.current = false;
      setDismissedResult(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myHandResult]);

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
          {/* Fixed-height slot, always rendered, regardless of whether there's any status text
              right now — same fix as the width-fix note above but for height: without it, this
              text popping in and out (e.g. every seat's "Lost"/"Won" clearing the instant
              someone confirms the next bet) changed the seat's own box height, which shoved the
              avatar above it up or down since this column sits inside a justify-between layout. */}
          <div className="h-4 flex items-center justify-center">
            {seat.hand?.result ? (
              <span
                className={`text-[11px] font-bold ${
                  seat.hand.result === "lose" ? "text-red-400" : seat.hand.result === "push" ? "text-yellow-400" : "text-[#B5F3C7]"
                }`}
              >
                {seat.hand.result === "lose" ? "Lost" : seat.hand.result === "push" ? "Push" : "Won"}{" "}
                {formatFullNumber(seat.hand.result === "lose" ? seat.hand.bet : seat.hand.payout || 0)}
              </span>
            ) : table?.status === "betting" && (seat.betConfirmed || seat.userId !== user?.id) ? (
              // Not-yet-confirmed is only shown for other seats — my own pending bet is already
              // the big slider below, so repeating "Waiting for bet…" under my own avatar too
              // would just be noise.
              <span className={`text-[11px] font-medium ${seat.betConfirmed ? "text-white/50" : "text-white/40"}`}>
                {seat.betConfirmed ? `Bet ${formatFullNumber(seat.betAmount ?? 0)}` : "Waiting for bet…"}
              </span>
            ) : null}
          </div>
        </div>
      );
    }

    // Any seated player can invite a friend into an open seat, not just the host — the server
    // already allows this (see /api/tables/:id/invite), only this UI used to gate it further.
    if (mySeat) {
      return (
        <button
          onClick={() => setShowInvitePicker(true)}
          className="flex flex-col items-center gap-2 mt-3.5"
          data-testid={`seat-invite-${position}`}
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-white bg-black flex items-center justify-center hover:bg-white/10 transition-colors">
            <AddUser className="w-6 h-6 text-white" />
          </div>
        </button>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2" data-testid={`seat-empty-${position}`}>
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/15 bg-white/5 flex items-center justify-center">
          <AddUser className="w-5 h-5 text-white/25" />
        </div>
        <span className="text-white/35 text-[11px] font-medium">Empty seat</span>
      </div>
    );
  };

  return (
    // Same slide-in as Settings sliding over Profile in App.tsx (x: "100%" -> 0, 0.28s
    // easeInOut tween). Only self-animates when reached directly by route (no onClose —
    // deep-link push notification, or the standalone /play/friends-lobby route): when rendered
    // as Home's overlay instead, home.tsx's own wrapper around <FriendsLobby> already plays
    // this exact slide, and animating both would compound into a double-distance motion.
    <motion.div
      className="fixed-safe-screen text-white p-6 overflow-hidden"
      style={{ backgroundColor: "#000000" }}
      initial={onClose ? false : { x: "100%" }}
      animate={{ x: 0 }}
      transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
    >
      <div className="max-w-md mx-auto h-full flex flex-col">
        {/* Plain div, not motion.div: only the page's own outer x-slide (above) should be
            visible on arrival — a separate fade/slide-in on this and the content block below
            used to layer a second animation on top of that swipe. */}
        <div className="relative flex items-center mb-5 pt-1 flex-shrink-0">
          <button
            onClick={handleLeaveTable}
            disabled={leaveMutation.isPending}
            className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors disabled:opacity-50"
            style={{ background: "transparent", border: "none", padding: 0 }}
            data-testid="button-leave-table"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {!showTableView && table?.code && (
            <button
              onClick={() => {
                navigator.clipboard?.writeText(table.code!);
                toast({ title: "Code copied", description: "Share it with a friend to join." });
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              data-testid="button-copy-table-code"
            >
              <span className="text-white text-lg font-bold tracking-[0.3em]">{table.code}</span>
            </button>
          )}
        </div>

        {isLoading || !table ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          // The result sheet (GameResultOverlay below) covers this swap while it's up, so what's
          // actually seen crossfading is its own backdrop fading out into whichever screen was
          // underneath the whole time — this is what made that reveal read as an abrupt jump cut
          // instead of one continuous motion. mode="wait" (not a sync crossfade): the table and
          // bet screens are wildly different heights/layouts, so overlapping them mid-transition
          // read as a layout jolt rather than a clean dissolve. Same easing curve the rest of the
          // app's sheet-opens already use (Battle Pass, Classic 21, ...) for a consistent feel.
          <AnimatePresence mode="wait" initial={false}>
            {showTableView ? (
              <motion.div
                key="table"
                className="flex-1 w-full min-h-0 flex flex-col"
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
                exit={{ opacity: 0, scale: 0.97, y: -12, transition: { duration: 0.2, ease: [0.55, 0, 0.85, 0.15] } }}
              >
                <FriendsTableView tableId={tableId} table={table} seats={seats} currentUserId={user?.id || ""} balance={balance} swapTokens={user?.swapTokens ?? 0} winProbability={data?.winProbability} myPosition={myPosition} emotesBySeat={emotesBySeat} />
              </motion.div>
            ) : (
              <motion.div
                key="bet"
                className="flex-1 flex flex-col items-center min-h-0 pt-2 gap-6"
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
                exit={{ opacity: 0, scale: 0.97, y: -12, transition: { duration: 0.2, ease: [0.55, 0, 0.85, 0.15] } }}
              >
                {/* The "triangle" — both side seats plus my own avatar — as a group in whatever
                    space is left above the bet bar, instead of spread across the whole screen (with
                    the code row and bet bar both eating into that spread too). justify-between here
                    (not a fixed gap) keeps the same distance between the side seats and my own seat
                    as before moving the code up to the header and separating the bet bar out. The
                    extra top padding replaces the room the code row used to take up above the side
                    seats — without it they sit right at the top of this area instead. */}
                <div className="flex-1 w-full flex flex-col items-center justify-between min-h-0 pt-20">
                  <div className="w-full flex items-start justify-between px-2">
                    {/* Fixed-width, centered slot for each seat — renderSeat's own box shrinks or
                        grows to fit whatever status text it's showing ("Waiting for bet…" vs
                        "Bet 25"), and since that box is left/right-anchored by justify-between, a
                        width change would otherwise drag the avatar sideways with it. Centering it
                        inside a slot of constant width keeps the avatar's own position fixed no
                        matter what the status text says. A narrower slot also sits its circle
                        further out towards its own edge — that's what spaces the two circles apart
                        from each other, not the gap between them directly. */}
                    <div className="w-28 flex justify-center">{renderSeat(leftAbs)}</div>
                    <div className="w-28 flex justify-center">{renderSeat(rightAbs)}</div>
                  </div>

                  {renderSeat(bottomAbs)}
                </div>

                <div className="flex flex-col items-center gap-6 flex-shrink-0 w-full">
                  {/* Always the same bet bar — never swapped out for a "Starting the next
                      hand…"/"Waiting for other players to bet…" placeholder text, which used to
                      make the whole footer flicker between different elements. It's just dimmed and
                      disabled whenever there's nothing to actually do yet (the next hand hasn't
                      opened betting, or my own bet is already confirmed and I'm waiting on others). */}
                  {(() => {
                    // While "waiting", every seat's betConfirmed starts out stale at `true` — left
                    // over from the round that already settled — and only flips to `false` once
                    // that seat's own player dismisses their result sheet (acknowledgeMutation/
                    // onDismiss). `hand` deliberately isn't touched by that: it needs to stick
                    // around, still showing "Lost 1"/"Won"/etc. under each seat, for as long as
                    // anyone else hasn't dismissed theirs yet — so it can't double as this signal.
                    // The button only goes active once every seat has acknowledged this way.
                    //
                    // Once the round genuinely reopens ("betting"), betConfirmed switches back to
                    // meaning the ordinary thing — have I placed *this* round's bet yet.
                    const allSeatsAcknowledged = seats.every((s) => !s.betConfirmed);
                    // isSuccess stays true after the mutation resolves, until a *new* mutate() call
                    // starts — bridging the gap between the POST actually finishing and the
                    // subsequent query refetch landing with mySeat.betConfirmed now true. Without
                    // this, that gap read as canBetNow flipping back to true for an instant (mySeat
                    // still showing its pre-bet, not-yet-confirmed data), which snapped the button
                    // from "Placing bet…" back to "Confirm bet" right before the screen actually
                    // moved on to the dealt hand.
                    const betJustSent = betMutation.isPending || betMutation.isSuccess;
                    const canBetNow =
                      !betJustSent &&
                      !!mySeat &&
                      ((table.status === "waiting" && allSeatsAcknowledged) || (table.status === "betting" && !mySeat.betConfirmed));
                    return (
                      <div className="w-full flex flex-col items-center gap-4">
                        <p className={`text-3xl font-bold ${canBetNow ? "text-white" : "text-white/25"}`}>{formatFullNumber(betValue)}</p>
                        <BetSlider min={1} max={Math.max(1, Math.min(5000, balance))} value={betValue} onChange={setBetValue} disabled={!canBetNow || betJustSent} />
                        <button
                          onClick={() => {
                            preBetBalanceRef.current = balance;
                            betMutation.mutate(betValue);
                          }}
                          disabled={!canBetNow || betJustSent || betValue <= 0 || betValue > balance || seats.length < 2}
                          className={`w-full py-4 text-base font-bold rounded-xl transition-colors disabled:cursor-not-allowed ${canBetNow ? "bg-white text-black disabled:opacity-50" : "bg-white/10 text-white/25"}`}
                          data-testid="button-confirm-table-bet"
                        >
                          {betJustSent
                            ? "Placing bet…"
                            : seats.length < 2
                              ? "Waiting for a friend to join…"
                              : !canBetNow
                                ? "Waiting for your friend…"
                                : "Confirm bet"}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Same rising bottom sheet every other popup in the app uses (Daily Streak, Player
          Stats, ...) instead of a centered Dialog — height="auto" since this list is short
          and fixed-size, same reasoning as Daily Streak's own sheet. */}
      <BottomSheet
        open={showInvitePicker}
        onClose={() => setShowInvitePicker(false)}
        height="auto"
        contentClassName="px-4 pt-2 pb-8"
      >
        <h2 className="text-xl font-bold text-white text-center mb-4">Invite a friend</h2>
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
                  className="w-full flex items-center gap-3 bg-black hover:bg-black rounded-xl p-3 transition-none disabled:opacity-50"
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
      </BottomSheet>

      {/* Same popup as Classic solo's own "Leave the table?" (table-test.tsx) — identical
          copy, colors, and stacked Leave/Stay layout, just fed this seat's own live bet. */}
      <BottomSheet
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        height="auto"
        contentClassName="px-6 pt-2 pb-8 flex flex-col items-center text-center"
      >
        <NoEntry size={56} />
        <h2 className="mt-3 text-xl font-bold text-white">Leave the table?</h2>
        <p className="mt-2 text-white/70 text-sm mb-6">
          You'll forfeit your {formatFullNumber(mySeat?.hand?.bet ?? 0)} coin bet. It won't be refunded.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => {
              setShowLeaveConfirm(false);
              leaveMutation.mutate();
            }}
            disabled={leaveMutation.isPending}
            className="w-full h-11 rounded-[18px] bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50"
            data-testid="button-confirm-leave-table"
          >
            {leaveMutation.isPending ? "Leaving…" : "Leave"}
          </button>
          <button
            onClick={() => setShowLeaveConfirm(false)}
            disabled={leaveMutation.isPending}
            className="w-full h-11 rounded-[18px] bg-black hover:bg-black text-white font-medium disabled:opacity-50"
            data-testid="button-cancel-leave-table"
          >
            Stay
          </button>
        </div>
      </BottomSheet>

      <GameResultOverlay
        show={!!resultOverlay}
        resultType={resultOverlay?.type ?? null}
        dealerTotal={resultOverlay?.dealerTotal ?? 0}
        playerTotal={resultOverlay?.playerTotal ?? 0}
        startingBalance={resultOverlay?.startingBalance ?? 0}
        endingBalance={resultOverlay?.endingBalance ?? 0}
        tableId={tableId}
        onDismiss={() => {
          setResultOverlay(null);
          setReviewingLastHand(false);
          // Sends me back to the betting screen right away — doesn't wait on a friend also
          // dismissing their own sheet (see dismissedResult above). The next betting round
          // isn't opened from here at all: placeTableBet itself lazily opens it the moment
          // anyone actually places a bet (see its comment in storage.ts), so nobody's dismissal
          // ever forces the table to move on before someone else still on their own result
          // sheet has had a chance to see it.
          setDismissedResult(true);
          // Lets the bet bar tell "everyone's back" from "just me" (see allSeatsAcknowledged
          // below) instead of looking ready to bet the instant I alone dismiss.
          acknowledgeMutation.mutate();
        }}
      />
    </motion.div>
  );
}
