import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      setDealerMountedCount((prev) => Math.min(prev, 2, cards.length));
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

  const visibleCards = isDealer ? cards.slice(0, dealerMountedCount) : cards;
  const revealedCards = cards.slice(0, revealedCount).filter((_, i) => !faceDownIndices.includes(i));
  const dealerVisibleTotal = computeHandTotal(revealedCards);
  const playerVisibleTotal = isDealer ? undefined : computeHandTotal(revealedCards);

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
  // grows only if we pick a smaller `size`, not by tweaking classNames here.
  const cardSize: CardSize = cards.length >= 6 ? "xs" : "sm";
  const cardWidth = CARD_WIDTH[cardSize];
  const step = computeCardStep(cardWidth);

  // Same choreography as the Play with Friends table (friends-table-view.tsx): a card falls
  // in (this wrapper's job), then flips itself face-up a beat later (card.tsx's own job, via
  // revealDelay) — never both animated by the same element at once, which is what the old
  // rotateY-on-this-wrapper version did, fighting card.tsx's own two-sided flip underneath it.
  // The starting two cards fall together, staggered slightly like a real deal; anything drawn
  // after that (a hit) arrives alone and falls immediately — it has no sibling to stagger against.
  const renderCardRow = (rowCards: Card[]) => (
    <div className="flex items-center">
      <AnimatePresence>
        {rowCards.map((card, cardIndex) => {
          const fallDelay = cardIndex < 2 ? cardIndex * 0.15 : 0;
          // The dealer's hole card (always index 1) sitting at the table's other end doesn't
          // need to wait on anything for the fall (it already fell in with the up-card at the
          // start of the hand) — but its *reveal* is the moment the round actually resolves,
          // right as the player's own last action (a hit that busts them, a stand) is still
          // settling on screen. Without an extra beat here, both flips read as one simultaneous
          // event instead of "my move, then the dealer's" — so this holds it back a bit longer
          // than the normal fallDelay + 0.4 formula gives every other card.
          const isDealerHoleCardSlot = isDealer && cardIndex === 1;
          const revealDelay = isDealerHoleCardSlot ? 0.9 : fallDelay + 0.4;
          return (
            <motion.div
              key={`${variant}-${cardIndex}`}
              style={{ marginLeft: cardIndex > 0 ? step - cardWidth : 0, position: "relative", zIndex: cardIndex }}
              initial={{ y: isDealer ? -70 : 70, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: fallDelay, ease: "easeOut" }}
            >
              <PlayingCard
                suit={card.suit}
                value={card.value}
                isHidden={faceDownIndices.includes(cardIndex)}
                size={cardSize}
                cardBackUrl={cardBackUrl}
                revealDelay={revealDelay}
                onFlipComplete={() => handleCardFlipComplete(cardIndex)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div 
      className={cn("flex flex-col items-center gap-4 px-6", className)}
      initial={{ opacity: 0, y: 20 }}
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
          <div className="absolute inset-x-0 -top-16 flex justify-center pointer-events-none z-30">
            <motion.div
              className="bg-[#232227] rounded-2xl px-4 py-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              layout="position"
            >
              <span className="font-semibold text-lg text-white">
                {playerVisibleTotal}
              </span>
            </motion.div>
          </div>
        )}

        {/* Total positionné pour le dealer (en bas et au milieu des cartes) — dealerVisibleTotal,
            not the raw `total` prop: it only counts cards that are actually mounted AND
            face-up right now, so it climbs in step with the reveal instead of jumping straight
            to the final number while the dealer's cards are still animating in one by one. */}
        {showPositionedTotal && variant === "dealer" && dealerVisibleTotal > 0 && (
          <div className="absolute inset-x-0 -bottom-16 flex justify-center pointer-events-none z-30">
            <motion.div
              className="bg-[#232227] rounded-2xl px-4 py-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              layout="position"
            >
              <span className="font-semibold text-lg text-white">
                {dealerVisibleTotal}
              </span>
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