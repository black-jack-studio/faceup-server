import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RollingTotal from "./RollingTotal";
import { cn } from "@/lib/utils";
import PlayingCard from "../card";
import { CardSize } from "@/components/PlayingCard";
import { Card } from "@/lib/blackjack/engine";
import { useUserStore } from "@/store/user-store";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';

// Standard blackjack total (aces count as 11, reduced to 1 as needed to stay <=21) — used only
// to show the dealer's running total in step with which of their own cards are actually
// revealed yet (see dealerMountedCount below), never the full/final total instantly.
function computeHandTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
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

interface HandCardsProps {
  cards: Card[];
  faceDownIndices?: number[];
  variant: "dealer" | "player";
  highlightTotal?: boolean;
  total?: number;
  className?: string;
  cardBackUrl?: string | null;
  showPositionedTotal?: boolean;
  // Dealer only: fires once, the moment every one of the dealer's cards has actually finished
  // its own reveal animation and none are still face down (i.e. the hand is genuinely settled,
  // not just "the server says gameOver"). A caller showing a win/loss result should wait on
  // this instead of a guessed timeout — a guessed one doesn't scale with how many cards the
  // dealer actually drew, so it could fire while several were still mid-animation.
  onDealerHandSettled?: () => void;
  // Overrides the size-by-card-count default (see CARD_WIDTH/cardSize below) — Play with
  // Friends needs its own fixed sizes per seat ("friend" for your own hand, "xs" for the
  // others) rather than Classic's "shrink once the hand gets long" rule.
  cardSize?: CardSize;
  // Forwarded straight to PlayingCard's own radius override — lets a caller keep corner
  // rounding consistent across differently-sized hands sharing one screen (Friends again: the
  // dealer, your own bigger cards, and friends' smaller ones all need to visually match).
  radius?: number;
  // Reports the same reveal-gated running total showPositionedTotal would otherwise render
  // internally — for a caller that wants to display it somewhere HandCards doesn't lay out
  // itself (Play with Friends' own seat puts its total in a square block beside the cards, not
  // above/below them). Leave showPositionedTotal off/false in that case so HandCards doesn't
  // also render its own copy of the number.
  onTotalChange?: (total: number) => void;
  // The caller already had a face-down placeholder pair sitting in this exact spot (the bet
  // screen's PlaceholderPair) right before this HandCards mounted — skips the initial two
  // cards' fall-in offset so they don't visibly jump away and re-land on top of where the
  // placeholder already was. Any card beyond those two (a hit) still falls in normally, since
  // nothing was already on the table for it.
  skipInitialFall?: boolean;
  // Renders this many face-down filler cards, at the same index/key slots a real hand would
  // later occupy, whenever `cards` is still empty — lets a caller mount HandCards immediately
  // on the betting screen (before any hand exists) instead of swapping in a separate
  // placeholder component once the deal happens. Because the filler cards share the real
  // cards' keys, React never unmounts them when `cards` actually arrives — each one just gets
  // new suit/value/isHidden props and plays its own reveal flip in place, with no gap where
  // nothing is on screen (see table-test.tsx for why that gap mattered).
  placeholderCount?: number;
  // Round end: flips every currently-dealt card back to its card-back face, in place, no
  // unmount — the caller keeps rendering the same (now-stale) `cards` data throughout this
  // phase and only actually clears it once the flip is done, so the swap to the next hand's
  // placeholder cards happens while everything's already showing its back (see table-test.tsx's
  // handleDismissResult). Independent of faceDownIndices, which is about which cards are
  // *dealt* face down (the dealer's hole card) — this is "show none of them, temporarily".
  forceHidden?: boolean;
}

// Actual rendered width (px) of each CardSize this component ever picks — kept in sync
// with PlayingCard's own sizeMap (client/src/components/PlayingCard.tsx).
const CARD_WIDTH: Record<CardSize, number> = { xs: 40, sm: 80, friend: 96, md: 96, lg: 120 };

// Cards always fan with the same constant overlap, from the 2nd card on — not just once a
// hand gets too wide to fit. The step (distance between each card's left edge) is a fixed
// fraction of the card's own width. At "sm" the suit icon alone runs from a 12px inset out to
// 44px (see PlayingCard's CardFace), so anything tighter than ~0.55 clips it — 0.65 leaves
// clear headroom for that plus two-digit ranks ("10").
const OVERLAP_RATIO = 0.65;
function computeCardStep(cardWidth: number) {
  return cardWidth * OVERLAP_RATIO;
}

export default function HandCards({
  cards,
  faceDownIndices = [],
  variant,
  highlightTotal = false,
  total,
  className,
  cardBackUrl,
  showPositionedTotal = false,
  onDealerHandSettled,
  cardSize: cardSizeOverride,
  radius,
  onTotalChange,
  skipInitialFall = false,
  placeholderCount,
  forceHidden = false,
}: HandCardsProps) {
  const isDealer = variant === "dealer";
  const user = useUserStore((state) => state.user);

  const currentAvatar = user?.selectedAvatarId ?
    getAvatarById(user.selectedAvatarId) :
    getDefaultAvatar();

  // The server resolves the dealer's whole turn (hole card reveal + every hit it draws) in one
  // response, so `cards` can jump from 2 to however many at once — without gating, every one of
  // those new cards animated in simultaneously instead of one at a time. Player-only: their
  // hits already arrive one server round-trip at a time, so there's nothing to stagger there —
  // dealerMountedCount stays equal to cards.length for a player hand, i.e. a no-op.
  const cardsKey = cards.map((c) => `${c.suit}:${c.value}`).join(",");
  const dealerStillHasHiddenCard = isDealer && faceDownIndices.length > 0;
  const [dealerMountedCount, setDealerMountedCount] = useState(() =>
    isDealer && !dealerStillHasHiddenCard ? Math.min(2, cards.length) : cards.length
  );

  useEffect(() => {
    if (!isDealer) return;
    if (dealerStillHasHiddenCard) {
      // Still the player's turn: just the up-card and the still face-down hole card, both
      // already dealt — nothing to gate yet.
      setDealerMountedCount(cards.length);
    } else {
      // The dealer's turn just resolved — cap back down to the up-card + hole card (already on
      // the table) so the hole card can flip in place; anything the dealer hit only mounts
      // afterward, one at a time, via handleFlipComplete below.
      // Floored at min(2, cards.length), not just capped: a player's natural blackjack resolves
      // the whole hand in the very same update that first deals it, so this branch can fire
      // with prev still at its pre-deal 0 (dealerStillHasHiddenCard was never true for even one
      // render — the "still the player's turn" branch above never ran). A bare Math.min(prev, ...)
      // left prev stuck at 0 forever in that case: zero dealer cards ever mounted, so none of
      // them could reveal, so onDealerHandSettled below never fired and the round never resolved.
      setDealerMountedCount((prev) => Math.max(Math.min(prev, 2, cards.length), Math.min(2, cards.length)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsKey, dealerStillHasHiddenCard, isDealer]);

  // The score badge (both dealer and player) shouldn't count a card the instant it's dealt —
  // it should count it once that card has actually finished landing/flipping on screen, or the
  // number visibly changes before the card that caused it even appears. revealedCount tracks
  // how many cards, in order starting from the first, have confirmed their own flip is done —
  // same reset-on-new-hand rule as dealerMountedCount, but this applies to a player hand too
  // (which has no separate mounting gate, since the player's own hits already arrive one at a
  // time from the server — only the *count toward the total* needs delaying here).
  const [revealedCount, setRevealedCount] = useState(0);
  useEffect(() => {
    if (cards.length < revealedCount) setRevealedCount(0);
  }, [cards.length, revealedCount]);

  // Fires once a mounted card's own flip has actually finished. Bumps revealedCount (drives the
  // displayed total, both variants) and, for the dealer specifically, also cues the next card
  // to mount if the dealer drew more than what's on the table yet (see dealerMountedCount above).
  const handleCardFlipComplete = (cardIndex: number) => {
    setRevealedCount((prev) => (cardIndex === prev ? prev + 1 : prev));
    if (isDealer) {
      setDealerMountedCount((prev) => (cardIndex === prev - 1 && prev < cards.length ? prev + 1 : prev));
    }
  };

  // No hand dealt yet (still the betting screen) — render `placeholderCount` face-down filler
  // cards instead, at the same `${variant}-${cardIndex}` keys the real cards will use once
  // dealt (see renderCardRow below). Never mixed with a real hand: a hand always deals all its
  // starting cards in the same store update, so `cards` goes straight from empty to its full
  // starting length, not through some in-between partial state.
  const isPlaceholderPhase = cards.length === 0 && !!placeholderCount;
  const placeholderCards: Card[] = isPlaceholderPhase
    ? Array.from({ length: placeholderCount as number }, () => ({ suit: "spades", value: "A" }) as Card)
    : [];

  const visibleCards = isPlaceholderPhase
    ? placeholderCards
    : isDealer ? cards.slice(0, dealerMountedCount) : cards;
  const revealedCards = cards.slice(0, revealedCount).filter((_, i) => !faceDownIndices.includes(i));
  // forceHidden zeroes both totals out (rather than filtering revealedCards on it too) so they
  // simply vanish the instant the round-end flip starts, in step with the cards themselves
  // turning face down, instead of a stale "21" hanging over a hand that's showing its backs.
  const dealerVisibleTotal = forceHidden ? 0 : computeHandTotal(revealedCards);
  const playerVisibleTotal = isDealer ? undefined : forceHidden ? 0 : computeHandTotal(revealedCards);

  // Lets a caller that lays its own total out elsewhere (see hideTotal) still track this same
  // reveal-gated number instead of the raw (too-early) one.
  useEffect(() => {
    onTotalChange?.(isDealer ? dealerVisibleTotal : playerVisibleTotal ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDealer, dealerVisibleTotal, playerVisibleTotal]);

  // Tell the caller once the dealer's whole hand is genuinely done animating — every card
  // mounted, revealed, and none still face down — instead of leaving them to guess a fixed
  // delay that doesn't scale with how many cards the dealer actually drew.
  const settledRef = useRef(false);
  useEffect(() => {
    if (!isDealer || !onDealerHandSettled) return;
    if (cards.length === 0) {
      settledRef.current = false;
      return;
    }
    const fullyRevealed = faceDownIndices.length === 0 && revealedCount >= cards.length;
    if (fullyRevealed && !settledRef.current) {
      settledRef.current = true;
      onDealerHandSettled();
    }
  }, [isDealer, onDealerHandSettled, cards.length, faceDownIndices.length, revealedCount]);

  // PlayingCard sizes width/height via an inline style keyed off `size`, which always wins
  // over any width/height className passed alongside it — so the card shrinks as the hand
  // grows only if we pick a smaller `size`, not by tweaking classNames here. A caller can pin
  // this to a fixed size instead (cardSizeOverride) when it has its own layout reasons to,
  // rather than Classic's own "shrink once the hand gets long" rule.
  const cardSize: CardSize = cardSizeOverride ?? (cards.length >= 6 ? "xs" : "sm");
  const cardWidth = CARD_WIDTH[cardSize];
  const step = computeCardStep(cardWidth);

  // Same choreography as the Play with Friends table (friends-table-view.tsx): a card falls
  // in (this wrapper's job), then flips itself face-up a beat later (card.tsx's own job, via
  // revealDelay) — never both animated by the same element at once, which is what the old
  // rotateY-on-this-wrapper version did, fighting card.tsx's own two-sided flip underneath it.
  // The starting two cards fall together, staggered slightly like a real deal; anything drawn
  // after that (a hit) arrives alone and falls immediately — it has no sibling to stagger against.
  const renderCardRow = (rowCards: Card[]) => (
    // layout on this row, not on each card individually: a new card widens the row, which
    // recenters under its "flex justify-center" parent — without something picking that up,
    // every card already on the table jumped straight to its new spot instead of sliding
    // there. Putting `layout` on each card separately made them drift there independently
    // (each one measuring and animating its own delta on its own clock) instead of reading as
    // one hand shifting together — this way the whole row is a single rigid block that moves
    // as one unit, while each card's own fall-in (initial/animate below) still plays for itself.
    //
    // Switched off during isPlaceholderPhase specifically: that's also the render where a
    // settled hand's extra cards (beyond the first two) drop out of rowCards as round end
    // clears back to placeholders (see table-test.tsx/forceHidden). With layout still on, that
    // width change recentered the row exactly like a hit does — sliding the two persisting,
    // already-face-down cards sideways into their new centered spot. Nothing about them is
    // supposed to move at that point (they're just sitting there with their backs turned), so
    // that slide read as the cards jumping to a shifted position out of nowhere. cards.length
    // never changes on its own within a single placeholder phase (it's a fixed placeholderCount
    // until the next real deal), so there's never a legitimate recenter to animate here anyway.
    <motion.div layout={isPlaceholderPhase ? false : "position"} transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }} className="flex items-center">
      <AnimatePresence>
        {rowCards.map((card, cardIndex) => {
          // A placeholder pair already sat in this exact spot before the deal — these two
          // don't fall, they're already resting there, so there's nothing to stagger a fall
          // for either. Only a hit (cardIndex >= 2) ever falls in from off-position.
          const isInitialDealSlot = cardIndex < 2;
          const skipFall = skipInitialFall && isInitialDealSlot;
          const fallDelay = isInitialDealSlot && !skipFall ? cardIndex * 0.15 : 0;
          // The dealer's hole card (always index 1) sitting at the table's other end doesn't
          // need to wait on anything for the fall (it already fell in with the up-card at the
          // start of the hand) — but its *reveal* is the moment the round actually resolves,
          // right as the player's own last action (a hit that busts them, a stand) is still
          // settling on screen. Without an extra beat here, both flips read as one simultaneous
          // event instead of "my move, then the dealer's" — so this holds it back a bit longer
          // than the normal fallDelay + 0.4 formula gives every other card.
          const isDealerHoleCardSlot = isDealer && cardIndex === 1;
          // skipFall collapses fallDelay to 0 for both initial-slot cards (see above), which
          // used to leave them with the exact same revealDelay — the dealer's up-card and both
          // of the player's cards all mid-flip at once. A card is edge-on (effectively
          // invisible) at the midpoint of its own rotateY flip (see card.tsx), so three cards
          // hitting that point in the same instant reads as the whole table's brightness
          // dipping and recovering together, not three cards individually turning over. This
          // small per-card/per-hand offset keeps the "cards turn" effect but spreads out when
          // each one is actually edge-on, so the dip is never simultaneous across the table.
          const skipFallStagger = skipFall ? cardIndex * 0.08 + (isDealer ? 0 : 0.04) : 0;
          const revealDelay = isDealerHoleCardSlot ? 0.9 : fallDelay + (skipFall ? 0.1 + skipFallStagger : 0.4);
          // Round end's mirror of revealDelay — same small per-card ripple (see the "brightness
          // dipping" comment above) so the whole hand doesn't turn over in one simultaneous
          // snap, just staggered the other way: this hand's own first card leads, not the
          // dealer's hole card holding back like it does for the reveal (there's no "my move,
          // then the dealer's" story to tell in reverse — the whole table turns over together).
          const hideDelay = cardIndex * 0.06;
          return (
            <motion.div
              key={`${variant}-${cardIndex}`}
              style={{ marginLeft: cardIndex > 0 ? step - cardWidth : 0, position: "relative", zIndex: cardIndex }}
              initial={{ y: skipFall ? 0 : isDealer ? -70 : 70, opacity: skipFall ? 1 : 0 }}
              animate={{ y: 0, opacity: 1 }}
              // Deliberately no exit animation: a card beyond the first two only ever leaves
              // `rowCards` once the round-end flip has already turned it face down (see
              // forceHidden/table-test.tsx), so by removal time it's just a plain, undifferentiated
              // card back sitting off to the side of the fan. A ~150ms opacity fade tried here
              // once — since it's stationary and overlapping its neighbors, it read as a whole
              // second, dimmer hand hanging behind the real one instead of a card quietly leaving,
              // exactly the "offset duplicate cards underneath" glitch this replaces. Popping out
              // instantly is the actually-invisible option, since it happens in the same instant
              // the two persisting cards' own data silently swaps from real to placeholder.
              transition={{ duration: skipFall ? 0 : 0.4, delay: fallDelay, ease: "easeOut" }}
            >
              <PlayingCard
                suit={card.suit}
                value={card.value}
                isHidden={isPlaceholderPhase || faceDownIndices.includes(cardIndex) || forceHidden}
                size={cardSize}
                radius={radius}
                cardBackUrl={cardBackUrl}
                revealDelay={revealDelay}
                hideDelay={hideDelay}
                onFlipComplete={() => handleCardFlipComplete(cardIndex)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <motion.div 
      className={cn("flex flex-col items-center gap-4 px-6", className)}
      initial={skipInitialFall ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Cards Container */}
      <div className="relative flex flex-col items-center">
        {/* Total positionné pour le joueur (au-dessus et au milieu des cartes) — playerVisibleTotal,
            not the raw `total` prop: only counts cards whose own reveal animation has actually
            finished, so the number changes in step with a hit landing instead of jumping to the
            new total before the card that caused it has even appeared on screen. */}
        {showPositionedTotal && variant === "player" && !!playerVisibleTotal && playerVisibleTotal > 0 && (
          <div className="absolute inset-x-0 -top-10 flex justify-center pointer-events-none z-30">
            <motion.div
              className="flex items-center justify-center"
              style={{ minWidth: 52 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <RollingTotal value={playerVisibleTotal} className="font-semibold text-xl text-white tabular-nums" />
            </motion.div>
          </div>
        )}

        {/* Total positionné pour le dealer (en bas et au milieu des cartes) — dealerVisibleTotal,
            not the raw `total` prop: it only counts cards that are actually mounted AND
            face-up right now, so it climbs in step with the reveal instead of jumping straight
            to the final number while the dealer's cards are still animating in one by one. */}
        {showPositionedTotal && variant === "dealer" && dealerVisibleTotal > 0 && (
          <div className="absolute inset-x-0 -bottom-10 flex justify-center pointer-events-none z-30">
            <motion.div
              className="flex items-center justify-center"
              style={{ minWidth: 52 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <RollingTotal value={dealerVisibleTotal} className="font-semibold text-xl text-white tabular-nums" />
            </motion.div>
          </div>
        )}
        
        
        
        {renderCardRow(visibleCards)}
      </div>
      
      {/* Total Badge */}
      {highlightTotal && total !== undefined && (
        <motion.div
          className="rounded-2xl px-4 py-2"
          style={{ backgroundColor: '#232227' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <span className="font-semibold text-lg" style={{ color: '#FFFFFF' }}>
            {total}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}